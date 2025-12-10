
import { getSupabase } from './supabaseClient';
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { LegalRegion, LegalArticle, StabilityScore } from '../types';
import * as dbService from './dbService';
import { getVerificationPrompt } from './legalPrompts';

// --- Configuration ---
const SIMILARITY_THRESHOLD = 0.78; 
const HIGH_STABILITY_TTL_DAYS = 180; 
const LOW_STABILITY_TTL_DAYS = 30; 

async function getGenAI(): Promise<GoogleGenAI> {
    let apiKey = process.env.API_KEY || '';
    if (!apiKey) {
        const storedKey = await dbService.getSetting<string>('geminiApiKey');
        apiKey = storedKey?.replace(/["']/g, '').trim() || '';
    }
    return new GoogleGenAI({ apiKey });
}

// 1. Generate Embeddings
async function generateEmbedding(text: string): Promise<number[] | null> {
    try {
        const ai = await getGenAI();
        const model = "text-embedding-004";
        const result = await ai.models.embedContent({
            model,
            contents: { parts: [{ text }] }
        });
        return result.embeddings?.[0]?.values || null;
    } catch (error) {
        console.error("Embedding generation failed:", error);
        return null;
    }
}

// 2. Verification Agent (Does the law still exist?)
async function verifyArticleStatus(article: LegalArticle): Promise<LegalArticle> {
    console.log(`Verifying article: ${article.id.slice(0, 8)}...`);
    try {
        const ai = await getGenAI();
        const model = "gemini-2.5-flash";
        
        const response = await ai.models.generateContent({
            model,
            contents: getVerificationPrompt(article.content, article.region),
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json"
            }
        });

        const verificationResult = JSON.parse(response.text || '{}');
        const supabase = getSupabase();

        if (verificationResult.status === 'MODIFIED' && verificationResult.new_text) {
            console.log("Article OUTDATED. Updating...");
            const newEmbedding = await generateEmbedding(verificationResult.new_text);
            
            const updatedArticle = {
                ...article,
                content: verificationResult.new_text,
                last_verified_at: new Date().toISOString(),
            };

            if (supabase && newEmbedding) {
                await supabase.from('legal_articles').update({
                    content: updatedArticle.content,
                    last_verified_at: updatedArticle.last_verified_at,
                    embedding: newEmbedding
                }).eq('id', article.id);
            }
            
            return updatedArticle;

        } else {
            console.log("Article VALID. Extending TTL...");
            if (supabase) {
                await supabase.from('legal_articles').update({
                    last_verified_at: new Date().toISOString()
                }).eq('id', article.id);
            }
            return { ...article, last_verified_at: new Date().toISOString() };
        }

    } catch (error) {
        console.error("Verification failed:", error);
        return article; 
    }
}

// 3. Retrieval (RAG)
export async function getLegalContext(query: string, region: LegalRegion): Promise<string> {
    const supabase = getSupabase();
    if (!supabase) return ""; 

    const embedding = await generateEmbedding(query);
    if (!embedding) return "";

    const { data: articles, error } = await supabase.rpc('match_legal_articles', {
        query_embedding: embedding,
        match_threshold: SIMILARITY_THRESHOLD,
        match_count: 3,
        filter_region: region
    });

    if (error) {
        console.error("Supabase vector search error:", error);
        return "";
    }

    if (!articles || articles.length === 0) {
        return ""; 
    }

    const verifiedArticles: string[] = [];
    const now = new Date();

    for (const art of articles) {
        const lastCheck = new Date(art.last_verified_at);
        const diffDays = (now.getTime() - lastCheck.getTime()) / (1000 * 3600 * 24);
        const ttlLimit = art.stability_score === 'high' ? HIGH_STABILITY_TTL_DAYS : LOW_STABILITY_TTL_DAYS;

        if (diffDays > ttlLimit) {
            const freshArticle = await verifyArticleStatus(art as LegalArticle);
            verifiedArticles.push(freshArticle.content);
        } else {
            verifiedArticles.push(art.content);
        }
    }

    if (verifiedArticles.length > 0) {
        return `
**معلومات قانونية موثقة من المستودع (RAG):**
${verifiedArticles.map((txt, i) => `(${i+1}) ${txt}`).join('\n\n')}
--------------------------------------------------
`;
    }

    return "";
}

// 4. Harvesting Agent (Extract & Store)
// This is the CRITICAL part for the Hybrid System.
// It takes the AI's full response, extracts ONLY the pure legal text, and saves it.
export async function harvestLegalKnowledge(fullResponse: string, region: LegalRegion) {
    const supabase = getSupabase();
    if (!supabase) return;

    // Check if the response actually contains laws (basic heuristic)
    if (!fullResponse.includes("المادة") && !fullResponse.includes("رقم")) return;

    try {
        const ai = await getGenAI();
        // Use a cheaper model for extraction
        const model = "gemini-2.5-flash"; 

        const extractionPrompt = `
        لديك إجابة قانونية. مهمتك هي استخراج "النصوص القانونية" الواردة فيها فقط لتخزينها في قاعدة البيانات.
        
        القواعد:
        1. استخرج فقط نصوص المواد القانونية أو القرارات الصريحة.
        2. تجاهل الشرح والتحليل والرأي.
        3. إذا كان هناك رابط مصدر (URL)، قم بإرفاقه.
        4. حدد درجة الاستقرار (High: قوانين أساسية كالدستور والمدني، Low: تعاميم وقرارات متغيرة).
        
        الإجابة:
        "${fullResponse.substring(0, 10000)}"

        JSON format:
        {
            "articles": [
                { "text": "نص المادة كاملاً...", "source": "url or name", "stability": "high|medium|low" }
            ]
        }
        `;

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                articles: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            source: { type: Type.STRING },
                            stability: { type: Type.STRING, enum: ["high", "medium", "low"] }
                        },
                        required: ["text", "stability"]
                    }
                }
            }
        };

        const result = await ai.models.generateContent({
            model,
            contents: extractionPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        const data = JSON.parse(result.text || '{ "articles": [] }');

        for (const item of data.articles) {
            if (item.text && item.text.length > 50) { // Filter out short snippets
                // Check if already exists (fuzzy check via embedding is expensive, so we just insert.
                // The vector search will handle duplicates by returning the closest match anyway, 
                // or we can implement a specific check later. For now, we trust the clean extraction).
                
                const embedding = await generateEmbedding(item.text);
                if (embedding) {
                    await supabase.from('legal_articles').insert({
                        content: item.text,
                        source_url: item.source || 'AI Chat Context',
                        region: region,
                        stability_score: item.stability,
                        last_verified_at: new Date().toISOString(),
                        embedding: embedding
                    });
                    console.log("Harvested new legal article:", item.text.substring(0, 30));
                }
            }
        }

    } catch (e) {
        console.error("Harvesting failed:", e);
    }
}

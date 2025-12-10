
import { getSupabase } from './supabaseClient';
import { GoogleGenAI } from "@google/genai";
import { LegalRegion, LegalArticle, StabilityScore } from '../types';
import * as dbService from './dbService';
import { getVerificationPrompt } from './legalPrompts';

// --- Configuration ---
const SIMILARITY_THRESHOLD = 0.78; // Minimum similarity to consider a match
const HIGH_STABILITY_TTL_DAYS = 180; // 6 months
const LOW_STABILITY_TTL_DAYS = 30; // 1 month

// Initialize Gemini for Embeddings & Verification
async function getGenAI(): Promise<GoogleGenAI> {
    let apiKey = process.env.API_KEY || '';
    if (!apiKey) {
        const storedKey = await dbService.getSetting<string>('geminiApiKey');
        apiKey = storedKey?.replace(/["']/g, '').trim() || '';
    }
    return new GoogleGenAI({ apiKey });
}

// 1. Generate Embeddings (Using text-embedding-004)
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

// 2. The Verification Loop (Agent)
async function verifyArticleStatus(article: LegalArticle): Promise<LegalArticle> {
    console.log(`Verifying article: ${article.id.slice(0, 8)}...`);
    try {
        const ai = await getGenAI();
        const model = "gemini-2.5-flash";
        
        // Use Google Search Tool for live verification
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
            // Generate new embedding for the updated text
            const newEmbedding = await generateEmbedding(verificationResult.new_text);
            
            const updatedArticle = {
                ...article,
                content: verificationResult.new_text,
                last_verified_at: new Date().toISOString(),
                // Keep ID to update the same record
            };

            // Update in Supabase
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
            // Just update timestamp
            if (supabase) {
                await supabase.from('legal_articles').update({
                    last_verified_at: new Date().toISOString()
                }).eq('id', article.id);
            }
            return { ...article, last_verified_at: new Date().toISOString() };
        }

    } catch (error) {
        console.error("Verification failed:", error);
        return article; // Return original if check fails (fail safe)
    }
}

// 3. Smart Retrieval Logic (Hybrid)
export async function getLegalContext(query: string, region: LegalRegion): Promise<string> {
    const supabase = getSupabase();
    
    // Fallback if Supabase is not configured
    if (!supabase) {
        console.warn("Supabase not configured. Using standard web search only.");
        return ""; 
    }

    const embedding = await generateEmbedding(query);
    if (!embedding) return "";

    // A. Vector Search
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
        console.log("No hits in DB. Agent will search web and populate DB later.");
        return ""; // Return empty so the main Chat Logic uses Google Search + Store
    }

    // B. Check TTL & Verify
    const verifiedArticles: string[] = [];
    const now = new Date();

    for (const art of articles) {
        const lastCheck = new Date(art.last_verified_at);
        const diffDays = (now.getTime() - lastCheck.getTime()) / (1000 * 3600 * 24);
        
        const ttlLimit = art.stability_score === 'high' ? HIGH_STABILITY_TTL_DAYS : LOW_STABILITY_TTL_DAYS;

        if (diffDays > ttlLimit) {
            // Stale -> Verify
            const freshArticle = await verifyArticleStatus(art as LegalArticle);
            verifiedArticles.push(freshArticle.content);
        } else {
            // Valid -> Use directly
            verifiedArticles.push(art.content);
        }
    }

    // Return formatted context
    if (verifiedArticles.length > 0) {
        return `
**معلومات قانونية موثقة من المستودع (RAG):**
${verifiedArticles.map((txt, i) => `(${i+1}) ${txt}`).join('\n\n')}
--------------------------------------------------
`;
    }

    return "";
}

// 4. Knowledge Capture (Storing new findings)
// This should be called by the Chat Logic when it finds new laws from Google Search
export async function storeLegalKnowledge(text: string, source: string, region: LegalRegion) {
    const supabase = getSupabase();
    if (!supabase) return;

    // Basic heuristic for stability (can be improved with AI classification)
    const isHighStability = text.includes("القانون المدني") || text.includes("قانون العقوبات");
    const stability: StabilityScore = isHighStability ? 'high' : 'low';

    // Chunking could happen here, but for simplicity we assume the agent passes a cohesive article
    const embedding = await generateEmbedding(text);
    if (!embedding) return;

    const { error } = await supabase.from('legal_articles').insert({
        content: text,
        source_url: source,
        region: region,
        stability_score: stability,
        last_verified_at: new Date().toISOString(),
        embedding: embedding
    });

    if (error) console.error("Failed to store knowledge:", error);
    else console.log("New legal knowledge stored successfully.");
}


import { GoogleGenAI, Content, Schema, Type } from "@google/genai";
import { ChatMessage, GroundingMetadata, ActionMode, LegalRegion, InheritanceInput, CaseType, TimelineEvent } from '../types';
import * as dbService from '../services/dbService';
import { getInstruction, getInheritanceExtractionPrompt, getTimelinePrompt } from '../services/legalPrompts';

// Constants for Token Management
const MAX_HISTORY_MESSAGES = 25;
const MAX_OUTPUT_TOKENS_FLASH = 8192;
const THINKING_BUDGET_PRO = 2048; // Keeping budget for Flash

// Helper: Exponential Backoff Retry (Robustness)
async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            // Retry on network errors (fetch failures) or 503/429
            const isRetryable = !error.status || error.status === 503 || error.status === 429;
            if (!isRetryable) throw error;
            
            const delay = Math.pow(2, i) * 1000 + Math.random() * 500; // Exponential backoff + jitter
            console.warn(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

async function getGoogleGenAI(): Promise<GoogleGenAI> {
    let apiKey = '';

    if (process.env.API_KEY) {
        apiKey = process.env.API_KEY;
    }

    if (!apiKey) {
        try {
            const storedApiKey = await dbService.getSetting<string>('geminiApiKey');
            if (storedApiKey) {
                apiKey = storedApiKey;
            }
        } catch (e) {
            console.warn("Failed to read API key from DB", e);
        }
    }

    apiKey = apiKey.replace(/["']/g, '').trim();

    if (!apiKey || apiKey.length < 10) {
        console.warn("Gemini Service: Valid API key not found.");
    }

    return new GoogleGenAI({ apiKey });
}

// OPTIMIZED: History management to save tokens on images
function chatHistoryToGeminiContents(history: ChatMessage[]): Content[] {
    let lastUserMessageIndex = -1;
    // Find the very last user message to attach current images to
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === 'user') {
            lastUserMessageIndex = i;
            break;
        }
    }

    return history.map((msg, index) => {
        const parts = [];
        if (msg.content) {
            parts.push({ text: msg.content });
        }
        
        // Handling Images:
        // Only attach full base64 data if it's the LAST user message.
        // For older messages, we strip the heavy base64 to save tokens and avoid limits,
        // replacing it with a text placeholder so the model knows an image was there.
        if (msg.images && msg.images.length > 0) {
            if (index === lastUserMessageIndex) {
                msg.images.forEach(image => {
                    // Safe guard for empty data
                    if (image.dataUrl && image.dataUrl.includes(',')) {
                        const base64Data = image.dataUrl.split(',')[1];
                        parts.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: image.mimeType
                            }
                        });
                    }
                });
            } else {
                // Placeholder for older images
                parts.push({ text: `[تم تحليل ${msg.images.length} صورة/صور في هذه الرسالة سابقاً. ارجع للتحليل السابق.]` });
            }
        }
        return { role: msg.role, parts: parts };
    });
}

export async function countTokensForGemini(history: ChatMessage[]): Promise<number> {
    if (!history || history.length === 0) {
        return 0;
    }
    try {
        const ai = await getGoogleGenAI();
        const model = 'gemini-2.5-flash';
        const historyToCount = history.slice(-MAX_HISTORY_MESSAGES);
        const contents = chatHistoryToGeminiContents(historyToCount);
        const response = await ai.models.countTokens({
            model: model,
            contents: contents,
        });
        return response.totalTokens;
    } catch (error) {
        return 0;
    }
}

export async function proofreadTextWithGemini(textToProofread: string): Promise<string> {
    if (!textToProofread.trim()) return textToProofread;
    return retryOperation(async () => {
        const ai = await getGoogleGenAI();
        const model = 'gemini-2.5-flash';
        const prompt = `أنت مدقق لغوي عربي خبير ومتخصص في تنقيح النصوص المستخرجة عبر تقنية OCR. مهمتك هي مراجعة النص التالي وتصحيح أي أخطاء إملائية أو نحوية مع الحفاظ الدقيق على المعنى الأصلي وهيكل التنسيق. انتبه بشكل خاص للحفاظ على فواصل الأسطر والفقرات كما هي في النص الأصلي. لا تضف أي معلومات أو تفسيرات جديدة. أعد النص المصحح باللغة العربية فقط.\n\النص الأصلي:\n---\n${textToProofread}\n---`;
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        
        // Increment Request Count (1 request)
        dbService.incrementTokenUsage(1);

        return response.text || textToProofread;
    });
}

export async function summarizeChatHistory(history: ChatMessage[]): Promise<string> {
    if (!history || history.length === 0) return "لا يوجد محتوى لتلخيصه.";
    return retryOperation(async () => {
        const ai = await getGoogleGenAI();
        const model = 'gemini-2.5-flash'; 
        const contents = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));
        contents.push({
            role: 'user',
            parts: [{ text: 'بناءً على المحادثة السابقة بأكملها، قم بتقديم ملخص شامل وواضح. يجب أن يركز الملخص على النقاط القانونية الرئيسية، الوقائع الأساسية، الاستراتيجيات المقترحة، والاستنتاجات التي تم التوصل إليها حتى الآن. قدم الملخص في نقاط منظمة. يجب أن يكون ردك باللغة العربية فقط.' }]
        });
        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
        });

        // Increment Request Count (1 request)
        dbService.incrementTokenUsage(1);

        return response.text || "فشل في إنشاء الملخص.";
    });
}

export async function generateTimelineFromChat(history: ChatMessage[]): Promise<TimelineEvent[]> {
    if (!history || history.length === 0) return [];
    return retryOperation(async () => {
        const ai = await getGoogleGenAI();
        const model = 'gemini-2.5-flash'; 
        
        const fullText = history.map(m => `${m.role === 'user' ? 'الموكل' : 'المستشار'}: ${m.content}`).join('\n\n');
        const prompt = getTimelinePrompt(fullText);

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        // Increment Request Count (1 request)
        dbService.incrementTokenUsage(1);

        const text = response.text;
        if(!text) return [];
        
        try {
            return JSON.parse(text);
        } catch(e) {
            console.error("Timeline parsing error", e);
            return [];
        }
    });
}

export async function* streamChatResponseFromGemini(
  history: ChatMessage[],
  thinkingMode: boolean,
  actionMode: ActionMode,
  region: LegalRegion,
  caseType: CaseType,
  signal: AbortSignal
): AsyncGenerator<{ text: string; model: string; groundingMetadata?: GroundingMetadata }> {
  try {
    const ai = await getGoogleGenAI();
    const model = 'gemini-2.5-flash';
    
    // Retrieve centralized instruction
    const systemInstruction = getInstruction(actionMode, region, caseType);
    
    // Slice history to keep it manageable
    const historyToSend = history.slice(-MAX_HISTORY_MESSAGES);
    const contents = chatHistoryToGeminiContents(historyToSend);
    const tools = [{ googleSearch: {} }];
    const config: any = {
        systemInstruction: systemInstruction,
        tools: tools,
        maxOutputTokens: MAX_OUTPUT_TOKENS_FLASH,
    };
    
    // Configure Thinking Budget for complex tasks
    const isForensic = actionMode === 'forensic' || actionMode === 'pixel_analysis' || actionMode === 'image_comparison';
    if (thinkingMode || isForensic) {
        config.thinkingConfig = { thinkingBudget: THINKING_BUDGET_PRO };
        config.maxOutputTokens = MAX_OUTPUT_TOKENS_FLASH; 
    }
    
    let responseStream;
    let lastError;
    
    // Retry Logic for Connection Setup (Handled manually to allow streaming yielding)
    for (let i = 0; i < 3; i++) {
        try {
            responseStream = await ai.models.generateContentStream({
                model: model,
                contents: contents,
                config: config
            });
            break; // Success
        } catch (error: any) {
            lastError = error;
            const isRetryable = !error.status || error.status === 503 || error.status === 429;
            if (!isRetryable || signal.aborted) throw error;
            const delay = Math.pow(2, i) * 1000;
            console.warn(`Connection attempt ${i + 1} failed. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    if (!responseStream) throw lastError;
    
    let requestCounted = false;

    for await (const chunk of responseStream) {
        if (signal.aborted) break;
        const text = chunk.text;
        let groundingMetadata: GroundingMetadata | undefined;
        if (chunk.candidates && chunk.candidates[0]?.groundingMetadata) {
            groundingMetadata = chunk.candidates[0].groundingMetadata as unknown as GroundingMetadata;
        }
        
        if (!requestCounted) {
            // Count 1 request as soon as we start getting chunks
            dbService.incrementTokenUsage(1);
            requestCounted = true;
        }

        if (text || groundingMetadata) {
            yield { text, model, groundingMetadata };
        }
    }

  } catch (error) {
    if (signal.aborted) return;
    console.error("Error in Gemini chat stream:", error);
    throw error;
  }
}

export async function analyzeImageWithGemini(
  base64ImageDataUrl: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  if (!base64ImageDataUrl || !mimeType) throw new Error("Image data and mime type are required.");
  return retryOperation(async () => {
    const ai = await getGoogleGenAI();
    const model = 'gemini-2.5-flash';
    const base64Data = base64ImageDataUrl.split(',')[1];
    const imagePart = {
      inlineData: { data: base64Data, mimeType: mimeType }
    };
    const textPart = { text: prompt };
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] },
        config: {
             systemInstruction: "أنت محلل صور جنائي ومستندي خبير. دورك هو استخراج المعلومات والأدلة بدقة متناهية ووصف المشهد قانونياً.",
             maxOutputTokens: MAX_OUTPUT_TOKENS_FLASH,
        }
    });

    // Increment Request Count (1 request)
    dbService.incrementTokenUsage(1);

    return response.text || "لم يتم إنشاء أي نص.";
  });
}

// STRICT JSON SCHEMA FOR INHERITANCE
export async function extractInheritanceFromCase(caseText: string): Promise<Partial<InheritanceInput>> {
    return retryOperation(async () => {
        const ai = await getGoogleGenAI();
        const model = 'gemini-2.5-flash';

        // Use centralized inheritance prompt
        const prompt = getInheritanceExtractionPrompt(caseText);
        
        // Define Strict Schema for Reliable Extraction
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                religion: { type: Type.STRING, enum: ["muslim", "christian"] },
                estateValue: { type: Type.NUMBER },
                currency: { type: Type.STRING },
                husband: { type: Type.INTEGER },
                wife: { type: Type.INTEGER },
                son: { type: Type.INTEGER },
                daughter: { type: Type.INTEGER },
                father: { type: Type.INTEGER },
                mother: { type: Type.INTEGER },
                brotherFull: { type: Type.INTEGER },
                sisterFull: { type: Type.INTEGER },
                husbandName: { type: Type.STRING },
                wifeName: { type: Type.STRING },
                sonNames: { type: Type.STRING },
                daughterNames: { type: Type.STRING },
                fatherName: { type: Type.STRING },
                motherName: { type: Type.STRING },
                context: {
                    type: Type.OBJECT,
                    properties: {
                        notes: { type: Type.STRING },
                        disputes: { type: Type.STRING },
                        conclusion: { type: Type.STRING },
                    },
                    required: ["notes", "disputes", "conclusion"]
                }
            },
            required: ["religion", "estateValue", "wife", "son", "daughter", "context"],
        };

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        // Increment Request Count (1 request)
        dbService.incrementTokenUsage(1);

        const jsonText = response.text;
        if (!jsonText) throw new Error("No JSON returned");
        
        return JSON.parse(jsonText);
    });
}

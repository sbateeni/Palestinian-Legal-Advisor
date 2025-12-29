import { GoogleGenAI, Content, Schema, Type } from "@google/genai";
import { ChatMessage, GroundingMetadata, ActionMode, LegalRegion, InheritanceInput, CaseType, TimelineEvent } from '../types';
import * as dbService from '../services/dbService';
import { getInstruction, getInheritanceExtractionPrompt, getTimelinePrompt } from '../services/legalPrompts';

// Constants for Token Management
const MAX_HISTORY_MESSAGES = 25;
const MAX_OUTPUT_TOKENS = 8192;
const THINKING_BUDGET_PRO = 2048; 

// Helper: Exponential Backoff Retry (Robustness)
async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const isRetryable = !error.status || error.status === 503 || error.status === 429;
            if (!isRetryable) throw error;
            
            const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
            console.warn(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

// FIX: Exclusively obtain API key from process.env.API_KEY as per the initialization rules.
async function getGoogleGenAI(): Promise<GoogleGenAI> {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

// FIX: Changed default model to gemini-2.5-flash as the primary free-tier choice.
async function getSelectedGeminiModelId(): Promise<string> {
    const storedModel = await dbService.getSetting<string>('geminiModelId');
    return storedModel || 'gemini-2.5-flash';
}

// OPTIMIZED: History management to save tokens on images
function chatHistoryToGeminiContents(history: ChatMessage[]): Content[] {
    let lastUserMessageIndex = -1;
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
        
        if (msg.images && msg.images.length > 0) {
            if (index === lastUserMessageIndex) {
                msg.images.forEach(image => {
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
                parts.push({ text: `[تم تحليل ${msg.images.length} صورة/صور في هذه الرسالة سابقاً.]` });
            }
        }
        return { role: msg.role, parts: parts };
    });
}

export async function countTokensForGemini(history: ChatMessage[]): Promise<number> {
    if (!history || history.length === 0) return 0;
    try {
        const ai = await getGoogleGenAI();
        const model = await getSelectedGeminiModelId();
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
        const model = await getSelectedGeminiModelId();
        const prompt = `أنت مدقق لغوي عربي خبير. قم بمراجعة النص التالي وتصحيحه لغوياً فقط مع الحفاظ على التنسيق:\n---\n${textToProofread}\n---`;
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        dbService.incrementTokenUsage(1);
        return response.text || textToProofread;
    });
}

export async function summarizeChatHistory(history: ChatMessage[]): Promise<string> {
    if (!history || history.length === 0) return "لا يوجد محتوى لتلخيصه.";
    return retryOperation(async () => {
        const ai = await getGoogleGenAI();
        const model = await getSelectedGeminiModelId();
        const contents = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));
        contents.push({
            role: 'user',
            parts: [{ text: 'لخص المحادثة القانونية السابقة في نقاط منظمة.' }]
        });
        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
        });
        dbService.incrementTokenUsage(1);
        return response.text || "فشل في إنشاء الملخص.";
    });
}

export async function generateTimelineFromChat(history: ChatMessage[]): Promise<TimelineEvent[]> {
    if (!history || history.length === 0) return [];
    return retryOperation(async () => {
        const ai = await getGoogleGenAI();
        const model = await getSelectedGeminiModelId();
        const fullText = history.map(m => `${m.role === 'user' ? 'الموكل' : 'المستشار'}: ${m.content}`).join('\n\n');
        const prompt = getTimelinePrompt(fullText);
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        dbService.incrementTokenUsage(1);
        try {
            return JSON.parse(response.text || '[]');
        } catch(e) {
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
    const modelId = await getSelectedGeminiModelId();
    
    const systemInstruction = getInstruction(actionMode, region, caseType);
    const historyToSend = history.slice(-MAX_HISTORY_MESSAGES);
    const contents = chatHistoryToGeminiContents(historyToSend);
    const tools = [{ googleSearch: {} }];
    
    // FIX: Guideline states that if maxOutputTokens is set, thinkingBudget must also be set to avoid blocked responses.
    const config: any = {
        systemInstruction: systemInstruction,
        tools: tools,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        thinkingConfig: { thinkingBudget: 0 } 
    };
    
    const isForensic = actionMode === 'forensic' || actionMode === 'pixel_analysis' || actionMode === 'image_comparison';
    if (thinkingMode || isForensic || modelId.includes('pro')) {
        config.thinkingConfig = { thinkingBudget: THINKING_BUDGET_PRO };
    }
    
    let responseStream = await ai.models.generateContentStream({
        model: modelId,
        contents: contents,
        config: config
    });
    
    let requestCounted = false;
    for await (const chunk of responseStream) {
        if (signal.aborted) break;
        const text = chunk.text;
        let groundingMetadata: GroundingMetadata | undefined;
        if (chunk.candidates && chunk.candidates[0]?.groundingMetadata) {
            groundingMetadata = chunk.candidates[0].groundingMetadata as unknown as GroundingMetadata;
        }
        if (!requestCounted) {
            dbService.incrementTokenUsage(1);
            requestCounted = true;
        }
        if (text || groundingMetadata) {
            yield { text, model: modelId, groundingMetadata };
        }
    }
  } catch (error) {
    if (signal.aborted) return;
    throw error;
  }
}

export async function analyzeImageWithGemini(
  base64ImageDataUrl: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  return retryOperation(async () => {
    const ai = await getGoogleGenAI();
    const model = await getSelectedGeminiModelId();
    const base64Data = base64ImageDataUrl.split(',')[1];
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ inlineData: { data: base64Data, mimeType: mimeType } }, { text: prompt }] },
    });
    dbService.incrementTokenUsage(1);
    return response.text || "";
  });
}

export async function extractInheritanceFromCase(caseText: string): Promise<Partial<InheritanceInput>> {
    return retryOperation(async () => {
        const ai = await getGoogleGenAI();
        const model = await getSelectedGeminiModelId();
        const prompt = getInheritanceExtractionPrompt(caseText);
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
                context: {
                    type: Type.OBJECT,
                    properties: { notes: { type: Type.STRING }, disputes: { type: Type.STRING }, conclusion: { type: Type.STRING } },
                    required: ["notes", "disputes", "conclusion"]
                }
            },
            required: ["religion", "estateValue", "wife", "son", "daughter", "context"],
        };
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        dbService.incrementTokenUsage(1);
        return JSON.parse(response.text || "{}");
    });
}
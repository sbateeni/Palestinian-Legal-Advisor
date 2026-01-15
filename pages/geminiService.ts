
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ChatMessage, GroundingMetadata, ActionMode, LegalRegion, InheritanceInput, CaseType, TimelineEvent } from '../types';
import * as dbService from '../services/dbService';
import { getInstruction, getInheritanceExtractionPrompt, getTimelinePrompt } from '../services/legalPrompts';
import { AGENT_MODEL_ROUTING } from '../constants';

const MAX_HISTORY_MESSAGES = 40;
const THINKING_BUDGET_PRO = 4000; 
const PLACEHOLDER_KEY = 'MISSING_KEY_PLACEHOLDER';

/**
 * Initializes the Gemini API client.
 * Strictly uses process.env.API_KEY as per GenAI Coding Guidelines.
 */
function getAI() {
    // Robust check: Ensure we don't crash if the key is missing during dev/init
    const apiKey = process.env.API_KEY || PLACEHOLDER_KEY;
    return new GoogleGenAI({ apiKey: apiKey });
}

function hasValidKey(): boolean {
    const key = process.env.API_KEY;
    return !!key && key !== 'undefined' && key !== PLACEHOLDER_KEY;
}

/**
 * SELECTS MODEL BASED ON SETTINGS OR SMART ROUTING
 */
async function getModelForMode(mode: ActionMode): Promise<string> {
    const userPreference = await dbService.getSetting<string>('geminiModelId');
    if (!userPreference || userPreference === 'auto') {
        return AGENT_MODEL_ROUTING[mode] || 'gemini-3-flash-preview';
    }
    return userPreference;
}

function chatHistoryToGeminiContents(history: ChatMessage[]) {
    if (!Array.isArray(history)) return [];
    return history.map((msg) => {
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.images && msg.images.length > 0) {
            msg.images.forEach(image => {
                if (image.dataUrl && image.dataUrl.includes(',')) {
                    parts.push({
                        inlineData: { data: image.dataUrl.split(',')[1], mimeType: image.mimeType }
                    });
                }
            });
        }
        return { role: msg.role === 'model' ? 'model' : 'user', parts: parts };
    });
}

export async function countTokensForGemini(history: ChatMessage[]): Promise<number> {
    if (!hasValidKey()) return 0;
    try {
        if (!Array.isArray(history)) return 0;
        const ai = getAI();
        const contents = chatHistoryToGeminiContents(history);
        const response = await ai.models.countTokens({
            model: 'gemini-3-flash-preview',
            contents: contents
        });
        return response.totalTokens || 0;
    } catch (e) {
        // Silent fail for token counting to avoid disrupting UI flow
        return 0;
    }
}

export async function summarizeChatHistory(history: ChatMessage[]): Promise<string> {
    if (!hasValidKey() || !Array.isArray(history)) return "";
    try {
        const ai = getAI();
        const contents = chatHistoryToGeminiContents(history);
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
                ...contents,
                { role: 'user', parts: [{ text: 'لخص المحادثة السابقة بشكل مهني وقانوني مكثف باللغة العربية.' }] }
            ],
        });
        return response.text || "";
    } catch (e) {
        console.error("Summarize error:", e);
        return "";
    }
}

export async function proofreadTextWithGemini(text: string): Promise<string> {
    if (!hasValidKey()) return text;
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `أنت مدقق لغوي خبير. قم بتصحيح الأخطاء الإملائية والنحوية في النص التالي المستخرج من OCR مع الحفاظ على المصطلحات القانونية:\n\n${text}`,
        });
        return response.text || "";
    } catch (e) {
        return text;
    }
}

export async function extractInheritanceFromCase(caseText: string): Promise<Partial<InheritanceInput>> {
    if (!hasValidKey()) throw new Error("API Key is missing or invalid.");
    const ai = getAI();
    const prompt = getInheritanceExtractionPrompt(caseText);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    religion: { type: Type.STRING },
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
                }
            }
        }
    });
    try {
        return JSON.parse(response.text || "{}");
    } catch {
        return {};
    }
}

export async function generateTimelineFromChat(history: ChatMessage[]): Promise<TimelineEvent[]> {
    if (!hasValidKey() || !Array.isArray(history)) return [];
    try {
        const ai = getAI();
        const context = history.map(m => `${m.role}: ${m.content}`).join('\n');
        const prompt = getTimelinePrompt(context);
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING },
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            type: { type: Type.STRING }
                        },
                        required: ['date', 'title', 'description', 'type']
                    }
                }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Timeline error:", e);
        return [];
    }
}

export async function* streamChatResponseFromGemini(
  history: ChatMessage[],
  thinkingMode: boolean,
  actionMode: ActionMode,
  region: LegalRegion,
  caseType: CaseType,
  signal: AbortSignal
): AsyncGenerator<{ text: string; model: string; groundingMetadata?: GroundingMetadata }> {
  if (!hasValidKey()) {
      throw new Error("مفتاح API غير متوفر. يرجى إعداده في المتغيرات البيئية أو الإعدادات.");
  }
  
  try {
    const ai = getAI();
    const modelId = await getModelForMode(actionMode);
    const systemInstruction = getInstruction(actionMode, region, caseType);
    const historyToSend = Array.isArray(history) ? history.slice(-MAX_HISTORY_MESSAGES) : [];
    const contents = chatHistoryToGeminiContents(historyToSend);
    
    const config: any = {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
    };
    
    if (thinkingMode || modelId.includes('pro')) {
        config.thinkingConfig = { thinkingBudget: THINKING_BUDGET_PRO };
    } else {
        config.thinkingConfig = { thinkingBudget: 0 };
    }
    
    let responseStream = await ai.models.generateContentStream({
        model: modelId,
        contents: contents,
        config: config
    });
    
    let requestCounted = false;
    for await (const chunk of responseStream) {
        if (signal.aborted) break;
        if (!requestCounted) {
            dbService.incrementTokenUsage(1);
            requestCounted = true;
        }
        yield { 
            text: chunk.text || "", 
            model: modelId, 
            groundingMetadata: chunk.candidates?.[0]?.groundingMetadata as any 
        };
    }
  } catch (error) {
    if (signal.aborted) return;
    throw error;
  }
}

export async function analyzeImageWithGemini(dataUrl: string, mimeType: string, prompt: string): Promise<string> {
    if (!hasValidKey()) throw new Error("API Key is invalid");
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [
            {
                inlineData: {
                    data: dataUrl.split(',')[1],
                    mimeType
                }
            },
            {
                text: prompt
            }
        ]
    });
    dbService.incrementTokenUsage(1);
    return response.text || "";
}

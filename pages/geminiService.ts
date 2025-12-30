import { GoogleGenAI, Content, Schema, Type, GenerateContentResponse } from "@google/genai";
import { ChatMessage, GroundingMetadata, ActionMode, LegalRegion, InheritanceInput, CaseType, TimelineEvent } from '../types';
import * as dbService from '../services/dbService';
import { getInstruction, getInheritanceExtractionPrompt, getTimelinePrompt } from '../services/legalPrompts';
import { AGENT_MODEL_ROUTING } from '../constants';

const MAX_HISTORY_MESSAGES = 40; // Increased to maintain better continuity
const THINKING_BUDGET_PRO = 4000; 

async function getGoogleGenAI(): Promise<GoogleGenAI> {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

/**
 * SELECTS MODEL BASED ON SETTINGS OR SMART ROUTING
 */
async function getModelForMode(mode: ActionMode): Promise<string> {
    // 1. Check user preference in DB
    const userPreference = await dbService.getSetting<string>('geminiModelId');
    
    // 2. If user selected 'auto' or hasn't selected anything, use Smart Routing
    if (!userPreference || userPreference === 'auto') {
        return AGENT_MODEL_ROUTING[mode] || 'gemini-2.5-flash';
    }

    // 3. Otherwise, return the specific model the user forced in settings
    return userPreference;
}

function chatHistoryToGeminiContents(history: ChatMessage[]): Content[] {
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

// FIX: Added missing exported function to count tokens using Gemini models.
export async function countTokensForGemini(history: ChatMessage[]): Promise<number> {
    try {
        const ai = await getGoogleGenAI();
        const contents = chatHistoryToGeminiContents(history);
        const response = await ai.models.countTokens({
            model: 'gemini-3-flash-preview',
            contents: contents
        });
        return response.totalTokens || 0;
    } catch (e) {
        console.error("Token counting error:", e);
        return 0;
    }
}

// FIX: Added missing exported function to summarize chat history.
export async function summarizeChatHistory(history: ChatMessage[]): Promise<string> {
    const ai = await getGoogleGenAI();
    const contents = chatHistoryToGeminiContents(history);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            ...contents,
            { role: 'user', parts: [{ text: 'لخص المحادثة السابقة بشكل مهني وقانوني مكثف باللغة العربية.' }] }
        ],
    });
    return response.text || "";
}

// FIX: Added missing exported function to proofread text using Gemini.
export async function proofreadTextWithGemini(text: string): Promise<string> {
    const ai = await getGoogleGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `أنت مدقق لغوي خبير. قم بتصحيح الأخطاء الإملائية والنحوية في النص التالي المستخرج من OCR مع الحفاظ على المصطلحات القانونية:\n\n${text}`,
    });
    return response.text || "";
}

// FIX: Added missing exported function to extract inheritance data from text using structured JSON output.
export async function extractInheritanceFromCase(caseText: string): Promise<Partial<InheritanceInput>> {
    const ai = await getGoogleGenAI();
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

// FIX: Added missing exported function to generate a timeline of events from chat history.
export async function generateTimelineFromChat(history: ChatMessage[]): Promise<TimelineEvent[]> {
    const ai = await getGoogleGenAI();
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
    try {
        return JSON.parse(response.text || "[]");
    } catch {
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
  try {
    const ai = await getGoogleGenAI();
    
    // DYNAMIC ROUTING: Select best model for the current task
    const modelId = await getModelForMode(actionMode);
    
    const systemInstruction = getInstruction(actionMode, region, caseType);
    
    // CONTINUITY: We send more history to ensure the AI "remembers" the case facts
    const historyToSend = history.slice(-MAX_HISTORY_MESSAGES);
    const contents = chatHistoryToGeminiContents(historyToSend);
    
    const config: any = {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 } 
    };
    
    // Auto-enable thinking for complex Pro tasks
    if (thinkingMode || modelId.includes('pro')) {
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
    const ai = await getGoogleGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite', // Use Lite for simple OCR to save RPD
        contents: { parts: [{ inlineData: { data: dataUrl.split(',')[1], mimeType } }, { text: prompt }] },
    });
    dbService.incrementTokenUsage(1);
    return response.text || "";
}

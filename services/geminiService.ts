
import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import { ChatMessage } from '../types';

const getAiClient = (): GoogleGenAI | null => {
  try {
    const ai = new GoogleGenAI({ apiKey: 'default' });
    return ai;
  } catch (error) {
    console.error("Failed to initialize Google AI client:", error);
    return null;
  }
};

const SYSTEM_INSTRUCTION = `أنت مساعد ذكاء اصطناعي خبير ومتخصص في القانون الفلسطيني.
معرفتك تشمل جميع القوانين واللوائح والسوابق القضائية المعمول بها في فلسطين.
عند تحليل القضايا، يجب أن تستند إجاباتك بشكل صارم وحصري على القانون الفلسطيني.
لا تقدم آراء شخصية أو معلومات قانونية من ولايات قضائية أخرى.
كن دقيقًا ومفصلاً وموضوعيًا في تحليلاتك.`;

export const startChat = (history: ChatMessage[]): Chat | null => {
    const ai = getAiClient();
    if (!ai) return null;

    // FIX: The type for formattedHistory should be Content[], not Part[].
    // This fixes the type error on this line and the subsequent usage.
    const formattedHistory: Content[] = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        },
        history: formattedHistory
    });
};

export const streamChatResponse = async (chat: Chat, message: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
    const result = await chat.sendMessageStream({ message });
    return result;
};

import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from '../types';

const SYSTEM_INSTRUCTION_LEGAL = `أنت مساعد ذكاء اصطناعي خبير ومتخصص في القانون الفلسطيني.
معرفتك تشمل جميع القوانين واللوائح والسوابق القضائية المعمول بها في فلسطين.
عند تحليل القضايا، يجب أن تستند إجاباتك بشكل صارم وحصري على القانون الفلسطيني والوقائع المقدمة لك فقط.
لا تقدم آراء شخصية أو معلومات قانونية من ولايات قضائية أخرى.
لا تفترض أي معلومات غير مذكورة في تفاصيل القضية. لا تقترح سيناريوهات افتراضية. إذا كانت معلومة ما ضرورية للتحليل ولكنها غير متوفرة، اذكر أنها غير موجودة بدلاً من افتراضها.
كن دقيقًا ومفصلاً وموضوعيًا في تحليلاتك.`;

function getGoogleGenAI() {
    // This function ensures a new instance is created for each request,
    // which is important for environments where the API key can change (like using aistudio).
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export async function* streamChatResponseFromGemini(
  history: ChatMessage[],
  thinkingMode: boolean
): AsyncGenerator<{ text: string }> {
  try {
    const ai = getGoogleGenAI();
    const model = thinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const contents = history.map(msg => {
        const parts = [];
        if (msg.content) {
            parts.push({ text: msg.content });
        }
        if (msg.imageUrl && msg.imageMimeType) {
            const base64Data = msg.imageUrl.split(',')[1];
            parts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: msg.imageMimeType
                }
            });
        }
        return { role: msg.role, parts: parts };
    });

    const responseStream = await ai.models.generateContentStream({
        model: model,
        contents: contents,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION_LEGAL,
        }
    });

    for await (const chunk of responseStream) {
        // According to guidelines, use chunk.text directly.
        const text = chunk.text;
        if (text) {
            yield { text };
        }
    }
  } catch (error) {
    console.error("Error in Gemini chat stream:", error);
    // Re-throw the error to be handled by the calling component
    throw error;
  }
}

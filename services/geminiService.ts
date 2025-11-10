import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatMessage } from '../types';

const SYSTEM_INSTRUCTION_LEGAL = `أنت مساعد ذكاء اصطناعي خبير ومتخصص في القانون الفلسطيني.
معرفتك تشمل جميع القوانين واللوائح والسوابق القضائية المعمول بها في فلسطين.
عند تحليل القضايا، يجب أن تستند إجاباتك بشكل صارم وحصري على القانون الفلسطيني والوقائع المقدمة لك فقط.
لا تقدم آراء شخصية أو معلومات قانونية من ولايات قضائية أخرى.
لا تفترض أي معلومات غير مذكورة في تفاصيل القضية. لا تقترح سيناريوهات افتراضية. إذا كانت معلومة ما ضرورية للتحليل ولكنها غير متوفرة، اذكر أنها غير موجودة بدلاً من افتراضها.
كن دقيقًا ومفصلاً وموضوعيًا في تحليلاتك.`;

function getGoogleGenerativeAI() {
    // This function ensures a new instance is created for each request,
    // which is important for environments where the API key can change (like using aistudio).
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
}

export async function* streamChatResponseFromGemini(
  history: ChatMessage[],
  thinkingMode: boolean
): AsyncGenerator<{ text: string }> {
  try {
    const ai = getGoogleGenerativeAI();
    const model = thinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const contents = history.map(msg => {
        const parts: Array<{text: string} | {inlineData: {data: string, mimeType: string}}> = [];
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

    const generativeModel = ai.getGenerativeModel({ model: model, systemInstruction: SYSTEM_INSTRUCTION_LEGAL });
    const chat = generativeModel.startChat({
        history: contents.slice(0, -1).map(msg => ({
            role: msg.role,
            parts: msg.parts
        }))
    });
    const result = await chat.sendMessageStream(contents[contents.length - 1].parts);

    for await (const chunk of result.stream) {
        // According to guidelines, use chunk.text() function.
        try {
            const text = chunk.text();
            if (text) {
                yield { text };
            }
        } catch (e) {
            // Handle cases where text() might throw due to blocked content
            console.warn('Could not extract text from chunk:', e);
        }
    }
  } catch (error) {
    console.error("Error in Gemini chat stream:", error);
    // Re-throw the error to be handled by the calling component
    throw error;
  }
}

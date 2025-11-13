import { GoogleGenAI, Content } from "@google/genai";
import { ChatMessage } from '../types';
import * as dbService from '../services/dbService';

const SYSTEM_INSTRUCTION_LEGAL = `أنت مساعد ذكاء اصطناعي خبير ومتخصص في القانون الفلسطيني.
معرفتك تشمل جميع القوانين واللوائح والسوابق القضائية المعمول بها في فلسطين.
عند تحليل القضايا، يجب أن تستند إجاباتك بشكل صارم وحصري على القانون الفلسطيني والوقائع المقدمة لك فقط.
لا تقدم آراء شخصية أو معلومات قانونية من ولايات قضائية أخرى.
لا تفترض أي معلومات غير مذورة في تفاصيل القضية. لا تقترح سيناريوهات افتراضية. إذا كانت معلومة ما ضرورية للتحليل ولكنها غير متوفرة، اذكر أنها غير موجودة بدلاً من افتراضها.
كن دقيقًا ومفصلاً وموضوعيًا في تحليلاتك.`;

async function getGoogleGenAI(): Promise<GoogleGenAI> {
    // This function ensures a new instance is created for each request.
    // It prioritizes a user-provided key from settings, falling back to the aistudio key.
    const storedApiKey = await dbService.getSetting<string>('geminiApiKey');
    const apiKey = storedApiKey || process.env.API_KEY || '';
    return new GoogleGenAI({ apiKey });
}

// Helper to convert chat history for the API
function chatHistoryToGeminiContents(history: ChatMessage[]): Content[] {
    return history.map(msg => {
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
}

export async function countTokensForGemini(history: ChatMessage[]): Promise<number> {
    if (!history || history.length === 0) {
        return 0;
    }
    try {
        const ai = await getGoogleGenAI();
        const model = 'gemini-2.5-flash'; // Flash is sufficient and faster for token counting
        
        const contents = chatHistoryToGeminiContents(history);

        const response = await ai.models.countTokens({
            model: model,
            contents: contents,
        });

        return response.totalTokens;
    } catch (error) {
        console.error("Error counting tokens:", error);
        // Don't throw, just return 0 so the app doesn't crash.
        return 0;
    }
}

export async function proofreadTextWithGemini(textToProofread: string): Promise<string> {
    if (!textToProofread.trim()) {
        return textToProofread;
    }

    try {
        const ai = await getGoogleGenAI();
        const model = 'gemini-2.5-flash';
        
        const prompt = `أنت مدقق لغوي عربي خبير. قم بمراجعة النص التالي، المستخرج من صورة باستخدام تقنية OCR، وصحح أي أخطاء إملائية أو نحوية تجدها. حافظ على المعنى الأصلي والتنسيق الأساسي للنص قدر الإمكان. لا تضف أي معلومات أو تفسيرات جديدة. أعد النص المصحح فقط.\n\nالنص الأصلي:\n---\n${textToProofread}\n---`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        const correctedText = response.text;
        console.log("Original vs Corrected:", { original: textToProofread, corrected: correctedText });
        return correctedText;
    } catch (error) {
        console.error("Error proofreading text with Gemini:", error);
        // Fallback to original text if correction fails
        return textToProofread;
    }
}

export async function* streamChatResponseFromGemini(
  history: ChatMessage[],
  thinkingMode: boolean
): AsyncGenerator<{ text: string }> {
  try {
    const ai = await getGoogleGenAI();
    const model = thinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const contents = chatHistoryToGeminiContents(history);

    const response = await ai.models.generateContentStream({
        model: model,
        contents: contents,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION_LEGAL
        }
    });

    for await (const chunk of response) {
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

export async function analyzeImageWithGemini(
  base64ImageDataUrl: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  if (!base64ImageDataUrl || !mimeType) {
    throw new Error("Image data and mime type are required.");
  }
  try {
    const ai = await getGoogleGenAI();
    const model = 'gemini-2.5-flash';
    
    const base64Data = base64ImageDataUrl.split(',')[1];
    if (!base64Data) {
      throw new Error("Invalid base64 image data URL.");
    }

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    // Re-throw to be handled by the calling component
    throw error;
  }
}
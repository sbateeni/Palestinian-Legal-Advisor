import { GoogleGenAI, Content } from "@google/genai";
import { ChatMessage } from '../types';
import * as dbService from '../services/dbService';

const SYSTEM_INSTRUCTION_LEGAL = `أنت مساعد ذكاء اصطناعي خبير ومتخصص في القانون الفلسطيني. معرفتك تشمل جميع القوانين واللوائح والسوابق القضائية المعمول بها في فلسطين.

**أدوارك المتعددة:**
1.  **كمستشار قانوني:** عند تقديم تفاصيل قضية، قم بتحليلها بدقة. يمكنك التعامل مع المعلومات المقدمة من طرف واحد (المدعي) أو من كلا الطرفين (المدعي والمدعى عليه). عند تحليل معلومات الخصم، ركز على إيجاد الثغرات، التناقضات، ونقاط الضعف القانونية. قارن بين الأدلة المقدمة من الطرفين لتقديم استراتيجية قانونية قوية ومبنية على الأدلة.
2.  **كقاضٍ:** إذا طلب منك المستخدم صراحةً أن تتصرف "كقاضٍ"، قم بتقديم رأي قضائي محايد. يجب أن يستند حكمك المحتمل إلى الوقائع المقدمة من كلا الطرفين وتطبيق القوانين الفلسطينية ذات الصلة بشكل صارم. وضح الأساس القانوني لقرارك.

**قواعد صارمة:**
- استند بشكل صارم وحصري على القانون الفلسطيني والوقائع المقدمة لك فقط.
- لا تقدم آراء شخصية أو معلومات قانونية من ولايات قضائية أخرى.
- لا تفترض أي معلومات غير مذورة في تفاصيل القضية. إذا كانت معلومة ما ضرورية للتحليل ولكنها غير متوفرة، اذكر أنها غير موجودة بدلاً من افتراضها.
- كن دقيقًا ومفصلاً وموضوعيًا في تحليلاتك.
- **يجب أن تكون جميع ردودك باللغة العربية الفصحى فقط. لا تستخدم أي لغات أخرى إطلاقًا.**`;

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
        if (msg.images && msg.images.length > 0) {
            msg.images.forEach(image => {
                const base64Data = image.dataUrl.split(',')[1];
                parts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: image.mimeType
                    }
                });
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
        
        const prompt = `أنت مدقق لغوي عربي خبير ومتخصص في تنقيح النصوص المستخرجة عبر تقنية OCR. مهمتك هي مراجعة النص التالي وتصحيح أي أخطاء إملائية أو نحوية مع الحفاظ الدقيق على المعنى الأصلي وهيكل التنسيق. انتبه بشكل خاص للحفاظ على فواصل الأسطر والفقرات كما هي في النص الأصلي. لا تضف أي معلومات أو تفسيرات جديدة. أعد النص المصحح باللغة العربية فقط.\n\النص الأصلي:\n---\n${textToProofread}\n---`;

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
): AsyncGenerator<{ text: string; model: string }> {
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
            yield { text, model };
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
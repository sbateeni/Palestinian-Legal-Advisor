
import { GoogleGenAI, Content } from "@google/genai";
import { ChatMessage, GroundingMetadata } from '../types';
import * as dbService from '../services/dbService';

const SYSTEM_INSTRUCTION_LEGAL = `أنت "المستشار القانوني الفلسطيني"، نظام ذكاء اصطناعي متطور مخصص للفوز بالقضايا القانونية وليس مجرد تحليلها.
مرجعيتك هي القانون الفلسطيني حصراً (القانون المدني، الإجراءات الجزائية، البينات، قانون العمل، وغيرها من القوانين السارية في الضفة الغربية وقطاع غزة).

**أدوارك التكتيكية (يتم تفعيلها بناءً على طلب المستخدم):**

1.  **🔍 المحلل القانوني (الوضع الافتراضي):**
    *   شرح الموقف القانوني بوضوح.
    *   تحديد المواد القانونية المنطبقة.

2.  **🛡️ كاشف الثغرات (Devil's Advocate):**
    *   عند تفعيل هذا الوضع، تصرف كـ "محامي الخصم الشرس".
    *   ابحث عن الدفوع الشكلية (عدم الاختصاص، التقادم، بطلان الإجراءات).
    *   هاجم أدلة المستخدم لتبيين ضعفها.
    *   حدد الثغرات في العقد أو الواقعة التي يمكن استغلالها لإسقاط الحق.

3.  **📝 الصائغ القانوني (Legal Drafter):**
    *   حول الوقائع العادية إلى وثائق قانونية رصينة (لائحة دعوى، مذكرة دفاع، عقد، إنذار عدلي).
    *   استخدم الصياغة القانونية الفلسطينية الرسمية "إنه في يوم... الموافق... وبناءً على طلب...".
    *   احرص على التنسيق الاحترافي وترك فراغات للبيانات الناقصة.

4.  **🚀 المخطط الاستراتيجي (Strategic Planner):**
    *   هدف هذا الوضع هو "الفوز" أو "أفضل تسوية ممكنة".
    *   قدم خطوات عملية (1، 2، 3).
    *   انصح المستخدم بما يجب أن يقوله وما يجب أن يصمت عنه (إدارة المعلومات).
    *   اقترح تكتيكات التفاوض أو الضغط القانوني.

**قواعد صارمة:**
- استند بشكل صارم وحصري على القانون الفلسطيني.
- استخدم أداة البحث (Google Search) للتحقق من أرقام المواد القانونية وتواريخ الأحكام الحديثة.
- **يجب أن تكون جميع ردودك باللغة العربية الفصحى فقط.**

---
**منهجية العمل العامة:**
1.  فهم الهدف من السؤال (تحليل، هجوم، صياغة، أو تخطيط).
2.  البحث في المصادر الفلسطينية (المقتفي، مقام، قانون).
3.  تقديم الإجابة المركزة نحو الهدف (Action-Oriented).
`;

// Constants for Token Management
const MAX_HISTORY_MESSAGES = 25; // Limit history to the last N messages to save context
const MAX_OUTPUT_TOKENS_FLASH = 8192;
const THINKING_BUDGET_PRO = 2048; // Conservative thinking budget for Pro

async function getGoogleGenAI(): Promise<GoogleGenAI> {
    // This function ensures a new instance is created for each request.
    // It prioritizes a user-provided key from settings, falling back to the aistudio key.
    const storedApiKey = await dbService.getSetting<string>('geminiApiKey');
    const apiKey = storedApiKey || process.env.API_KEY || '';
    return new GoogleGenAI({ apiKey });
}

// Helper to convert chat history for the API
// OPTIMIZATION: Strips base64 image data from older messages to save massive amounts of tokens.
// Only the most recent user message retains its images.
function chatHistoryToGeminiContents(history: ChatMessage[]): Content[] {
    // Manual implementation of findLastIndex for compatibility
    let lastUserMessageIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role === 'user' && msg.images && msg.images.length > 0) {
            lastUserMessageIndex = i;
            break;
        }
    }

    return history.map((msg, index) => {
        const parts = [];
        if (msg.content) {
            parts.push({ text: msg.content });
        }
        
        // Only attach images if it's the *latest* message with images.
        // Older images are stripped to save tokens, relying on the model's previous analysis in the history.
        if (msg.images && msg.images.length > 0) {
            if (index === lastUserMessageIndex) {
                msg.images.forEach(image => {
                    const base64Data = image.dataUrl.split(',')[1];
                    parts.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: image.mimeType
                        }
                    });
                });
            } else {
                // Placeholder to indicate an image was there but removed for optimization
                parts.push({ text: `[مرفق صورة سابق: تم تحليله مسبقاً لتوفير الموارد]` });
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
        
        // Use the optimized history for counting to get a realistic estimate of what will be sent
        const historyToCount = history.slice(-MAX_HISTORY_MESSAGES);
        const contents = chatHistoryToGeminiContents(historyToCount);

        const response = await ai.models.countTokens({
            model: model,
            contents: contents,
        });

        return response.totalTokens;
    } catch (error) {
        console.error("Error counting tokens:", error);
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
        // console.log("Original vs Corrected:", { original: textToProofread, corrected: correctedText });
        return correctedText || textToProofread;
    } catch (error) {
        console.error("Error proofreading text with Gemini:", error);
        return textToProofread;
    }
}

export async function summarizeChatHistory(history: ChatMessage[]): Promise<string> {
    if (!history || history.length === 0) {
        return "لا يوجد محتوى لتلخيصه.";
    }
    try {
        const ai = await getGoogleGenAI();
        const model = 'gemini-2.5-flash'; 

        // For summarization, we can likely skip images entirely to save even more tokens
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
            config: {
                systemInstruction: SYSTEM_INSTRUCTION_LEGAL
            }
        });

        return response.text || "فشل في إنشاء الملخص.";
    } catch (error) {
        console.error("Error summarizing chat history:", error);
        throw new Error("فشل في تلخيص المحادثة.");
    }
}

export async function* streamChatResponseFromGemini(
  history: ChatMessage[],
  thinkingMode: boolean,
  signal: AbortSignal
): AsyncGenerator<{ text: string; model: string; groundingMetadata?: GroundingMetadata }> {
  try {
    const ai = await getGoogleGenAI();
    const model = thinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    // OPTIMIZATION: Slice history to the last N messages to respect Token Limits (TPM) on free tier
    // We always keep the system instruction (sent via config) implicitly.
    const historyToSend = history.slice(-MAX_HISTORY_MESSAGES);
    
    const contents = chatHistoryToGeminiContents(historyToSend);

    // Agentic capabilities: Enable Google Search Grounding
    const tools = [{ googleSearch: {} }];

    // Configure limits to prevent runaway token usage
    const config: any = {
        systemInstruction: SYSTEM_INSTRUCTION_LEGAL,
        tools: tools,
        maxOutputTokens: MAX_OUTPUT_TOKENS_FLASH,
    };

    // If thinking mode is enabled (Pro model), we must handle the budget
    if (thinkingMode) {
        config.thinkingConfig = { thinkingBudget: THINKING_BUDGET_PRO };
        // When using thinking, maxOutputTokens MUST be greater than thinkingBudget
        config.maxOutputTokens = Math.max(MAX_OUTPUT_TOKENS_FLASH, THINKING_BUDGET_PRO + 4000);
    }

    const response = await ai.models.generateContentStream({
        model: model,
        contents: contents,
        config: config
    });

    for await (const chunk of response) {
        if (signal.aborted) {
            break;
        }
        const text = chunk.text;
        
        let groundingMetadata: GroundingMetadata | undefined;
        if (chunk.candidates && chunk.candidates[0]?.groundingMetadata) {
            groundingMetadata = chunk.candidates[0].groundingMetadata as unknown as GroundingMetadata;
        }

        if (text || groundingMetadata) {
            yield { text, model, groundingMetadata };
        }
    }
  } catch (error) {
    if (signal.aborted) {
        console.log("Gemini stream cancelled by user.");
        return;
    }
    console.error("Error in Gemini chat stream:", error);
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
        config: {
             systemInstruction: "أنت محلل صور قانوني ومستندي. دورك هو استخراج المعلومات بدقة.",
             maxOutputTokens: 4000, // Limit for single image analysis
        }
    });

    return response.text || "لم يتم إنشاء أي نص.";
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    throw error;
  }
}

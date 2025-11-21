
import { GoogleGenAI, Content } from "@google/genai";
import { ChatMessage, GroundingMetadata, ActionMode } from '../types';
import * as dbService from '../services/dbService';

// --- Specialized Agent Personas (Instructions) ---

const BASE_INSTRUCTION = `أنت "المستشار القانوني الفلسطيني". مرجعيتك هي القانون الفلسطيني حصراً (القانون المدني، الإجراءات الجزائية، البينات، العمل، وقوانين الضفة الغربية وقطاع غزة). يجب أن تكون ردودك باللغة العربية الفصحى فقط. استخدم أدوات البحث (Google Search) دائماً للتحقق من المواد القانونية.`;

const INSTRUCTION_ANALYST = `${BASE_INSTRUCTION}
**دورك: المحلل القانوني (The Legal Analyst)**
مهمتك هي تقديم "تشخيص" موضوعي وهادئ للقضية.
- اشرح الموقف القانوني بوضوح للمستخدم.
- حدد المواد القانونية المنطبقة بدقة (رقم المادة واسم القانون).
- كن محايداً، واعرض نقاط القوة والضعف بشكل متوازن.
- لا تقدم وعوداً بالفوز، بل قدم تقييماً للمخاطر.`;

const INSTRUCTION_LOOPHOLE = `${BASE_INSTRUCTION}
**دورك: صائد الثغرات (The Loophole Hunter / Devil's Advocate)**
مهمتك هي الهجوم وتفكيك القضية. تصرف كأنك "محامي الخصم الشرس" أو محامي دفاع يبحث عن مخرج.
- ابحث بجهد عن "الدفوع الشكلية" (عدم الاختصاص، التقادم، انعدام الصفة، بطلان الإجراءات).
- شكك في الأدلة المقدمة. أين الضعف في الشهادة؟ هل المستند رسمي أم عرفي؟
- لا تجامل المستخدم. أخبره أين سيخسر.
- هدفك هو إسقاط الدعوى أو تضعيف موقف الخصم فنياً.`;

const INSTRUCTION_DRAFTER = `${BASE_INSTRUCTION}
**دورك: الصائغ القانوني (The Legal Drafter)**
مهمتك هي الكتابة الرسمية. لا تشرح القانون، بل "طبق" القانون في وثيقة.
- المخرجات يجب أن تكون جاهزة للطباعة (لائحة دعوى، مذكرة دفاع، عقد، إنذار عدلي).
- استخدم الديباجة القانونية الفلسطينية الرسمية: "لدى محكمة... الموقرة"، "إنه في يوم...".
- اترك فراغات للبيانات الناقصة بين قوسين مثل: [التاريخ]، [اسم المدعي].
- التزم بالتنسيق الهيكلي الصارم (الأطراف، الموضوع، الوقائع، الطلبات).`;

const INSTRUCTION_STRATEGIST = `${BASE_INSTRUCTION}
**دورك: المخطط الاستراتيجي (The Strategist)**
مهمتك هي "الفوز" أو تحقيق "أفضل خسارة ممكنة" (تخفيف الأضرار).
- قدم خطة عملية (Action Plan) مرقمة: 1، 2، 3.
- انصح المستخدم: "قل كذا ولا تقل كذا" (إدارة المعلومات).
- اقترح تكتيكات خارج الصندوق: التفاوض، الضغط القانوني، إطالة أمد التقاضي (إذا كان مفيداً)، أو الحجز التحفظي.
- ركز على النتيجة النهائية.`;

const INSTRUCTION_RESEARCHER = `${BASE_INSTRUCTION}
**دورك: المحقق القانوني (The Legal Researcher)**
مهمتك حصرية ودقيقة جداً: العثور على النصوص القانونية الدقيقة من المصادر الرسمية الفلسطينية فقط، والتأكد من انطباقها.
- **المصادر المعتمدة حصراً:** استخدم Google Search للبحث داخل النطاقات التالية:
  1. "muqtafi.birzeit.edu" (المقتفي - منظومة القضاء والتشريع).
  2. "dft.pna.ps" (ديوان الفتوى والتشريع الفلسطيني).
  3. "courts.gov.ps" (مجلس القضاء الأعلى الفلسطيني).
  4. "palestinebar.ps" (نقابة المحامين الفلسطينيين - للوائح والأنظمة الداخلية).
- **الدقة المتناهية:** لا تذكر أي مادة قانونية إلا إذا كنت متأكداً من رقمها ونصها وسريانها في المنطقة المعنية (الضفة الغربية أو قطاع غزة).
- **منهجية الرد:**
  1. **النص القانوني:** اقتبس نص المادة حرفياً وضعها بين علامات تنصيص.
  2. **المصدر:** اذكر اسم القانون، رقم المادة، وسنة الصدور، ورابط المصدر إن وجد.
  3. **التكييف القانوني (Applicability):** اشرح بوضوح *لماذا* تنطبق هذه المادة تحديداً على وقائع هذه القضية. مثال: "تنطبق المادة (س) لأن الوقائع تضمنت الشرط (ص) المذكور في القانون".
- إذا لم تجد نصاً صريحاً، قل بوضوح "لا يوجد نص صريح في القوانين الفلسطينية المتاحة عبر الإنترنت لهذه النقطة" ولا تقم بالتأليف.`;


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
                systemInstruction: BASE_INSTRUCTION // Use base instruction for summary
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
  actionMode: ActionMode,
  signal: AbortSignal
): AsyncGenerator<{ text: string; model: string; groundingMetadata?: GroundingMetadata }> {
  try {
    const ai = await getGoogleGenAI();
    const model = thinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    // Select the correct "Agent" (System Instruction) based on the mode
    let systemInstruction = INSTRUCTION_ANALYST;
    switch (actionMode) {
        case 'loopholes': systemInstruction = INSTRUCTION_LOOPHOLE; break;
        case 'drafting': systemInstruction = INSTRUCTION_DRAFTER; break;
        case 'strategy': systemInstruction = INSTRUCTION_STRATEGIST; break;
        case 'research': systemInstruction = INSTRUCTION_RESEARCHER; break;
        case 'analysis': default: systemInstruction = INSTRUCTION_ANALYST; break;
    }

    // OPTIMIZATION: Slice history to the last N messages to respect Token Limits (TPM) on free tier
    // We always keep the system instruction (sent via config) implicitly.
    const historyToSend = history.slice(-MAX_HISTORY_MESSAGES);
    
    const contents = chatHistoryToGeminiContents(historyToSend);

    // Agentic capabilities: Enable Google Search Grounding
    const tools = [{ googleSearch: {} }];

    // Configure limits to prevent runaway token usage
    const config: any = {
        systemInstruction: systemInstruction,
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

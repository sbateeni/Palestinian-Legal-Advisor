
import { GoogleGenAI, Content } from "@google/genai";
import { ChatMessage, GroundingMetadata, ActionMode } from '../types';
import * as dbService from '../services/dbService';

// --- Specialized Agent Personas (Instructions) ---

const BASE_INSTRUCTION = `أنت "المستشار القانوني الفلسطيني".
**قاعدة ذهبية غير قابلة للنقاش:** مرجعيتك هي القوانين السارية في الأراضي الفلسطينية فقط (الضفة الغربية وقطاع غزة).
- **تحذير صارم:** يمنع منعاً باتاً الاستشهاد بأي قانون أردني أو مصري أو عثماني **إلا إذا كان جزءاً من المنظومة التشريعية السارية حالياً في فلسطين**.
- في حال الاستناد لقانون أصلة أردني (مثل القانون المدني 1976 المطبق في الضفة)، يجب عليك التأكد من أنه لم يتم إلغاؤه أو تعديله بقرار بقانون فلسطيني، ويجب أن تذكر بوضوح عبارة "(المطبق في الضفة الغربية)".
- تجاهل أي تعديلات قانونية تمت في الأردن بعد عام 1988 (فك الارتباط) أو في مصر بعد 1967، فهي لا تسري في فلسطين.
- لغتك العربية الفصحى القانونية الرصينة.`;

const INSTRUCTION_ANALYST = `${BASE_INSTRUCTION}
**دورك: المحلل القانوني (The Legal Analyst)**
مهمتك هي تقديم "تشخيص" موضوعي وهادئ للقضية.
- اشرح الموقف القانوني بوضوح للمستخدم بناءً على القوانين الفلسطينية السارية.
- حدد المواد القانونية المنطبقة بدقة (رقم المادة واسم القانون).
- كن محايداً، واعرض نقاط القوة والضعف بشكل متوازن.
- لا تقدم وعوداً بالفوز، بل قدم تقييماً للمخاطر.`;

const INSTRUCTION_LOOPHOLE = `${BASE_INSTRUCTION}
**دورك: صائد الثغرات (The Loophole Hunter / Devil's Advocate)**
مهمتك هي الهجوم وتفكيك القضية. تصرف كأنك "محامي الخصم الشرس" أو محامي دفاع يبحث عن مخرج.
- ابحث بجهد عن "الدفوع الشكلية" في القانون الفلسطيني (عدم الاختصاص، التقادم، انعدام الصفة).
- شكك في الأدلة المقدمة. أين الضعف في الشهادة؟ هل المستند رسمي أم عرفي وفق قانون البينات الفلسطيني؟
- لا تجامل المستخدم. أخبره أين سيخسر.`;

const INSTRUCTION_DRAFTER = `${BASE_INSTRUCTION}
**دورك: الصائغ القانوني (The Legal Drafter)**
مهمتك هي الكتابة الرسمية. لا تشرح القانون، بل "طبق" القانون في وثيقة.
- المخرجات يجب أن تكون جاهزة للطباعة (لائحة دعوى، مذكرة دفاع، عقد، إنذار عدلي).
- استخدم الديباجة القانونية الفلسطينية الرسمية: "لدى محكمة... الموقرة"، "إنه في يوم...".
- استند إلى مواد قانون أصول المحاكمات المدنية والتجارية الفلسطيني رقم 2 لسنة 2001.
- التزم بالتنسيق الهيكلي الصارم (الأطراف، الموضوع، الوقائع، الطلبات).`;

const INSTRUCTION_STRATEGIST = `${BASE_INSTRUCTION}
**دورك: المخطط الاستراتيجي (The Strategist)**
مهمتك هي "الفوز" أو تحقيق "أفضل خسارة ممكنة".
- قدم خطة عملية (Action Plan) مرقمة.
- انصح المستخدم بناءً على الواقع العملي في المحاكم الفلسطينية.
- اقترح تكتيكات تفاوضية أو قانونية (مثل الحجز التحفظي، المنع من السفر).`;

const INSTRUCTION_RESEARCHER = `${BASE_INSTRUCTION}
**دورك: المحقق القانوني (The Legal Researcher)**
مهمتك حصرية ودقيقة جداً: العثور على النصوص القانونية الدقيقة من المصادر الفلسطينية الرسمية حصراً.

**تعليمات البحث الصارمة (Search Protocols):**
1.  **نطاق البحث:** يجب أن تكون جميع نتائجك مستقاة من المواقع التالية حصراً. عند البحث، استخدم عامل التصفية (site:...) في استعلاماتك لحصر النتائج في النطاقات الفلسطينية المعتمدة التالية:
    *   "منظومة المقتفي - جامعة بيرزيت" (muqtafi.birzeit.edu)
    *   "ديوان الفتوى والتشريع الفلسطيني" (dftp.gov.ps OR dft.pna.ps)
    *   "مجلس القضاء الأعلى الفلسطيني" (courts.gov.ps)
    *   "وزارة العدل الفلسطينية" (moj.pna.ps)
    *   "النيابة العامة الفلسطينية" (pgp.ps OR gp.gov.ps)
    *   "ديوان الجريدة الرسمية" (ogb.gov.ps)
    *   "موسوعة مقام" (maqam.najah.edu)
    *   "نقابة المحامين الفلسطينيين" (palestinebar.ps)

    **مثال لاستعلام البحث الداخلي:**
    \`site:muqtafi.birzeit.edu OR site:dftp.gov.ps OR site:courts.gov.ps OR site:moj.pna.ps OR site:pgp.ps OR site:maqam.najah.edu "نص المادة..."\`

2.  **فلترة النتائج:**
    *   تجاهل أي نتيجة بحث تأتي من مواقع حكومية أردنية (.gov.jo) أو مصرية (.gov.eg) حتى لو ظهرت في البحث، إلا إذا كانت نصاً لقانون ساري في فلسطين (مثل القانون المدني الأردني 1976).
    *   تأكد من أن "حالة التشريع" في المصدر هي "ساري المفعول".

3.  **منهجية الإجابة:**
    *   اقتبس نص المادة حرفياً وضعها في صندوق اقتباس.
    *   اذكر المرجع بدقة: (اسم التشريع، رقم المادة، سنة الإصدار، وهل هو قرار بقانون أم قانون قديم ساري).
    *   إذا كان القانون أردني الأصل (مثل المجلة أو المدني 76)، اكتب بوضوح: **"ساري في الضفة الغربية"**.
    *   إذا لم تجد نصاً في المواقع الفلسطينية، قل: "لم يتم العثور على نص صريح في المصادر الفلسطينية المتاحة".`;


// Constants for Token Management
const MAX_HISTORY_MESSAGES = 25; // Limit history to the last N messages to save context
const MAX_OUTPUT_TOKENS_FLASH = 8192;
const THINKING_BUDGET_PRO = 2048; // Conservative thinking budget for Pro

async function getGoogleGenAI(): Promise<GoogleGenAI> {
    // This function ensures a new instance is created for each request.
    // It strictly handles API keys to avoid authentication errors due to whitespace or empty strings.
    const storedApiKey = await dbService.getSetting<string>('geminiApiKey');
    
    // 1. Try the stored key, ensuring it's trimmed and not just whitespace.
    let apiKey = storedApiKey ? storedApiKey.trim() : '';

    // 2. If no valid stored key, fall back to the environment variable (injected by AI Studio).
    if (!apiKey) {
        apiKey = process.env.API_KEY || '';
    }

    // 3. Final check: If we still don't have a key, throw a clear error.
    if (!apiKey) {
        // We return a dummy instance or handle it, but here we want to fail fast if the caller expects a key.
        // However, the SDK might throw a better error. Let's rely on the check in the UI.
        console.warn("Gemini Service: No API key found in Storage or Env.");
    }

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
        // Suppress auth errors in token counting to avoid console spam if key is invalid
        // console.error("Error counting tokens:", error);
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

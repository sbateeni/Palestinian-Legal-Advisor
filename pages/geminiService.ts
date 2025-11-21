
import { GoogleGenAI, Content } from "@google/genai";
import { ChatMessage, GroundingMetadata, ActionMode, LegalRegion } from '../types';
import * as dbService from '../services/dbService';

// --- Specialized Agent Personas (Instructions) ---

// Dynamic Instruction Builder based on Region
const getBaseInstruction = (region: LegalRegion) => {
    const regionSpecifics = region === 'gaza' 
        ? `
    **الاختصاص المكاني: قطاع غزة**
    1. **القانون المدني:** المرجع الأساسي هو **القانون المدني المصري رقم (131) لسنة 1948** المطبق في القطاع.
    2. **قانون الإيجارات:** قانون إيجار العقارات المصري رقم (20) لسنة 1960.
    3. **أصول المحاكمات:** قانون أصول المحاكمات الحقوقية رقم 2 لسنة 2001 (موحد).
    4. **قوانين الانتداب:** القوانين التي كانت سارية قبل 1948 ولم تلغَ.
    ` 
        : `
    **الاختصاص المكاني: الضفة الغربية**
    1. **القانون المدني:** المرجع الأساسي هو **القانون المدني الأردني رقم (43) لسنة 1976** المطبق في الضفة.
    2. **قانون الإيجارات:** قرار بقانون رقم (14) لسنة 2011 بشأن المالكين والمستأجرين.
    3. **أصول المحاكمات:** قانون أصول المحاكمات المدنية والتجارية رقم 2 لسنة 2001.
    4. **الأوامر العسكرية:** الأوامر التي لم تلغَ بموجب تشريعات السلطة الفلسطينية.
    `;

    return `أنت "المستشار القانوني الفلسطيني".
**المرجعية الإلزامية:** القوانين السارية في الأراضي الفلسطينية، مع الالتزام التام بالاختصاص المكاني المختار (${region === 'gaza' ? 'قطاع غزة' : 'الضفة الغربية'}).

${regionSpecifics}

**عقيدة التدقيق التشريعي (Strict Audit Protocol):**
عليك الالتزام بهذه القواعد الصارمة في كل إجابة مهما كان دورك:
1.  **أولوية القرارات بقانون:** انتبه جيداً إلى أن العديد من القوانين القديمة قد تم تعديلها أو إلغاء أجزاء منها بموجب "قرارات بقانون" صادرة عن الرئيس الفلسطيني.
2.  **حظر القوانين الملغاة:** يمنع منعاً باتاً الاستناد إلى قانون أردني أو أمر عسكري تم إلغاؤه، أو استخدام قانون مصري في قضية تخص الضفة الغربية (والعكس).
3.  **التسمية الدقيقة:** عند ذكر قانون أردني أو مصري ساري، يجب كتابة عبارة "(المطبق في ${region === 'gaza' ? 'قطاع غزة' : 'الضفة الغربية'})".
4.  **النطاق الزمني:** تجاهل أي تعديلات قانونية تمت في الأردن بعد 1988 أو في مصر بعد 1967، إلا ما أقره المشرع الفلسطيني.
5.  لغتك العربية الفصحى القانونية الرصينة.`;
};

const getInstruction = (mode: ActionMode, region: LegalRegion) => {
    const base = getBaseInstruction(region);
    
    switch (mode) {
        case 'loopholes':
            return `${base}
**دورك: صائد الثغرات (The Loophole Hunter / Devil's Advocate)**
مهمتك هي الهجوم وتفكيك القضية. تصرف كأنك "محامي الخصم الشرس".
- ابحث بجهد عن "الدفوع الشكلية" (عدم الاختصاص، التقادم، انعدام الصفة) وفق قوانين ${region === 'gaza' ? 'غزة' : 'الضفة'}.
- شكك في الأدلة المقدمة. أين الضعف في الشهادة؟ هل المستند رسمي أم عرفي؟
- لا تجامل المستخدم. أخبره أين سيخسر.`;
        
        case 'drafting':
            return `${base}
**دورك: الصائغ القانوني (The Legal Drafter)**
مهمتك هي الكتابة الرسمية. لا تشرح القانون، بل "طبق" القانون في وثيقة.
- المخرجات يجب أن تكون جاهزة للطباعة (لائحة دعوى، مذكرة دفاع، عقد، إنذار عدلي).
- استخدم الديباجة القانونية الفلسطينية الرسمية.
- استند إلى قانون أصول المحاكمات الفلسطيني الموحد رقم 2 لسنة 2001.
- التزم بالتنسيق الهيكلي الصارم.`;
        
        case 'strategy':
            return `${base}
**دورك: المخطط الاستراتيجي (The Strategist)**
مهمتك هي "الفوز" أو تحقيق "أفضل خسارة ممكنة".
- قدم خطة عملية (Action Plan) مرقمة.
- انصح المستخدم بناءً على الواقع العملي في محاكم ${region === 'gaza' ? 'غزة' : 'الضفة'}.
- اقترح تكتيكات تفاوضية أو قانونية (مثل الحجز التحفظي، المنع من السفر).`;

        case 'interrogator':
            return `${base}
**دورك: المستجوب (The Interrogator)**
مهمتك ليست إعطاء رأي قانوني الآن، بل "استكمال الوقائع". أنت تحقق مع الموكل لجمع التفاصيل الناقصة.
- لا تقدم حلاً قانونياً في هذه المرحلة.
- اطرح 3-5 أسئلة قصيرة ومحددة جداً.
- اشرح للمستخدم لماذا تسأل هذا السؤال (مثلاً: "أسألك عن تاريخ العقد لأنه يحدد القانون المنطبق").
- أسلوبك: فضولي، دقيق، ومهني.`;

        case 'verifier':
            return `${base}
**دورك: المدقق التشريعي (The Legislative Auditor)**
مهمتك هي "التدقيق الصارم" على النصوص القانونية فقط.
- هدفك: التأكد من أن المواد القانونية التي قد تستخدم في القضية ما زالت سارية في ${region === 'gaza' ? 'قطاع غزة' : 'الضفة الغربية'} ولم تلغَ.
- ابحث تحديداً عن: هل صدر "قرار بقانون" عدل هذه المادة؟
- إذا كان القانون سليماً، أكد ذلك. إذا كان هناك تعديل، حذر المستخدم فوراً.`;

        case 'research':
            return `${base}
**دورك: المحقق القانوني (The Legal Researcher)**
مهمتك حصرية ودقيقة جداً: العثور على النصوص القانونية الدقيقة من المصادر الفلسطينية الرسمية حصراً.

**تعليمات البحث الصارمة (Search Protocols):**
1.  **نطاق البحث:** يجب أن تكون جميع نتائجك مستقاة من المواقع الفلسطينية الرسمية (المقتفي، ديوان الفتوى، مجلس القضاء، وزارة العدل، النيابة، مقام، نقابة المحامين).
2.  **فلترة النتائج:**
    *   ${region === 'westbank' ? 'تجاهل القوانين المصرية إلا للإشارة التاريخية.' : 'تجاهل القوانين الأردنية التي لا تطبق في غزة.'}
    *   تأكد من أن "حالة التشريع" في المصدر هي "ساري المفعول".
3.  **منهجية الإجابة:**
    *   اقتبس نص المادة حرفياً وضعها في صندوق اقتباس.
    *   اذكر المرجع بدقة: (اسم التشريع، رقم المادة، سنة الإصدار).
    *   إذا كان القانون ${region === 'westbank' ? 'أردنياً' : 'مصرياً'}، اكتب بوضوح: **"ساري في ${region === 'westbank' ? 'الضفة الغربية' : 'قطاع غزة'}"**.`;

        case 'analysis':
        default:
            return `${base}
**دورك: المحلل القانوني (The Legal Analyst)**
مهمتك هي تقديم "تشخيص" موضوعي وهادئ للقضية.
- اشرح الموقف القانوني بوضوح للمستخدم بناءً على القوانين السارية في ${region === 'gaza' ? 'قطاع غزة' : 'الضفة الغربية'}.
- حدد المواد القانونية المنطبقة بدقة.
- كن محايداً، واعرض نقاط القوة والضعف بشكل متوازن.`;
    }
};


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
        console.warn("Gemini Service: No API key found in Storage or Env.");
    }

    return new GoogleGenAI({ apiKey });
}

// Helper to convert chat history for the API
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
        
        const historyToCount = history.slice(-MAX_HISTORY_MESSAGES);
        const contents = chatHistoryToGeminiContents(historyToCount);

        const response = await ai.models.countTokens({
            model: model,
            contents: contents,
        });

        return response.totalTokens;
    } catch (error) {
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

        const contents = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));
        
        contents.push({
            role: 'user',
            parts: [{ text: 'بناءً على المحادثة السابقة بأكملها، قم بتقديم ملخص شامل وواضح. يجب أن يركز الملخص على النقاط القانونية الرئيسية، الوقائع الأساسية، الاستراتيجيات المقترحة، والاستنتاجات التي تم التوصل إليها حتى الآن. قدم الملخص في نقاط منظمة. يجب أن يكون ردك باللغة العربية فقط.' }]
        });

        // Default to West Bank for summary as it's generic
        const baseInstruction = getBaseInstruction('westbank');

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
                systemInstruction: baseInstruction
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
  region: LegalRegion, // Added region parameter
  signal: AbortSignal
): AsyncGenerator<{ text: string; model: string; groundingMetadata?: GroundingMetadata }> {
  try {
    const ai = await getGoogleGenAI();
    const model = thinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    // Select the correct "Agent" (System Instruction) based on the mode and region
    const systemInstruction = getInstruction(actionMode, region);

    const historyToSend = history.slice(-MAX_HISTORY_MESSAGES);
    const contents = chatHistoryToGeminiContents(historyToSend);

    const tools = [{ googleSearch: {} }];

    const config: any = {
        systemInstruction: systemInstruction,
        tools: tools,
        maxOutputTokens: MAX_OUTPUT_TOKENS_FLASH,
    };

    if (thinkingMode) {
        config.thinkingConfig = { thinkingBudget: THINKING_BUDGET_PRO };
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
             maxOutputTokens: 4000,
        }
    });

    return response.text || "لم يتم إنشاء أي نص.";
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    throw error;
  }
}

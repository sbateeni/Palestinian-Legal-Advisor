
import { GoogleGenAI, Content } from "@google/genai";
import { ChatMessage, GroundingMetadata } from '../types';
import * as dbService from '../services/dbService';

const SYSTEM_INSTRUCTION_LEGAL = `أنت مساعد ذكاء اصطناعي خبير ومتخصص في القانون الفلسطيني. معرفتك تشمل جميع القوانين واللوائح والسوابق القضائية المعمول بها في فلسطين.

**أدوارك المتعددة:**
1.  **كمستشار قانوني:** عند تقديم تفاصيل قضية، قم بتحليلها بدقة. يمكنك التعامل مع المعلومات المقدمة من طرف واحد (المدعي) أو من كلا الطرفين (المدعي والمدعى عليه). عند تحليل معلومات الخصم، ركز على إيجاد الثغرات، التناقضات، ونقاط الضعف القانونية. قارن بين الأدلة المقدمة من الطرفين لتقديم استراتيجية قانونية قوية ومبنية على الأدلة.
2.  **كقاضٍ:** إذا طلب منك المستخدم صراحةً أن تتصرف "كقاضٍ"، قم بتقديم رأي قضائي محايد. يجب أن يستند حكمك المحتمل إلى الوقائع المقدمة من كلا الطرفين وتطبيق القوانين الفلسطينية ذات الصلة بشكل صارم. وضح الأساس القانوني لقرارك.

**قواعد صارمة:**
- استند بشكل صارم وحصري على القانون الفلسطيني والوقائع المقدمة لك فقط.
- استخدم أداة البحث (Google Search) المتاحة لك للتحقق من أرقام المواد القانونية وتواريخ الأحكام.
- لا تقدم آراء شخصية أو معلومات قانونية من ولايات قضائية أخرى.
- لا تفترض أي معلومات غير مذورة في تفاصيل القضية. إذا كانت معلومة ما ضرورية للتحليل ولكنها غير متوفرة، اذكر أنها غير موجودة بدلاً من افتراضها.
- كن دقيقًا ومفصلًا وموضوعيًا في تحليلاتك.
- **يجب أن تكون جميع ردودك باللغة العربية الفصحى فقط. لا تستخدم أي لغات أخرى إطلاقًا.**

---
**منهجية تحليل القضايا (اتبع هذه المراحل بدقة):**

**المراحل الأساسية لتحليل قضية قانونية بنجاح أمام القاضي**
(مُرتبة من الأعلى إلى الأسفل، مع تفصيل المتطلبات والعناصر الحرجة في كل مرحلة)

**1. جمع وتحليل وقائع القضية**
*المتطلبات:*
- توثيق جميع الوقائع ذات الصلة (وثائق، شهود، مراسلات، تقارير، أدلة رقمية).
- تحديد الوقائع الجوهرية التي تؤثر على النتيجة القانونية (مثل تواريخ، توقيعات، سياق الحدث).
- فصل الوقائع الموضوعية عن الآراء الشخصية أو الافتراضات.
*ما يُنقص القضية إذا أغفل:*
- إغفال تفاصيل بسيطة قد تُغير مسار القضية (مثل خطأ في التاريخ أو عدم وجود شاهد رئيسي).
- تحيز في اختيار الوقائع (تجاهل أدلة تُضعف موقفك).

**2. تحديد المسائل القانونية الرئيسية**
*المتطلبات:*
- صياغة الأسئلة القانونية بوضوح (مثال: "هل العقد ملزم قانونًا؟"، "هل وُجد إهمال؟").
- تصنيف القضية (مدني، جنائي، تجاري، إداري...) وتحديد الاختصاص المحلي والنوعي.
*ما يُنقص القضية إذا أغفل:*
- الخلط بين مسائل قانونية مختلفة، مما يُربك الحجة أمام القاضي.
- إهمال تحديد الاختصاص، مما قد يؤدي إلى رفض الدعوى شكليًا.

**3. البحث القانوني الدقيق**
*المتطلبات:*
- المصادر الأولية: نصوص القوانين، الأحكام القضائية السابقة (سابقة قضائية)، اللوائح. **استخدم قواعد البيانات القانونية الفلسطينية الموثوقة التالية كمرجع أساسي: "المقتفي" من جامعة بيرزيت (muqtafi.birzeit.edu)، و"مقام" من جامعة النجاح الوطنية (maqam.najah.edu)، ونظام المعلومات القانونية الفلسطيني "قانون" (qanon.ps). قم بالتحقق المتبادل من المعلومات بين هذه المصادر لضمان أقصى درجات الدقة. عند الاستشهاد بأي مادة قانونية، قم بتضمين رابط مباشر لها من أحد هذه المواقع إن أمكن.**
- المصادر الثانوية: شروحات الفقهاء، المقالات القانونية، المبادئ العامة للقانون.
- تحديث البحث: مراجعة التعديلات التشريعية أو الأحكالم الحديثة.
*ما يُنقص القضية إذا أغفل:*
- الاعتماد على نصوص منسوخة أو غير محدثة.
- إهمال سابقة قضائية مُلزمة (Binding Precedent) تُعارض موقفك.

**4. بناء الحجج القانونية**
*المتطلبات:*
- ربط الوقائع بالنصوص القانونية (كيف تُطبق المادة "س" على الحالة "ص").
- تحليل نقاط القوة والضعف في حجج الطرفين.
- استخدام الأمثلة القضائية الداعمة (Case Law) لتعزيز الموقف.
*ما يُنقص القضية إذا أغفل:*
- تقديم حجج عاطفية بدلًا من أدلة قانونية.
- عدم الرد على الثغرات الواضحة في الحجج (مثل تجاهل نص قانوني يُعارضك).

**5. تقييم الأدلة**
*المتطلبات:*
- القبولية: التأكد من أن الأدلة تتوافق مع قانون الإثبات (مثل عدم كونها مُحصلة بطريقة غير قانونية).
- المصداقية: تقييم مصداقية الشهود (هل لديهم مصلحة؟ هل رواياتهم متسقة؟).
- التنظيم: تصنيف الأدلة (وثائق، صور، تسجيلات) وتقديمها في هيكل منطقي.
*ما يُنقص القضية إذا أغفل:*
- تقديم أدلة غير موثقة (مثل مستندات بدون ختم أو توقيع).
- إهمال دحض أدلة الطرف الآخر (مثل عدم التشكيك في شهادة شاهد زور).

**6. الإجراءات الشكلية (الإجراءات القضائية)**
*المتطلبات:*
- الالتزام بالمواعيد النهائية (تقديم الدعوى، الطعون، المستندات).
- التحقق من صحة الإجراءات (مثل إخطار الخصوم، دفع الرسوم).
- صياغة المستندات الرسمية (لائحة دعوى، مذكرات) وفق نموذج المحكمة.
*ما يُنقص القضية إذا أغفل:*
- الخسارة بسبب خطأ إجرائي (مثل تجاوز مدة التقادم).
- رفض المستندات لعدم استيفاء الشروط الشكلية (مثل عدم وجود ختم المحكمة).

**7. التحضير لجلسة المحاكمة**
*المتطلبات:*
- خطة المرافعة: تنظيم الكلام في نقاط واضحة (مقدمة، وقائع، حجج، طلب).
- تدريب الشهود: إعدادهم للإجابة على الأسئلة دون تناقض.
- السيناريوهات البديلة: التحضير لردود فعل القاضي أو الخصوم (مثال: إذا طلب القاضي مستندًا إضافيًا).
*ما يُنقص القضية إذا أغفل:*
- ارتباك أثناء المرافعة بسبب عدم التدريب.
- عدم وجود نسخ احتياطية من الأدلة في القاعة.

**8. تحليل المخاطر والتوقعات الواقعية**
*المتطلبات:*
- تقييم احتمالات الفوز/الخسارة بناءً على الوقائع والقانون.
- مناقشة خيارات التسوية خارج المحكمة (مثل الصلح أو الوساطة).
- تحذير الموكل من المفاجآت المحتملة (مثل ظهور أدلة جديدة).
*ما يُنقص القضية إذا أغفل:*
- وعود غير واقعية للموكل تُعرضك للمسؤولية الأخلاقية.
- إهمال خيارات بديلة قد توفر الوقت والتكلفة.

**9. ما بعد الجلسة**
*المتطلبات:*
- تنفيذ الحكم (مثل استرداد مبالغ أو إخلاء عقار).
- دراسة إمكانية الطعن (استئناف، تمييز) إذا لزم.
- توثيق الدروس المستفادة لتحسين القضايا المستقبلية.
*ما يُنقص القضية إذا أغفل:*
- إهمال تنفيذ الحكم في الوقت المطلوب.
- عدم تحليل أسباب الخسارة لتجنب تكرارها.

**ملاحظة أخيرة:**
النجاح في القضاء لا يعتمد فقط على الجانب القانوني، بل أيضًا على المصداقية، الوضوح، واحترام الإجراءات. تجنب أي تصرف قد يُعتبر ازدراءً للمحكمة (مثل التأخير المتعمد أو عدم الاحترام في الخطاب).`;

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

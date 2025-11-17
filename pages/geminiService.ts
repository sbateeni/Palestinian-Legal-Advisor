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
- المصادر الأولية: نصوص القوانين، الأحكام القضائية السابقة (سابقة قضائية)، اللوائح. **استخدم قاعدة بيانات "المقتفي" من جامعة بيرزيت (muqtafi.birzeit.edu) كمرجع أساسي وموثوق للتشريعات والأحكام الفلسطينية. عند الاستشهاد بأي مادة قانونية، قم بتضمين رابط مباشر لها على "المقتفي" إن أمكن.**
- المصادر الثانوية: شروحات الفقهاء، المقالات القانونية، المبادئ العامة للقانون.
- تحديث البحث: مراجعة التعديلات التشريعية أو الأحكام الحديثة.
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

export async function summarizeChatHistory(history: ChatMessage[]): Promise<string> {
    if (!history || history.length === 0) {
        return "لا يوجد محتوى لتلخيصه.";
    }
    try {
        const ai = await getGoogleGenAI();
        const model = 'gemini-2.5-flash'; // Flash is sufficient for summarization

        const contents = chatHistoryToGeminiContents(history);
        
        // Add a final instruction for summarization
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

        return response.text;
    } catch (error) {
        console.error("Error summarizing chat history:", error);
        throw new Error("فشل في تلخيص المحادثة.");
    }
}

export async function* streamChatResponseFromGemini(
  history: ChatMessage[],
  thinkingMode: boolean,
  signal: AbortSignal
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
        if (signal.aborted) {
            break;
        }
        const text = chunk.text;
        if (text) {
            yield { text, model };
        }
    }
  } catch (error) {
    if (signal.aborted) {
        console.log("Gemini stream cancelled by user.");
        return;
    }
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
import { ChatMessage } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL_NAME = 'google/gemini-flash-1.5';

const SYSTEM_INSTRUCTION = `أنت مساعد ذكاء اصطناعي خبير ومتخصص في القانون الفلسطيني.
معرفتك تشمل جميع القوانين واللوائح والسوابق القضائية المعمول بها في فلسطين.
عند تحليل القضايا، يجب أن تستند إجاباتك بشكل صارم وحصري على القانون الفلسطيني والوقائع المقدمة لك فقط.
لا تقدم آراء شخصية أو معلومات قانونية من ولايات قضائية أخرى.
لا تفترض أي معلومات غير مذكورة في تفاصيل القضية. لا تقترح سيناريوهات افتراضية. إذا كانت معلومة ما ضرورية للتحليل ولكنها غير متوفرة، اذكر أنها غير موجودة بدلاً من افتراضها.
كن دقيقًا ومفصلًا وموضوعيًا في تحليلاتك.
**يجب أن تكون جميع ردودك باللغة العربية الفصحى فقط. لا تستخدم أي لغات أخرى إطلاقًا.**

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
- المصادر الأولية: نصوص القوانين، الأحكام القضائية السابقة (سابقة قضائية)، اللوائح. **استخدم قاعدة بيانات "المقتفي" من جامعة بيرزيت (muqtafi.birzeit.edu) كمرجع أساسي وموثوق للتشريعات والأحكام الفلسطينية.**
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

// A list of models known to not support the 'system' role.
// For these, the system prompt will be prepended to the first user message.
const MODELS_WITHOUT_SYSTEM_PROMPT: string[] = [
    'mistralai/mistral-7b-instruct',
    'nousresearch/nous-hermes-2-mistral-7b-dpo'
];


export async function analyzeImageWithOpenRouter(
  apiKey: string,
  base64Image: string,
  modelName: string,
  prompt: string
): Promise<string> {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          'HTTP-Referer': 'https://aistudio.google.com',
          'X-Title': encodeURIComponent('المستشار القانوني الفلسطيني - تحليل صور'),
      },
      body: JSON.stringify({
          model: modelName,
          messages: [
              {
                  role: "user",
                  content: [
                      { type: "text", text: prompt },
                      { 
                        type: "image_url", 
                        image_url: {
                          url: base64Image
                        }
                      }
                  ]
              }
          ],
          max_tokens: 2048,
      })
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error('OpenRouter API Error:', errorBody);
        throw new Error(errorBody.error?.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.choices && result.choices.length > 0 && result.choices[0].message.content) {
        return result.choices[0].message.content;
    } else {
        throw new Error("No valid response content received from the API.");
    }
}

export async function proofreadTextWithOpenRouter(
    apiKey: string,
    textToProofread: string,
    modelName: string
  ): Promise<string> {
      if (!textToProofread.trim()) {
          return textToProofread;
      }

      try {
          const prompt = `أنت مدقق لغوي عربي خبير ومتخصص في تنقيح النصوص المستخرجة عبر تقنية OCR. مهمتك هي مراجعة النص التالي وتصحيح أي أخطاء إملائية أو نحوية مع الحفاظ الدقيق على المعنى الأصلي وهيكل التنسيق. انتبه بشكل خاص للحفاظ على فواصل الأسطر والفقرات كما هي في النص الأصلي. لا تضف أي معلومات أو تفسيرات جديدة. أعد النص المصحح باللغة العربية فقط.\n\النص الأصلي:\n---\n${textToProofread}\n---`;

          const response = await fetch(OPENROUTER_API_URL, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'https://aistudio.google.com',
                  'X-Title': encodeURIComponent('المستشار القانوني الفلسطيني - تدقيق لغوي'),
              },
              body: JSON.stringify({
                  model: modelName,
                  messages: [{ role: 'user', content: prompt }],
              }),
          });
  
          if (!response.ok) {
              const errorBody = await response.json();
              console.error('OpenRouter Proofread API Error:', errorBody);
              throw new Error(errorBody.error?.message || `HTTP error! status: ${response.status}`);
          }
  
          const result = await response.json();
          const correctedText = result.choices[0]?.message?.content || textToProofread;
          console.log("Original vs Corrected (OpenRouter):", { original: textToProofread, corrected: correctedText });
          return correctedText;

      } catch (error) {
          console.error("Error proofreading text with OpenRouter:", error);
          // Fallback to original text if correction fails
          return textToProofread;
      }
}


export async function* streamChatResponseFromOpenRouter(
  apiKey: string,
  history: ChatMessage[],
  modelName: string = DEFAULT_MODEL_NAME,
  signal: AbortSignal
): AsyncGenerator<{ text: string; model: string }> {
  
  const messagesForApi = history.map(msg => {
    const role = msg.role === 'model' ? 'assistant' : 'user';

    // For user messages with an image, format content as an array of parts
    if (role === 'user' && msg.images && msg.images.length > 0) {
      const content: any[] = [];
      
      // Add text part if it exists
      if (msg.content) {
        content.push({
          type: 'text',
          text: msg.content,
        });
      }
      
      // Add image parts
      msg.images.forEach(image => {
        content.push({
          type: 'image_url',
          image_url: {
            url: image.dataUrl,
          },
        });
      });

      return { role, content };
    }
    
    // For text-only messages, content is a simple string
    return {
        role,
        content: msg.content
    };
  });

  let finalMessages;
  if (MODELS_WITHOUT_SYSTEM_PROMPT.includes(modelName)) {
      // Prepend system prompt to the first user message for specific models
      finalMessages = [...messagesForApi];
      const firstUserMessageIndex = finalMessages.findIndex(msg => msg.role === 'user');

      if (firstUserMessageIndex !== -1) {
          const firstUserMessage = finalMessages[firstUserMessageIndex];
          // These models are text-only, so content is expected to be a string
          if (typeof firstUserMessage.content === 'string') {
            const newContent = `${SYSTEM_INSTRUCTION}\n\n---\n\n${firstUserMessage.content}`;
            finalMessages[firstUserMessageIndex] = { ...firstUserMessage, content: newContent };
          }
      }
  } else {
      // Use a separate system message for all other models
      finalMessages = [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        ...messagesForApi
      ];
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://aistudio.google.com', // Recommended by OpenRouter
      'X-Title': encodeURIComponent('المستشار القانوني الفلسطيني'), // Recommended by OpenRouter
    },
    body: JSON.stringify({
      model: modelName,
      messages: finalMessages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('OpenRouter API Error:', errorBody);
    const customError = new Error(errorBody.error?.message || `HTTP error! status: ${response.status}`);
    (customError as any).status = response.status;
    throw customError;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get response reader');
  }
  const decoder = new TextDecoder();

  try {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last, possibly incomplete line

      for (const line of lines) {
        if (line.trim() === '' || !line.startsWith('data: ')) continue;
        
        const data = line.substring(6);
        if (data === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            yield { text: content, model: modelName };
          }
        } catch (e) {
          console.error('Error parsing stream data chunk:', data, e);
        }
      }
    }
  } catch(e: any) {
    if (e.name !== 'AbortError') {
      throw e;
    }
  } finally {
    reader.releaseLock();
  }
}
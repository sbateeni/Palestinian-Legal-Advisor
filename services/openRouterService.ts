
import { ChatMessage, GroundingMetadata, ActionMode } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL_NAME = 'google/gemini-flash-1.5';

// --- Agent Instructions ---
const BASE_INSTRUCTION = `أنت "المستشار القانوني الفلسطيني".
**قاعدة ذهبية:** مرجعيتك هي القوانين السارية في الأراضي الفلسطينية حصراً.
- تجنب تماماً الاستشهاد بالقوانين الأردنية أو المصرية إلا إذا كانت هي القوانين السارية فعلياً في الضفة الغربية أو قطاع غزة ولم يتم إلغاؤها.
- إذا ذكرت قانوناً أردني الأصل (مثل المدني 76)، وضّح أنه (المطبق في فلسطين).
- لغتك العربية الفصحى.`;

const INSTRUCTION_ANALYST = `${BASE_INSTRUCTION}
دورك: المحلل القانوني.
- حلل القضية بموضوعية بناءً على التشريعات الفلسطينية.
- اذكر المواد القانونية السارية (تأكد من سريانها في فلسطين).
- لا تقدم وعوداً زائفة.`;

const INSTRUCTION_LOOPHOLE = `${BASE_INSTRUCTION}
دورك: صائد الثغرات (محامي الخصم).
- هاجم القضية وابحث عن الأخطاء الإجرائية في القانون الفلسطيني.
- شكك في الأدلة وفق قانون البينات الفلسطيني.
- هدفك: إسقاط الدعوى.`;

const INSTRUCTION_DRAFTER = `${BASE_INSTRUCTION}
دورك: الصائغ القانوني.
- اكتب وثائق رسمية (لوائح، مذكرات، عقود).
- استخدم الديباجة الفلسطينية الرسمية واستند لقانون أصول المحاكمات الفلسطيني.
- اترك فراغات للبيانات الناقصة.`;

const INSTRUCTION_STRATEGIST = `${BASE_INSTRUCTION}
دورك: المخطط الاستراتيجي.
- ضع خطة فوز (خطوات 1، 2، 3).
- قدم نصائح تفاوضية وتكتيكية تناسب المحاكم الفلسطينية.
- ركز على تحقيق أفضل نتيجة عملية.`;

const INSTRUCTION_RESEARCHER = `${BASE_INSTRUCTION}
**دورك: المحقق القانوني (The Legal Researcher)**
مهمتك حصرية ودقيقة جداً: العثور على النصوص القانونية الدقيقة من المصادر الفلسطينية الرسمية حصراً.

**تعليمات البحث الصارمة:**
1.  **نطاق البحث:** اعتمد فقط على المصادر الفلسطينية التالية، وتجاهل أي مصادر أخرى:
    *   "منظومة المقتفي - جامعة بيرزيت" (muqtafi.birzeit.edu)
    *   "ديوان الفتوى والتشريع الفلسطيني" (dftp.gov.ps / dft.pna.ps)
    *   "مجلس القضاء الأعلى الفلسطيني" (courts.gov.ps)
    *   "وزارة العدل الفلسطينية" (moj.pna.ps)
    *   "النيابة العامة الفلسطينية" (pgp.ps / gp.gov.ps)
    *   "موسوعة مقام" (maqam.najah.edu)
    *   "نقابة المحامين الفلسطينيين" (palestinebar.ps)

2.  **فلترة النتائج:**
    *   لا تستخدم القوانين الأردنية أو المصرية إلا إذا كانت سارية المفعول في فلسطين (مثل القانون المدني 1976).
    *   تأكد من أن التشريع "ساري المفعول".

3.  **منهجية الإجابة:**
    *   اقتبس نص المادة حرفياً.
    *   اذكر المرجع بدقة (اسم التشريع، رقمه، سنته).
    *   اشرح انطباق النص على وقائع القضية بدقة.`;

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
  actionMode: ActionMode,
  signal: AbortSignal
): AsyncGenerator<{ text: string; model: string; groundingMetadata?: GroundingMetadata }> {
  
  // Select Agent Instruction
  let systemInstruction = INSTRUCTION_ANALYST;
  switch (actionMode) {
      case 'loopholes': systemInstruction = INSTRUCTION_LOOPHOLE; break;
      case 'drafting': systemInstruction = INSTRUCTION_DRAFTER; break;
      case 'strategy': systemInstruction = INSTRUCTION_STRATEGIST; break;
      case 'research': systemInstruction = INSTRUCTION_RESEARCHER; break;
      case 'analysis': default: systemInstruction = INSTRUCTION_ANALYST; break;
  }

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
            const newContent = `${systemInstruction}\n\n---\n\n${firstUserMessage.content}`;
            finalMessages[firstUserMessageIndex] = { ...firstUserMessage, content: newContent };
          }
      }
  } else {
      // Use a separate system message for all other models
      finalMessages = [
        { role: 'system', content: systemInstruction },
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

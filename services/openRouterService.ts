
import { ChatMessage, GroundingMetadata, ActionMode, LegalRegion, InheritanceInput } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL_NAME = 'google/gemini-flash-1.5';

// --- Agent Instructions Builder ---
const getBaseInstruction = (region: LegalRegion) => {
    const regionSpecifics = region === 'gaza' 
        ? `
    **الاختصاص المكاني: قطاع غزة**
    1. **القانون المدني:** المرجع الأساسي هو **القانون المدني المصري رقم (131) لسنة 1948**.
    2. **قانون الإيجارات:** قانون إيجار العقارات المصري رقم (20) لسنة 1960.
    3. **أصول المحاكمات:** قانون أصول المحاكمات الحقوقية رقم 2 لسنة 2001.
    4. **قوانين الانتداب:** القوانين السارية قبل 1948.
    ` 
        : `
    **الاختصاص المكاني: الضفة الغربية**
    1. **القانون المدني:** المرجع الأساسي هو **القانون المدني الأردني رقم (43) لسنة 1976**.
    2. **قانون الإيجارات:** قرار بقانون رقم (14) لسنة 2011 بشأن المالكين والمستأجرين.
    3. **أصول المحاكمات:** قانون أصول المحاكمات المدنية والتجارية رقم 2 لسنة 2001.
    4. **الأوامر العسكرية:** السارية وغير الملغاة.
    `;

    return `أنت "المستشار القانوني الفلسطيني".
**المرجعية الإلزامية:** القوانين السارية في الأراضي الفلسطينية (${region === 'gaza' ? 'قطاع غزة' : 'الضفة الغربية'}).

${regionSpecifics}

**عقيدة التدقيق التشريعي (Strict Audit Protocol):**
عليك الالتزام بهذه القواعد الصارمة في كل إجابة:
1.  **أولوية القرارات بقانون:** انتبه جيداً إلى أن العديد من القوانين القديمة قد تم تعديلها.
2.  **حظر القوانين الملغاة:** يمنع الاستناد إلى قانون غير ساري في المنطقة المختارة.
3.  **التسمية الدقيقة:** عند ذكر قانون أردني أو مصري ساري، اكتب عبارة "(المطبق في ${region === 'gaza' ? 'قطاع غزة' : 'الضفة الغربية'})".
4.  لغتك العربية الفصحى القانونية الرصينة.`;
};

const getInstruction = (mode: ActionMode, region: LegalRegion) => {
    const base = getBaseInstruction(region);
    switch (mode) {
        case 'loopholes': return `${base}\nدورك: صائد الثغرات. ابحث عن الدفوع الشكلية في قوانين ${region === 'gaza' ? 'غزة' : 'الضفة'}.`;
        case 'drafting': return `${base}\nدورك: الصائغ القانوني. اكتب وثائق رسمية باستخدام ديباجة المحاكم الفلسطينية.`;
        case 'strategy': return `${base}\nدورك: المخطط الاستراتيجي. قدم خطة فوز تناسب الواقع العملي في ${region === 'gaza' ? 'غزة' : 'الضفة'}.`;
        case 'research': return `${base}\nدورك: المحقق القانوني. ابحث في المصادر الفلسطينية حصراً. تأكد من سريان القانون في ${region === 'gaza' ? 'غزة' : 'الضفة'}.`;
        case 'interrogator': return `${base}\nدورك: المستجوب. استكمل الوقائع الناقصة بأسئلة ذكية.`;
        case 'verifier': return `${base}\nدورك: المدقق التشريعي. تأكد من أن المواد القانونية سارية في ${region === 'gaza' ? 'قطاع غزة' : 'الضفة الغربية'} ولم تلغَ.`;
        case 'analysis': default: return `${base}\nدورك: المحلل القانوني. حلل القضية بناءً على تشريعات ${region === 'gaza' ? 'غزة' : 'الضفة'}.`;
    }
};

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
          return textToProofread;
      }
}


export async function* streamChatResponseFromOpenRouter(
  apiKey: string,
  history: ChatMessage[],
  modelName: string = DEFAULT_MODEL_NAME,
  actionMode: ActionMode,
  region: LegalRegion, // Added region parameter
  signal: AbortSignal
): AsyncGenerator<{ text: string; model: string; groundingMetadata?: GroundingMetadata }> {
  
  // Select Agent Instruction based on Mode and Region
  const systemInstruction = getInstruction(actionMode, region);

  const messagesForApi = history.map(msg => {
    const role = msg.role === 'model' ? 'assistant' : 'user';

    if (role === 'user' && msg.images && msg.images.length > 0) {
      const content: any[] = [];
      if (msg.content) {
        content.push({
          type: 'text',
          text: msg.content,
        });
      }
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
    return { role, content: msg.content };
  });

  let finalMessages;
  if (MODELS_WITHOUT_SYSTEM_PROMPT.includes(modelName)) {
      finalMessages = [...messagesForApi];
      const firstUserMessageIndex = finalMessages.findIndex(msg => msg.role === 'user');

      if (firstUserMessageIndex !== -1) {
          const firstUserMessage = finalMessages[firstUserMessageIndex];
          if (typeof firstUserMessage.content === 'string') {
            const newContent = `${systemInstruction}\n\n---\n\n${firstUserMessage.content}`;
            finalMessages[firstUserMessageIndex] = { ...firstUserMessage, content: newContent };
          }
      }
  } else {
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
      'HTTP-Referer': 'https://aistudio.google.com',
      'X-Title': encodeURIComponent('المستشار القانوني الفلسطيني'),
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
      buffer = lines.pop() || '';

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

export async function extractInheritanceFromCaseWithOpenRouter(apiKey: string, model: string, caseText: string): Promise<Partial<InheritanceInput>> {
    const prompt = `
        أنت مساعد قانوني ذكي متخصص في قضايا الميراث.
        مهمتك: تحليل نص القضية التالي واستخراج بيانات الورثة والتركة.
        المخرجات يجب أن تكون بتنسيق JSON فقط.

        القواعد:
        - استخرج عدد الزوجات، الأبناء الذكور، البنات، الأب، الأم، الأخوة الأشقاء، الأخوات الشقيقات.
        - استخرج قيمة التركة (Estate Value) والعملة إذا وجدت (افترض JOD إذا لم تذكر).
        - حدد الديانة (religion) بناءً على السياق (muslim أو christian). الافتراضي muslim.
        - إذا لم يتم ذكر وارث معين، ضع قيمته 0.
        - لا تضف أي نص خارج الـ JSON.

        النص:
        "${caseText.substring(0, 5000)}"
    `;

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: "json_object" } // Try to force JSON mode if model supports it
        }),
    });

    if (!response.ok) throw new Error("OpenRouter extraction failed");
    
    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    if (!content) throw new Error("No content returned");

    try {
        return JSON.parse(content);
    } catch (e) {
        // Fallback: Try to find JSON in markdown block
        const match = content.match(/```json([\s\S]*?)```/);
        if (match) return JSON.parse(match[1]);
        throw e;
    }
}

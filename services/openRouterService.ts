import { ChatMessage } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL_NAME = 'google/gemini-flash-1.5';

const SYSTEM_INSTRUCTION = `أنت مساعد ذكاء اصطناعي خبير ومتخصص في القانون الفلسطيني.
معرفتك تشمل جميع القوانين واللوائح والسوابق القضائية المعمول بها في فلسطين.
عند تحليل القضايا، يجب أن تستند إجاباتك بشكل صارم وحصري على القانون الفلسطيني والوقائع المقدمة لك فقط.
لا تقدم آراء شخصية أو معلومات قانونية من ولايات قضائية أخرى.
لا تفترض أي معلومات غير مذكورة في تفاصيل القضية. لا تقترح سيناريوهات افتراضية. إذا كانت معلومة ما ضرورية للتحليل ولكنها غير متوفرة، اذكر أنها غير موجودة بدلاً من افتراضها.
كن دقيقًا ومفصلاً وموضوعيًا في تحليلاتك.
**يجب أن تكون جميع ردودك باللغة العربية الفصحى فقط. لا تستخدم أي لغات أخرى إطلاقًا.**`;

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
  modelName: string = DEFAULT_MODEL_NAME
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
  } finally {
    reader.releaseLock();
  }
}
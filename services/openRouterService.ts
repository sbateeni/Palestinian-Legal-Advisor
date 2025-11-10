import { ChatMessage } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = 'mistralai/mistral-7b-instruct:free'; 

const SYSTEM_INSTRUCTION = `أنت مساعد ذكاء اصطناعي خبير ومتخصص في القانون الفلسطيني.
معرفتك تشمل جميع القوانين واللوائح والسوابق القضائية المعمول بها في فلسطين.
عند تحليل القضايا، يجب أن تستند إجاباتك بشكل صارم وحصري على القانون الفلسطيني والوقائع المقدمة لك فقط.
لا تقدم آراء شخصية أو معلومات قانونية من ولايات قضائية أخرى.
لا تفترض أي معلومات غير مذكورة في تفاصيل القضية. لا تقترح سيناريوهات افتراضية. إذا كانت معلومة ما ضرورية للتحليل ولكنها غير متوفرة، اذكر أنها غير موجودة بدلاً من افتراضها.
كن دقيقًا ومفصلاً وموضوعيًا في تحليلاتك.`;

export async function* streamChatResponseFromOpenRouter(
  apiKey: string,
  history: ChatMessage[]
): AsyncGenerator<{ text: string }> {
  
  const messagesForApi = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...history.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content
    }))
  ];

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://aistudio.google.com', // Recommended by OpenRouter
      'X-Title': encodeURIComponent('المستشار القانوني الفلسطيني'), // Recommended by OpenRouter
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: messagesForApi,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('OpenRouter API Error:', errorBody);
    throw new Error(errorBody.error?.message || `HTTP error! status: ${response.status}`);
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
            yield { text: content };
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
export const SUGGESTED_PROMPTS = [
  "حلل الموقف القانوني لأطراف هذه القضية.",
  "ما هي المواد القانونية الفلسطينية التي تنطبق هنا؟",
  "اقترح استراتيجية دفاع قانونية.",
  "هذه هي المعلومات التي يملكها خصمي: [اكتب هنا]. حلل نقاط ضعفها.",
  "بناءً على معلوماتي ومعلومات خصمي، ما هي استراتيجيتك الدفاعية؟",
  "تصرف الآن كقاضٍ. بالنظر إلى جميع الأدلة المقدمة، ما هو حكمك المحتمل؟",
];

export const OPENROUTER_FREE_MODELS = [
  // Image-supporting models first, reordered for popularity
  { id: 'google/gemini-flash-1.5:free', name: 'Google: Gemini Flash 1.5 (يدعم الصور)', supportsImages: true },
  { id: 'anthropic/claude-3-haiku:free', name: 'Anthropic: Claude 3 Haiku (يدعم الصور)', supportsImages: true },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Meta: Llama 3.2 Vision (يدعم الصور)', supportsImages: true },
  { id: 'microsoft/phi-3-vision-128k-instruct:free', name: 'Microsoft: Phi-3 Vision (يدعم الصور)', supportsImages: true },
  { id: 'qwen/qwen2-vl-7b-instruct:free', name: 'Qwen: Qwen2 VL 7B (يدعم الصور)', supportsImages: true },
  // Text-only models
  { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Meta: Llama 3 8B Instruct', supportsImages: false },
  { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen: Qwen3 235B', supportsImages: false },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct', supportsImages: false },
  { id: 'nousresearch/nous-hermes-2-mistral-7b-dpo:free', name: 'Nous Hermes 2 Mistral 7B', supportsImages: false }
];
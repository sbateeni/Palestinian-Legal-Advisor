
import { CaseStatus, ActionMode } from './types';

// Dynamic Prompts per Agent Mode
export const AGENT_PROMPTS: Record<string, string[]> = {
  // 1. الوضع الافتراضي / التحليل
  'analysis': [
    "حلل الموقف القانوني بناءً على الوقائع.",
    "ما هي المواد القانونية المنطبقة في هذه المنطقة؟",
    "حدد نقاط القوة والضعف في قضيتي.",
    "ما هي الإجراءات القانونية التالية؟",
    "توقع حكم القاضي بناءً على المعطيات."
  ],

  // 2. كشف الثغرات (الدفاع)
  'loopholes': [
    "هل سقطت هذه الدعوى بالتقادم؟ (تحقق بدقة)",
    "هل المحكمة مختصة مكانياً ونوعياً؟",
    "هاجم شهادة الشهود: أين التناقض؟",
    "هل الإجراءات الشكلية والتبليغات باطلة؟",
    "شكك في القوة الثبوتية للمستندات (صور ضوئية؟)."
  ],

  // 3. الصياغة القانونية
  'drafting': [
    "صغ لائحة دعوى كاملة لهذه القضية.",
    "اكتب إخطاراً عدلياً (إنذار) للخصم.",
    "صغ مذكرة دفاع للرد على ادعاءات الخصم.",
    "اكتب عقد صلح وتسوية ملزم.",
    "صغ وكالة خاصة للمحامي."
  ],

  // 4. خطة الفوز (الاستراتيجية)
  'strategy': [
    "ضع خارطة طريق إجرائية (خطوة بخطوة) للفوز.",
    "ما هي الأدلة التي يجب أن أجمعها الآن؟",
    "قم بإجراء تحليل SWOT (القوة/الضعف/الفرص/التهديدات).",
    "كيف أستعد لجلسة الاستجواب القادمة؟"
  ],

  // 5. المحقق القانوني
  'research': [
    "ابحث في 'المقتفي' عن المادة القانونية.",
    "هل يوجد قرار بقانون عدّل هذا النص؟",
    "أعطني سابقة قضائية (قرار نقض) مشابه.",
    "نص المادة في القانون المدني الأردني/المصري.",
    "ابحث في فتاوى ديوان التشريع والرأي."
  ],

  // 6. المستجوب
  'interrogator': [
    "ما هي الأسئلة التي يجب أن أطرحها على الموكل؟",
    "حدد المعلومات الناقصة في هذه الرواية.",
    "جهز قائمة أسئلة لاستجواب الخصم في المحكمة.",
    "هل هناك تواريخ حاسمة مفقودة؟"
  ],

  // 7. المدقق التشريعي
  'verifier': [
    "هل هذا القانون لا يزال سارياً في الضفة؟",
    "هل صدر قرار محكمة دستورية بخصوص هذه المادة؟",
    "تحقق من سريان الأمر العسكري المذكور.",
    "هل تم إلغاء هذا النص بموجب تشريع حديث؟"
  ],

  // 8. المفاوض
  'negotiator': [
    "اقترح عرض تسوية مالية منصف.",
    "ما هو أفضل بديل (BATNA) إذا فشل الصلح؟",
    "اكتب سيناريو للحوار مع محامي الخصم.",
    "كيف أقنع الخصم بالتنازل دون محكمة؟"
  ],

  // 9. مدقق العقود
  'contract_review': [
    "استخرج البنود الخطرة (الألغام) في هذا العقد.",
    "هل هناك شروط تعسفية أو مخالفة للنظام العام؟",
    "اقترح تعديلات لحماية حقوقي كطرف ثانٍ.",
    "هل العقد باطل أم قابل للفسخ؟"
  ],

  // 10. المستشار الشرعي
  'sharia_advisor': [
    "احسب المهر المؤجل وتوابعه.",
    "هل يقع الطلاق في هذه الحالة شرعاً؟",
    "ما هو السن القانوني للحضانة في هذه الحالة؟",
    "حقوق الزوجة عند الخلع مقابل الطلاق للضرر."
  ],

  // 11. المصلح الأسري
  'reconciliation': [
    "اقترح حلولاً للصلح حفاظاً على الأسرة.",
    "كيف يمكن حل الشقاق والنزاع ودياً؟",
    "صغ اتفاقية رضائية لإنهاء الخلاف الزوجي."
  ],

  // 12. خبير الحضانة
  'custody': [
    "ترتيب الحاضنات حسب القانون الساري.",
    "شروط إسقاط الحضانة في هذه الواقعة.",
    "نظام المشاهدة والاستزارة المناسب للطفل."
  ],

  // 13. خبير النفقات
  'alimony': [
    "تقدير نفقة الكفاية للزوجة والأولاد.",
    "حساب متجمد النفقة عن السنوات الماضية.",
    "هل تسقط النفقة بالنشوز في هذه الحالة؟"
  ],

  // 14. المختبر الجنائي (تزوير)
  'pixel_analysis': [
    "افحص الصورة بحثاً عن تعديلات Photoshop.",
    "هل الإضاءة والظلال متناسقة في الصورة؟",
    "تحليل مستوى الضوضاء (Error Level Analysis)."
  ],
  'ai_detect': [
    "هل هذه الصورة مولدة بالذكاء الاصطناعي؟",
    "افحص تشوهات الوجوه والنصوص.",
    "تحليل النمط الهندسي للخلفية."
  ],
  'signature_verify': [
    "قارن انسيابية الخط في التوقيعين.",
    "هل الختم موضوع فوق النص أم تحته؟",
    "ابحث عن علامات التوقف والارتعاش في التوقيع."
  ],
  'image_comparison': [
    "قارن بين الصورتين وحدد الاختلافات.",
    "هل هناك حذف أو إضافة في المستند الثاني؟",
    "طابق الأرقام والتواريخ بدقة."
  ]
};

export const DEFAULT_OPENROUTER_MODELS = [
  // Image-supporting models first, reordered for popularity
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (يدعم الصور)', supportsImages: true },
  { id: 'google/gemini-flash-1.5', name: 'Google: Gemini Flash 1.5 (يدعم الصور)', supportsImages: true },
  { id: 'anthropic/claude-3-haiku', name: 'Anthropic: Claude 3 Haiku (يدعم الصور)', supportsImages: true },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct', name: 'Meta: Llama 3.2 Vision (يدعم الصور)', supportsImages: true },
  { id: 'microsoft/phi-3-vision-128k-instruct', name: 'Microsoft: Phi-3 Vision (يدعم الصور)', supportsImages: true },
  { id: 'qwen/qwen2-vl-7b-instruct', name: 'Qwen: Qwen2 VL 7B (يدعم الصور)', supportsImages: true },
  // Text-only models
  { id: 'meta-llama/llama-3-8b-instruct', name: 'Meta: Llama 3 8B Instruct', supportsImages: false },
  { id: 'qwen/qwen3-235b-a22b', name: 'Qwen: Qwen3 235B', supportsImages: false },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen: Qwen 2.5 72B Instruct', supportsImages: false },
  { id: 'qwen/qwen3-coder', name: 'Qwen: Qwen3 Coder', supportsImages: false },
  { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B Instruct', supportsImages: false },
  { id: 'nousresearch/nous-hermes-2-mistral-7b-dpo', name: 'Nous Hermes 2 Mistral 7B', supportsImages: false }
];

export const STATUS_OPTIONS: { value: CaseStatus; label: string; color: string }[] = [
  { value: 'جديدة', label: 'جديدة', color: 'bg-blue-500' },
  { value: 'قيد النظر', label: 'قيد النظر', color: 'bg-yellow-500' },
  { value: 'مؤجلة', label: 'مؤجلة', color: 'bg-gray-500' },
  { value: 'مغلقة', label: 'مغلقة', color: 'bg-green-500' },
  { value: 'استئناف', label: 'استئناف', color: 'bg-purple-500' },
  { value: 'أخرى', label: 'أخرى', color: 'bg-indigo-500' },
];

export const STATUS_MAP: Record<CaseStatus, { label: string; color: string }> = 
    Object.fromEntries(STATUS_OPTIONS.map(opt => [opt.value, { label: opt.label, color: opt.color }])) as any;

import { CaseStatus, GeminiModel } from './types';

// Gemini Models List - Added Smart Routing as the default option
export const DEFAULT_GEMINI_MODELS: (GeminiModel | { id: string; name: string; description: string; limitRPD: number })[] = [
  { 
    id: 'auto', 
    name: 'التوجيه التلقائي الذكي (موصى به)', 
    limitRPD: 0, // Dynamic
    description: 'يختار النظام النموذج الأفضل لكل مهمة (Pro للبحث، Flash للصياغة) لضمان الدقة وتوفير الرصيد.' 
  },
  { 
    id: 'gemini-2.5-flash', 
    name: 'Gemini 2.5 Flash', 
    limitRPD: 250, 
    description: 'استخدام هذا النموذج لجميع المهام (سرعة عالية، استهلاك منخفض).' 
  },
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Gemini 3 Pro', 
    limitRPD: 50, 
    description: 'استخدام النموذج الأقوى لجميع المهام (دقة قصوى، استهلاك سريع للرصيد).' 
  },
  { 
    id: 'gemini-2.5-flash-lite', 
    name: 'Gemini 2.5 Flash-Lite', 
    limitRPD: 1000, 
    description: 'استخدام النموذج الأخف لجميع المهام (للمحادثات البسيطة جداً).' 
  }
];

/**
 * SMART ROUTING MAP
 * Logic used when "auto" mode is selected.
 */
export const AGENT_MODEL_ROUTING: Record<string, string> = {
  'analysis': 'gemini-2.5-flash',
  'research': 'gemini-3-pro-preview',
  'loopholes': 'gemini-3-pro-preview',
  'strategy': 'gemini-3-pro-preview',
  'drafting': 'gemini-2.5-flash',
  'contract_review': 'gemini-2.5-flash',
  'sharia_advisor': 'gemini-2.5-flash',
  'reconciliation': 'gemini-2.5-flash',
  'custody': 'gemini-2.5-flash',
  'alimony': 'gemini-2.5-flash',
  'interrogator': 'gemini-2.5-flash',
  'verifier': 'gemini-3-pro-preview',
  'forensic': 'gemini-3-pro-preview',
  'pixel_analysis': 'gemini-3-pro-preview',
  'ai_detect': 'gemini-3-pro-preview',
  'signature_verify': 'gemini-3-pro-preview',
  'image_comparison': 'gemini-3-pro-preview',
  'negotiator': 'gemini-3-pro-preview',
  'execution_minutes': 'gemini-2.5-flash'
};

/** اقتراحات مدموجة لأزرار الشريط المدني (تحليل / بحث وتدقيق / استراتيجية) */
const ANALYSIS_PROMPTS_MERGED = [
  'حلل الموقف القانوني بناءً على ما سبق.',
  'ما هو التكييف القانوني الصحيح لهذه الواقعة؟',
  'ما الأسئلة التي تكمل الوقائع الناقصة؟',
  'حلل العقد أو المستند المرفوع واذكر الملاحظات على البنود الظاهرة.',
  'ماذا يظهر في المرفق من مبالغ وتواريخ وأسماء، وما انطباقه القانوني؟',
];

const RESEARCH_PROMPTS_MERGED = [
  'ابحث عن نصوص قانونية تدعم موقفي في هذه القضية.',
  'هل هناك سوابق قضائية مشابهة لهذه الحالة؟',
  'تأكد من سريان القانون المذكور ومن عدم إلغائه أو تعديله.',
  'هل هذا النص القانوني محدث وفق المصادر الرسمية؟',
];

const STRATEGY_PROMPTS_MERGED = [
  'ضع خطة دفاع أو متابعة استراتيجية مرتبطة بوقائع الملف.',
  'ما هي نقاط القوة التي يجب التركيز عليها؟',
  'هل هناك تناقض أو ثغرة إجرائية يمكن استغلالها؟',
  'اقترح استراتيجية للتفاوض أو التسوية في هذه الحالة.',
];

export const AGENT_PROMPTS: Record<string, string[]> = {
  'analysis': ANALYSIS_PROMPTS_MERGED,
  'interrogator': ANALYSIS_PROMPTS_MERGED,
  'contract_review': ANALYSIS_PROMPTS_MERGED,
  'research': RESEARCH_PROMPTS_MERGED,
  'verifier': RESEARCH_PROMPTS_MERGED,
  'strategy': STRATEGY_PROMPTS_MERGED,
  'loopholes': STRATEGY_PROMPTS_MERGED,
  'negotiator': STRATEGY_PROMPTS_MERGED,
  'drafting': ["صغ لائحة دعوى بناءً على التحليل السابق.", "اكتب إخطاراً عدلياً يتضمن الوقائع المذكورة."],
  'execution_minutes': [
    'أعد محضر تنفيذ (شيك أو كمبيالة) من المحادثة والمرفقات، مع قسم المرفقات المطلوبة: الأصل + صورتان، وكالة بطوابع، وصل رسوم.',
    'راجع ما ناقص من مرفقات التنفيذ والبيانات قبل الطباعة.',
  ],
  'forensic': ["حلل المستند جنائياً واكتشف التلاعب.", "هل هناك شبهة تزوير في هذا التوقيع؟"],
  'pixel_analysis': ["افحص بكسلات الصورة بحثاً عن تعديل.", "هل تم التلاعب بمحتوى هذه الصورة رقمياً؟"],
  'ai_detect': ["هل تم توليد هذا المحتوى بالذكاء الاصطناعي؟", "ابحث عن علامات التزييف العميق."],
  'signature_verify': ["قارن بين التواقيع واكتشف الفروقات.", "هل هذا التوقيع أصلي أم مقلد؟"],
  'image_comparison': ["قارن بين النسخة الأصلية والمشتبه بها.", "استخرج الاختلافات الدقيقة بين الصورتين."],
  'sharia_advisor': ["ما الحكم الشرعي بناءً على حالة الزوجين المذكورة؟", "حساب المهر المؤجل وفقاً للتاريخ المذكور."],
  'reconciliation': ["كيف يمكن إصلاح ذات البين في هذه المشكلة؟", "اقترح حلاً للشقاق والنزاع القائم."],
  'custody': ["من الأحق بالحضانة في هذه الظروف؟", "ما هي ضوابط المشاهدة والاستضافة؟"],
  'alimony': ["احسب قيمة النفقة المستحقة تقديرياً.", "هل تستحق الزوجة نفقة عدة ومتعة؟"]
};

export const DEFAULT_OPENROUTER_MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (يدعم الصور)', supportsImages: true },
  { id: 'google/gemini-flash-1.5', name: 'Google: Gemini Flash 1.5 (يدعم الصور)', supportsImages: true },
  { id: 'anthropic/claude-3-haiku', name: 'Anthropic: Claude 3 Haiku (يدعم الصور)', supportsImages: true },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct', name: 'Meta: Llama 3.2 Vision (يدعم الصور)', supportsImages: true }
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

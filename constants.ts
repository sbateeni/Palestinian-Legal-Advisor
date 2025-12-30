
import { CaseStatus, ActionMode, GeminiModel } from './types';

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
  'interrogator': 'gemini-2.5-flash-lite',
  'verifier': 'gemini-3-pro-preview',
  'forensic': 'gemini-3-pro-preview',
  'pixel_analysis': 'gemini-3-pro-preview',
  'ai_detect': 'gemini-3-pro-preview',
  'signature_verify': 'gemini-3-pro-preview',
  'image_comparison': 'gemini-3-pro-preview',
  'negotiator': 'gemini-2.5-flash'
};

export const AGENT_PROMPTS: Record<string, string[]> = {
  'analysis': ["حلل الموقف القانوني بناءً على ما سبق.", "ما هو التكييف القانوني الصحيح لهذه الواقعة؟"],
  'loopholes': ["هل هناك تناقض في أقوال الخصم أو البينات؟", "ابحث عن ثغرات إجرائية في التبليغات."],
  'drafting': ["صغ لائحة دعوى بناءً على التحليل السابق.", "اكتب إخطاراً عدلياً يتضمن الوقائع المذكورة."],
  'strategy': ["ضع خطة دفاع استراتيجية للفوز.", "ما هي نقاط القوة التي يجب التركيز عليها؟"],
  'research': ["ابحث عن نصوص قانونية تدعم موقفي في هذه القضية.", "هل هناك سوابق قضائية مشابهة لهذه الحالة؟"],
  'verifier': ["تأكد من سريان القانون وعدم إلغائه.", "هل هذا النص القانوني محدث؟"],
  'interrogator': ["ما هي الأسئلة التي يجب طرحها على الموكل؟", "استخرج الوقائع الغامضة من القصة."],
  'contract_review': ["حلل هذا العقد واكتشف الثغرات.", "هل هناك بنود مجحفة في هذا الاتفاق؟"],
  'negotiator': ["اقترح استراتيجية للتفاوض والصلح.", "ما هي أفضل تسوية ممكنة في هذه الحالة؟"],
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

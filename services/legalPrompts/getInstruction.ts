import type { ActionMode, CaseType, LegalRegion } from '../../types';
import { getBaseInstruction } from './baseInstruction';
import { CONSULTATION_RESPONSE_PROTOCOL } from './protocols';
import {
    ANALYSIS_CLUSTER_INSTRUCTION,
    EXECUTION_MINUTES_INSTRUCTION,
    RESEARCH_CLUSTER_INSTRUCTION,
    STRATEGY_CLUSTER_INSTRUCTION,
} from './modeClusters';

export const getInstruction = (mode: ActionMode, region: LegalRegion, caseType: CaseType = 'chat') => {
    const base = getBaseInstruction(region, caseType);

    switch (mode) {
        case 'forensic':
            if (caseType === 'forgery') {
                return `${base}
${CONSULTATION_RESPONSE_PROTOCOL}
**الوضع: خبير الأدلة (مختبر التزوير)**
ابدأ مما يظهر في المرفق بصرياً أو نصاً، ثم الاستدلال على التلاعب أو التزوير المحتمل؛ لا محاضرة جنائية عامة بعيدة عن الملف.
`;
            }
            return `${base}\n${ANALYSIS_CLUSTER_INSTRUCTION}`;
        case 'analysis':
        case 'interrogator':
        case 'contract_review':
            return `${base}\n${ANALYSIS_CLUSTER_INSTRUCTION}`;
        case 'research':
        case 'verifier':
            return `${base}\n${RESEARCH_CLUSTER_INSTRUCTION}`;
        case 'strategy':
        case 'loopholes':
        case 'negotiator':
            return `${base}\n${STRATEGY_CLUSTER_INSTRUCTION}`;
        case 'drafting':
            return `${base}
${CONSULTATION_RESPONSE_PROTOCOL}
**الوضع: وكيل الصياغة (Flash Agent)**
حوّل النتائج السابقة إلى وثيقة رسمية. اذكر المواد في الدفوع **اقتباساً للإسناد** مع صياغة دعوى/عقد، لا شرحاً للمواد.
`;
        case 'execution_minutes':
            return `${base}\n${EXECUTION_MINUTES_INSTRUCTION}`;
        default: {
            const modeHints: Partial<Record<ActionMode, string>> = {
                sharia_advisor:
                    '**الوضع: المستشار الشرعي**\nركّز على أحوال شخصية فلسطينية سارية مع الربط بالوقائع.',
                reconciliation:
                    '**الوضع: المصلح الأسري**\nاقتراحات صلح ودية عملية مع مراعاة المصلحة والإطار القانوني.',
                custody:
                    '**الوضع: خبير الحضانة**\nمصلحة المحضون، الترتيب، المشاهدة — مرتبطاً بالوقائع المذكورة.',
                alimony:
                    '**الوضع: خبير النفقات**\nحسابات تقديرية واضحة مع بيان الافتراضات.',
            };
            const hint = modeHints[mode] ?? '';
            return [base, CONSULTATION_RESPONSE_PROTOCOL, hint].filter(Boolean).join('\n');
        }
    }
};

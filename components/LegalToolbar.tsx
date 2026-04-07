
import React from 'react';
import { ActionMode } from '../types';

interface LegalToolbarProps {
    currentMode: ActionMode;
    onModeChange: (mode: ActionMode) => void;
    disabled?: boolean;
}

/** أوضاع مدموجة لتقليل الارتباك: كل زر يغطي عدة مهام سابقة */
export const ACTION_MODES: { id: ActionMode; label: string; icon: React.ReactNode; color: string; description: string }[] = [
    {
        id: 'analysis',
        label: 'تحليل ووقائع',
        description: 'تحليل الموقف، أسئلة لاستكمال الوقائع، مراجعة عقود، وقراءة أدلة من المرفقات',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                />
            </svg>
        ),
        color: 'bg-blue-600 hover:bg-blue-500',
    },
    {
        id: 'research',
        label: 'بحث وتدقيق',
        description: 'استخراج نصوص من مصادر رسمية والتحقق من سريانها وتعديلاتها',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
        ),
        color: 'bg-purple-600 hover:bg-purple-500',
    },
    {
        id: 'strategy',
        label: 'استراتيجية وحلول',
        description: 'خطة عمل، كشف ثغرات محتملة، وتفاوض أو تسوية مرتبطة بالوقائع',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                    clipRule="evenodd"
                />
            </svg>
        ),
        color: 'bg-amber-600 hover:bg-amber-500',
    },
    {
        id: 'drafting',
        label: 'صياغة قانونية',
        description: 'لوائح دعوى، إخطارات، وصياغات رسمية مبنية على ما سبق في المحادثة',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path
                    fillRule="evenodd"
                    d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                    clipRule="evenodd"
                />
            </svg>
        ),
        color: 'bg-emerald-600 hover:bg-emerald-500',
    },
    {
        id: 'execution_minutes',
        label: 'محضر تنفيذ',
        description: 'شيك أو كمبيالة — محضر دائرة التنفيذ (رام الله) + قائمة المرفقات المطلوبة والنواقص',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                />
            </svg>
        ),
        color: 'bg-orange-700 hover:bg-orange-600',
    },
];

/** يحدد أي زر يُظهر كمفعّل عند بقاء وضع قديم في الحالة (مثلاً بعد التحديث) */
export function clusterModeForLegalToolbar(mode: ActionMode): ActionMode {
    if (mode === 'interrogator' || mode === 'contract_review' || mode === 'forensic') return 'analysis';
    if (mode === 'verifier') return 'research';
    if (mode === 'loopholes' || mode === 'negotiator') return 'strategy';
    if (ACTION_MODES.some((m) => m.id === mode)) return mode;
    return 'analysis';
}

const LegalToolbar: React.FC<LegalToolbarProps> = ({ currentMode, onModeChange, disabled }) => {
    const highlighted = clusterModeForLegalToolbar(currentMode);

    return (
        <div className="mb-3 bg-gray-700/30 p-2 rounded-xl overflow-x-auto scrollbar-hide">
            <div className="flex flex-wrap items-center gap-2">
                {ACTION_MODES.map((mode) => (
                    <button
                        key={mode.id}
                        type="button"
                        onClick={() => onModeChange(mode.id)}
                        disabled={disabled}
                        title={mode.description}
                        className={`flex items-center space-x-1.5 space-x-reverse px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            highlighted === mode.id
                                ? mode.color + ' text-white shadow-lg scale-105 ring-2 ring-white/20'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className={highlighted === mode.id ? 'animate-pulse' : ''}>{mode.icon}</span>
                        <span className="whitespace-nowrap">{mode.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LegalToolbar;

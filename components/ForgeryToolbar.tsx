
import React from 'react';
import { ActionMode } from '../types';

interface ForgeryToolbarProps {
    currentMode: ActionMode;
    onModeChange: (mode: ActionMode) => void;
    disabled?: boolean;
}

export const FORGERY_MODES: { id: ActionMode; label: string; icon: React.ReactNode; color: string; description: string }[] = [
    {
        id: 'pixel_analysis',
        label: 'تحليل البكسل',
        description: 'الكشف عن التعديلات الرقمية والقص واللصق',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.9-1.35a1 1 0 00-.16-1.22l-2.22-2.22a1 1 0 00-1.415 0l-1.183 1.184-1.382-1.383a1 1 0 00-1.414 0L3 13.586V5zM3 16.414l3.293-3.293 1.293 1.293a1 1 0 001.414 0l1.586-1.586 1.707 2.56h.707a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1h2.586L3 16.414z" clipRule="evenodd" /></svg>,
        color: 'bg-red-700 hover:bg-red-600',
    },
    {
        id: 'image_comparison',
        label: 'مطابقة الصور',
        description: 'مقارنة صورتين (أصل/مزور) وكشف الاختلافات الدقيقة',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" /></svg>,
        color: 'bg-indigo-600 hover:bg-indigo-500',
    },
    {
        id: 'ai_detect',
        label: 'صائد AI',
        description: 'اكتشاف التوليد بالذكاء الاصطناعي (Deepfakes)',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" /></svg>,
        color: 'bg-purple-700 hover:bg-purple-600',
    },
    {
        id: 'signature_verify',
        label: 'مضاهاة التواقيع',
        description: 'تحليل الانسيابية والضغط للكشف عن التقليد',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" clipRule="evenodd" /></svg>,
        color: 'bg-orange-700 hover:bg-orange-600',
    },
    {
        id: 'forensic',
        label: 'تقرير شامل',
        description: 'تحليل فني وقانوني شامل للمستند',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
        color: 'bg-gray-700 hover:bg-gray-600',
    }
];

const ForgeryToolbar: React.FC<ForgeryToolbarProps> = ({ currentMode, onModeChange, disabled }) => {
    return (
        <div className="mb-3 bg-red-900/10 p-2 rounded-xl overflow-x-auto scrollbar-hide border-b-2 border-red-600/30">
            <div className="flex items-center gap-2 min-w-max">
                {FORGERY_MODES.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => onModeChange(mode.id)}
                        disabled={disabled}
                        title={mode.description}
                        className={`flex items-center space-x-1.5 space-x-reverse px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            currentMode === mode.id 
                                ? mode.color + ' text-white shadow-lg scale-105 ring-2 ring-red-400/30' 
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className={currentMode === mode.id ? 'animate-pulse' : ''}>{mode.icon}</span>
                        <span className="whitespace-nowrap">{mode.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ForgeryToolbar;

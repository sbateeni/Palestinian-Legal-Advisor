
import React from 'react';
import { ActionMode } from '../types';

interface ShariaToolbarProps {
    currentMode: ActionMode;
    onModeChange: (mode: ActionMode) => void;
    disabled?: boolean;
}

export const SHARIA_MODES: { id: ActionMode; label: string; icon: React.ReactNode; color: string; description: string }[] = [
    {
        id: 'sharia_advisor',
        label: 'المستشار الشرعي',
        description: 'تحليل قضايا الزواج والطلاق والميراث حسب الأحوال الشخصية',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" /></svg>,
        color: 'bg-emerald-700 hover:bg-emerald-600',
    },
    {
        id: 'reconciliation',
        label: 'المصلح الأسري',
        description: 'التحكيم والصلح وحل النزاعات ودياً (الشقاق والنزاع)',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>,
        color: 'bg-teal-600 hover:bg-teal-500',
    },
    {
        id: 'custody',
        label: 'خبير الحضانة',
        description: 'ترتيب الحاضنات، المشاهدة، السن القانوني، ومصلحة المحضون',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>,
        color: 'bg-cyan-600 hover:bg-cyan-500',
    },
    {
        id: 'alimony',
        label: 'خبير النفقات',
        description: 'حساب نفقة الزوجة والصغار، المهر المؤجل، والتعويضات',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>,
        color: 'bg-amber-600 hover:bg-amber-500',
    }
];

const ShariaToolbar: React.FC<ShariaToolbarProps> = ({ currentMode, onModeChange, disabled }) => {
    return (
        <div className="mb-3 bg-gray-700/30 p-2 rounded-xl overflow-x-auto scrollbar-hide border-b-2 border-emerald-600/30">
            <div className="flex items-center gap-2 min-w-max">
                {SHARIA_MODES.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => onModeChange(mode.id)}
                        disabled={disabled}
                        title={mode.description}
                        className={`flex items-center space-x-1.5 space-x-reverse px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            currentMode === mode.id 
                                ? mode.color + ' text-white shadow-lg scale-105 ring-2 ring-emerald-400/30' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
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

export default ShariaToolbar;

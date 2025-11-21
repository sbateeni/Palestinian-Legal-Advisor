
import React from 'react';
import { Case, CaseStatus } from '../../types';
import { STATUS_OPTIONS, STATUS_MAP } from '../../constants';

interface CaseListItemProps {
    caseItem: Case;
    handleStatusChange: (id: string, status: CaseStatus) => void;
    deleteCase: (id: string) => void;
    onNavigate: (id: string) => void;
}

const CaseListItem: React.FC<CaseListItemProps> = ({
    caseItem,
    handleStatusChange,
    deleteCase,
    onNavigate
}) => {
    return (
        <div onClick={() => onNavigate(caseItem.id)} className="rounded-md p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-700/60 cursor-pointer transition-colors duration-200">
            <div className="flex-grow mb-3 sm:mb-0 sm:me-4 w-full">
                <h2 className="text-lg font-semibold text-gray-100 line-clamp-1">{caseItem.title}</h2>
                <p className="text-sm text-gray-400 mt-1 line-clamp-1">{caseItem.summary}</p>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse w-full sm:w-auto justify-between sm:justify-end">
                <select
                    value={caseItem.status}
                    onChange={(e) => handleStatusChange(caseItem.id, e.target.value as CaseStatus)}
                    onClick={(e) => e.stopPropagation()}
                    className={`bg-gray-700 border-none rounded p-1 text-xs focus:ring-2 focus:ring-blue-500 ${STATUS_MAP[caseItem.status]?.color.includes('yellow') ? 'text-gray-900' : 'text-white'}`}
                    style={{ backgroundColor: STATUS_MAP[caseItem.status]?.color.startsWith('bg-') ? '' : STATUS_MAP[caseItem.status]?.color }}
                >
                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>

                <p className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(caseItem.createdAt).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
                <button
                    onClick={(e) => { e.stopPropagation(); deleteCase(caseItem.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-900/50 rounded-full transition-colors"
                    aria-label="حذف القضية"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default CaseListItem;

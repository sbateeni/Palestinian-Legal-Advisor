
import React, { RefObject } from 'react';
import { Case, CaseStatus } from '../../types';
import { STATUS_OPTIONS, STATUS_MAP } from '../../constants';

interface CaseGridItemProps {
    caseItem: Case;
    editingCaseId: string | null;
    newTitle: string;
    setNewTitle: (title: string) => void;
    handleEditClick: (caseItem: Case) => void;
    handleSaveTitle: (id: string) => void;
    handleTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, id: string) => void;
    titleInputRef: RefObject<HTMLInputElement | null>;
    openStatusMenu: string | null;
    setOpenStatusMenu: (id: string | null) => void;
    handleStatusChange: (id: string, status: CaseStatus) => void;
    deleteCase: (id: string) => void;
    onNavigate: (id: string) => void;
    statusMenuRef: RefObject<HTMLDivElement | null>;
}

const CaseGridItem: React.FC<CaseGridItemProps> = ({
    caseItem,
    editingCaseId,
    newTitle,
    setNewTitle,
    handleEditClick,
    handleSaveTitle,
    handleTitleKeyDown,
    titleInputRef,
    openStatusMenu,
    setOpenStatusMenu,
    handleStatusChange,
    deleteCase,
    onNavigate,
    statusMenuRef
}) => {
    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col justify-between hover:shadow-blue-500/20 transition-shadow duration-300">
            <div>
                <div className="flex items-start justify-between mb-3">
                    {editingCaseId === caseItem.id ? (
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onBlur={() => handleSaveTitle(caseItem.id)}
                            onKeyDown={(e) => handleTitleKeyDown(e, caseItem.id)}
                            className="w-full bg-gray-600 text-gray-100 p-1 rounded text-xl font-semibold"
                        />
                    ) : (
                        <h2 className="text-xl font-semibold text-gray-100 break-words w-full me-2 cursor-pointer hover:text-blue-400" onClick={() => onNavigate(caseItem.id)}>
                            {caseItem.title}
                        </h2>
                    )}
                    <button onClick={() => editingCaseId === caseItem.id ? handleSaveTitle(caseItem.id) : handleEditClick(caseItem)} className="p-1 text-gray-400 hover:text-white flex-shrink-0">
                        {editingCaseId === caseItem.id ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                        )}
                    </button>
                </div>
                <div className="relative inline-block text-left mb-3">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setOpenStatusMenu(openStatusMenu === caseItem.id ? null : caseItem.id); }} 
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center space-x-1.5 space-x-reverse ${STATUS_MAP[caseItem.status]?.color || 'bg-gray-500'} ${STATUS_MAP[caseItem.status]?.color.includes('yellow') ? 'text-gray-900' : 'text-white'}`}
                    >
                        <span>{STATUS_MAP[caseItem.status]?.label}</span>
                        <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {openStatusMenu === caseItem.id && (
                        <div ref={statusMenuRef} className="absolute top-full start-0 mt-2 w-36 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-20">
                            {STATUS_OPTIONS.map(option => (
                                <button 
                                    key={option.value} 
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(caseItem.id, option.value); setOpenStatusMenu(null); }} 
                                    className="block w-full text-right px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-600"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-gray-900 border border-gray-700 rounded-md p-3 my-4">
                    <p className="text-gray-300 text-sm break-words line-clamp-3 leading-relaxed">{caseItem.summary}</p>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                    تاريخ الإنشاء: {new Date(caseItem.createdAt).toLocaleString('ar-EG')}
                </p>
            </div>
            <div className="flex justify-between items-center mt-2">
                <button onClick={() => onNavigate(caseItem.id)} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors">
                    فتح
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteCase(caseItem.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors" aria-label="حذف القضية">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    );
};

export default CaseGridItem;

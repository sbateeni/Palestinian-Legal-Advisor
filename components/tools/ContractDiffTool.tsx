
import React, { useState } from 'react';
import { computeDiff } from '../../utils/diffEngine';

const ContractDiffTool: React.FC = () => {
    const [oldText, setOldText] = useState('');
    const [newText, setNewText] = useState('');
    const [showDiff, setShowDiff] = useState(false);

    const diffParts = showDiff ? computeDiff(oldText, newText) : [];

    return (
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-teal-300 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 me-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                مقارنة العقود والنصوص (Diff Tool)
            </h2>
            
            {!showDiff ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">النص الأصلي</label>
                        <textarea 
                            value={oldText} 
                            onChange={(e) => setOldText(e.target.value)} 
                            className="w-full h-64 p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm leading-relaxed"
                            placeholder="الصق النص القديم هنا..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">النص المعدل / الجديد</label>
                        <textarea 
                            value={newText} 
                            onChange={(e) => setNewText(e.target.value)} 
                            className="w-full h-64 p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm leading-relaxed"
                            placeholder="الصق النص الجديد هنا..."
                        />
                    </div>
                    <div className="md:col-span-2">
                        <button 
                            onClick={() => setShowDiff(true)}
                            disabled={!oldText || !newText}
                            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            مقارنة النصوص وإظهار الفروقات
                        </button>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-200">نتيجة المقارنة</h3>
                        <button onClick={() => setShowDiff(false)} className="text-sm text-blue-400 hover:text-blue-300 underline">إجراء مقارنة جديدة</button>
                    </div>
                    
                    <div className="bg-white text-gray-900 p-6 rounded-lg border border-gray-300 leading-8 text-lg font-serif shadow-inner min-h-[300px] whitespace-pre-wrap">
                        {diffParts.map((part, index) => (
                            <span 
                                key={index} 
                                className={`${part.added ? 'bg-green-200 text-green-900 font-bold px-1 rounded mx-0.5' : ''} ${part.removed ? 'bg-red-200 text-red-900 line-through px-1 rounded mx-0.5 opacity-70' : ''}`}
                            >
                                {part.value}
                            </span>
                        ))}
                    </div>
                    
                    <div className="mt-4 flex gap-4 text-sm text-gray-400">
                        <div className="flex items-center"><span className="w-4 h-4 bg-green-200 rounded me-2"></span> نص مضاف</div>
                        <div className="flex items-center"><span className="w-4 h-4 bg-red-200 rounded me-2 line-through text-red-900">نص محذوف</span> نص محذوف</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractDiffTool;

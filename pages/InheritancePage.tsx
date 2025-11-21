
import React from 'react';
import { useInheritanceLogic } from '../hooks/useInheritanceLogic';
import { InheritanceInput } from '../types';

const InheritancePage: React.FC = () => {
    const {
        cases,
        selectedCaseId, setSelectedCaseId,
        inputs, handleInputChange,
        handleExtractFromCase,
        isExtracting,
        calculate,
        results,
        error
    } = useInheritanceLogic();

    return (
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500 me-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                حاسبة المواريث الذكية
            </h1>

            {/* AI Extraction Section */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-emerald-300 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        الاستخلاص الذكي من القضايا
                    </h2>
                    <span className="text-xs bg-emerald-900/50 text-emerald-200 px-2 py-1 rounded border border-emerald-500/20">AI Powered</span>
                </div>
                <div className="flex gap-4 flex-col sm:flex-row">
                    <select 
                        value={selectedCaseId} 
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                        className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        <option value="">-- اختر قضية سابقة لملء البيانات تلقائياً --</option>
                        {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <button 
                        onClick={handleExtractFromCase} 
                        disabled={!selectedCaseId || isExtracting}
                        className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:bg-gray-600 transition-colors flex items-center justify-center sm:w-auto w-full"
                    >
                        {isExtracting ? (
                            <>
                                <svg className="animate-spin h-5 w-5 me-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                جاري التحليل...
                            </>
                        ) : "استخلاص البيانات"}
                    </button>
                </div>
                {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-800 rounded-xl shadow p-6">
                        <h3 className="text-lg font-medium text-gray-200 mb-4 border-b border-gray-700 pb-2">بيانات التركة</h3>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm text-gray-400 mb-1">الديانة / النظام</label>
                                <div className="flex bg-gray-700 rounded p-1">
                                    <button onClick={() => handleInputChange('religion', 'muslim')} className={`flex-1 py-1 rounded text-sm ${inputs.religion === 'muslim' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}>إسلامي</button>
                                    <button onClick={() => handleInputChange('religion', 'christian')} className={`flex-1 py-1 rounded text-sm ${inputs.religion === 'christian' ? 'bg-blue-600 text-white' : 'text-gray-300'}`}>مسيحي (مدني)</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">قيمة التركة (الصافي)</label>
                                <div className="flex">
                                    <input type="number" value={inputs.estateValue} onChange={(e) => handleInputChange('estateValue', Number(e.target.value))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-s-lg text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                    <select value={inputs.currency} onChange={(e) => handleInputChange('currency', e.target.value)} className="bg-gray-600 border border-gray-500 rounded-e-lg px-3 text-white outline-none">
                                        <option value="JOD">JOD</option>
                                        <option value="NIS">NIS</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl shadow p-6">
                        <h3 className="text-lg font-medium text-gray-200 mb-4 border-b border-gray-700 pb-2">الورثة (الأعداد)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'زوج', key: 'husband', max: 1 },
                                { label: 'زوجة', key: 'wife', max: 4 },
                                { label: 'ابن', key: 'son', max: 20 },
                                { label: 'بنت', key: 'daughter', max: 20 },
                                { label: 'أب', key: 'father', max: 1 },
                                { label: 'أم', key: 'mother', max: 1 },
                                { label: 'أخ شقيق', key: 'brotherFull', max: 10 },
                                { label: 'أخت شقيقة', key: 'sisterFull', max: 10 },
                            ].map((field) => (
                                <div key={field.key}>
                                    <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max={field.max}
                                        value={inputs[field.key as keyof InheritanceInput] as number}
                                        onChange={(e) => handleInputChange(field.key as keyof InheritanceInput, Number(e.target.value))}
                                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={calculate} className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 transition-all">
                        احسب الميراث
                    </button>
                </div>

                {/* Results Section */}
                <div className="lg:col-span-2 bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col">
                    <h3 className="text-xl font-bold text-gray-100 mb-6 flex items-center justify-between">
                        <span>نتائج القسمة الشرعية/القانونية</span>
                        {results && <span className="text-sm font-normal text-gray-400 bg-gray-700 px-3 py-1 rounded-full">إجمالي التركة: {results.totalValue.toLocaleString()} {inputs.currency}</span>}
                    </h3>

                    {!results ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            <p>أدخل البيانات واضغط "احسب" لعرض الجدول</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-gray-700 text-gray-300">
                                        <th className="p-3 rounded-tr-lg">الوارث</th>
                                        <th className="p-3">العدد</th>
                                        <th className="p-3">الفرض/السهم</th>
                                        <th className="p-3">النسبة (%)</th>
                                        <th className="p-3 rounded-tl-lg">القيمة ({inputs.currency})</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {results.heirs.map((heir, idx) => (
                                        <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                                            <td className="p-3 font-medium text-blue-200">
                                                {heir.type}
                                                {heir.notes && <span className="block text-[10px] text-gray-500">{heir.notes}</span>}
                                            </td>
                                            <td className="p-3 text-gray-300">{heir.count}</td>
                                            <td className="p-3 text-amber-400 font-mono dir-ltr text-end">{heir.shareFraction}</td>
                                            <td className="p-3 text-gray-300">{heir.sharePercentage.toFixed(2)}%</td>
                                            <td className="p-3 font-bold text-emerald-400">{heir.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    {results.heirs.length === 0 && (
                                        <tr><td colSpan={5} className="p-4 text-center text-gray-500">لا يوجد ورثة مستحقين وفقاً للبيانات المدخلة</td></tr>
                                    )}
                                </tbody>
                                <tfoot className="border-t-2 border-gray-600">
                                    <tr>
                                        <td colSpan={4} className="p-3 font-bold text-gray-200">المجموع الموزع</td>
                                        <td className="p-3 font-bold text-emerald-400">
                                            {results.heirs.reduce((acc, h) => acc + h.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                            {inputs.religion === 'muslim' && (
                                <p className="mt-4 text-xs text-gray-500 bg-gray-900/30 p-2 rounded border border-gray-700">
                                    * تنبيه: هذه الحسابات تقديرية وفق المذهب السني المعمول به غالباً في المحاكم الشرعية الفلسطينية. قد توجد حالات خاصة (العول، الرد، الوصية الواجبة) تتطلب تدقيقاً من قاضٍ شرعي.
                                </p>
                            )}
                             {inputs.religion === 'christian' && (
                                <p className="mt-4 text-xs text-gray-500 bg-gray-900/30 p-2 rounded border border-gray-700">
                                    * تنبيه: تم تطبيق مبدأ المساواة المدنية أو التوزيع الشائع. قوانين الطوائف المسيحية في فلسطين قد تختلف حسب الكنيسة (لاتين، روم أرثوذكس، إلخ). يرجى مراجعة المحكمة الكنسية المختصة.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InheritancePage;

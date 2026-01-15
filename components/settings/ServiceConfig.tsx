
import React from 'react';
import { ApiSource, OpenRouterModel } from '../../types';
import { DEFAULT_GEMINI_MODELS } from '../../constants';

interface ServiceConfigProps {
    apiSource: ApiSource;
    handleApiSourceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    geminiModelId: string;
    handleGeminiModelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    openRouterInputValue: string;
    setOpenRouterInputValue: (val: string) => void;
    handleSaveOpenRouterKey: () => void;
    openRouterSaved: boolean;
    openRouterModelId: string;
    handleModelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    openRouterModels: OpenRouterModel[];
    newModelId: string;
    setNewModelId: (val: string) => void;
    newModelSupportsImages: boolean;
    setNewModelSupportsImages: (val: boolean) => void;
    handleAddModel: () => void;
    handleDeleteModel: (id: string) => void;
}

const ServiceConfig: React.FC<ServiceConfigProps> = ({
    apiSource, handleApiSourceChange,
    geminiModelId, handleGeminiModelChange,
    openRouterInputValue, setOpenRouterInputValue, handleSaveOpenRouterKey, openRouterSaved,
    openRouterModelId, handleModelChange, openRouterModels,
    newModelId, setNewModelId, newModelSupportsImages, setNewModelSupportsImages, handleAddModel, handleDeleteModel
}) => {
    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-100 mb-4">إعدادات مزود الخدمة</h2>
            <div className="mb-8">
                <label htmlFor="api-source" className="block text-lg font-medium text-gray-200 mb-2">مزود خدمة الذكاء الاصطناعي</label>
                <select id="api-source" value={apiSource} onChange={handleApiSourceChange} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="gemini">Google Gemini</option>
                    <option value="openrouter">OpenRouter</option>
                </select>
            </div>

            {apiSource === 'gemini' && (
                <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-xl font-semibold text-gray-200 mb-2">إعدادات Google Gemini</h3>
                    
                    <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600/50 rounded-lg text-blue-200 text-xs leading-relaxed">
                        <div className="flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                            <div>
                                <strong className="block mb-1">إدارة المفتاح:</strong>
                                يتم إدارة مفتاح Gemini تلقائياً من خلال البيئة المحيطة (AI Studio). لا يتطلب التطبيق إدخال المفتاح يدوياً هنا لضمان الأمان والامتثال لسياسات Google.
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="gemini-model" className="block text-lg font-medium text-gray-200 mb-2">اختر نموذج Gemini</label>
                        <select 
                            id="gemini-model" 
                            value={geminiModelId} 
                            onChange={handleGeminiModelChange} 
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            {DEFAULT_GEMINI_MODELS.map(model => (
                                <option key={model.id} value={model.id}>{model.name} - {model.description}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {apiSource === 'openrouter' && (
                <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-xl font-semibold text-gray-200 mb-2">إعدادات OpenRouter</h3>
                    <div className="mb-6">
                        <div className="flex justify-between items-end mb-2">
                             <label htmlFor="openrouter-api-key" className="block text-lg font-medium text-gray-200">OpenRouter API Key</label>
                             <a 
                                href="https://openrouter.ai/keys" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-3 py-1 text-xs font-medium bg-indigo-900/30 text-indigo-300 border border-indigo-500/30 rounded hover:bg-indigo-900/50 hover:text-indigo-200 transition-colors flex items-center shadow-sm"
                            >
                                <span className="me-1">🔑</span>
                                <span>احصل على المفتاح</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ms-1 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                        </div>
                        <input type="password" id="openrouter-api-key" value={openRouterInputValue} onChange={(e) => setOpenRouterInputValue(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="sk-or-..." />
                    </div>
                    <div className="flex items-center justify-end mb-6">
                        {openRouterSaved && <span className="text-green-400 me-4 transition-opacity duration-300">تم حفظ المفتاح!</span>}
                        <button onClick={handleSaveOpenRouterKey} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors">حفظ مفتاح OpenRouter</button>
                    </div>
                    <div className="mt-8 border-t border-gray-700 pt-6">
                        <label htmlFor="openrouter-model" className="block text-lg font-medium text-gray-200 mb-2">نموذج OpenRouter</label>
                        <select id="openrouter-model" value={openRouterModelId} onChange={handleModelChange} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            {openRouterModels.map(model => (
                                <option key={model.id} value={model.id}>{model.name} {model.supportsImages ? '(يدعم الصور)' : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceConfig;

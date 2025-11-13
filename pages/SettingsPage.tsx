import React, { useState, useRef, useEffect } from 'react';
import { ApiSource, Case } from '../types';
import * as dbService from '../services/dbService';
import { OPENROUTER_FREE_MODELS } from '../constants';

const SettingsPage: React.FC = () => {
  const [apiSource, setApiSource] = useState<ApiSource>('gemini');
  
  // Gemini states
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiInputValue, setGeminiInputValue] = useState('');
  const [geminiSaved, setGeminiSaved] = useState(false);
  
  // OpenRouter states
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState<string>(OPENROUTER_FREE_MODELS[0].id);
  const [openRouterInputValue, setOpenRouterInputValue] = useState<string>('');
  const [openRouterSaved, setOpenRouterSaved] = useState<boolean>(false);
  
  // Data management states
  const [casesCount, setCasesCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSettings = async () => {
      // Load common settings
      const storedApiSource = await dbService.getSetting<ApiSource>('apiSource');
      if (storedApiSource) setApiSource(storedApiSource);

      // Load Gemini settings
      const storedGeminiKey = await dbService.getSetting<string>('geminiApiKey');
      if (storedGeminiKey) {
        setGeminiApiKey(storedGeminiKey);
        setGeminiInputValue(storedGeminiKey);
      }
      
      // Load OpenRouter settings
      const storedOpenRouterKey = await dbService.getSetting<string>('openRouterApiKey');
      const storedModel = await dbService.getSetting<string>('openRouterModel');
      if (storedOpenRouterKey) {
        setOpenRouterApiKey(storedOpenRouterKey);
        setOpenRouterInputValue(storedOpenRouterKey);
      }
      if (storedModel) setOpenRouterModel(storedModel);

      // Load data stats
      const allCases = await dbService.getAllCases();
      setCasesCount(allCases.length);
    };
    loadSettings();
  }, []);

  const handleSaveGeminiKey = async () => {
    await dbService.setSetting({ key: 'geminiApiKey', value: geminiInputValue });
    setGeminiApiKey(geminiInputValue);
    setGeminiSaved(true);
    setTimeout(() => setGeminiSaved(false), 3000);
  };

  const handleSaveOpenRouterKey = async () => {
    await dbService.setSetting({ key: 'openRouterApiKey', value: openRouterInputValue });
    setOpenRouterApiKey(openRouterInputValue);
    setOpenRouterSaved(true);
    setTimeout(() => setOpenRouterSaved(false), 3000);
  };

  const handleApiSourceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSource = e.target.value as ApiSource;
    await dbService.setSetting({ key: 'apiSource', value: newSource });
    setApiSource(newSource);
  };

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setOpenRouterModel(newModel);
    await dbService.setSetting({ key: 'openRouterModel', value: newModel });
  };

  const handleClearCases = async () => {
    if (window.confirm("هل أنت متأكد من حذف جميع القضايا؟ لا يمكن التراجع عن هذا الإجراء.")) {
        await dbService.clearCases();
        setCasesCount(0);
        alert("تم حذف جميع القضايا بنجاح.");
    }
  };

  const handleExport = async () => {
    const allCases = await dbService.getAllCases();
    const dataStr = JSON.stringify(allCases, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.download = `pal-law-cases-backup-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File content is not readable.");
            const importedCases = JSON.parse(text) as Case[];

            if (Array.isArray(importedCases) && importedCases.every(c => c.id && c.title && c.chatHistory)) {
                if (window.confirm(`هل أنت متأكد من استيراد ${importedCases.length} قضية؟ سيتم استبدال جميع القضايا الحالية.`)) {
                    await dbService.clearCases();
                    for (const caseItem of importedCases) {
                        await dbService.addCase(caseItem);
                    }
                    setCasesCount(importedCases.length);
                    alert("تم استيراد القضايا بنجاح!");
                }
            } else {
                throw new Error("ملف JSON غير صالح أو لا يطابق البنية المطلوبة.");
            }
        } catch (error) {
            console.error("Error importing data:", error);
            alert(`فشل استيراد الملف: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-3">الإعدادات</h1>
      
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-100 mb-4">إعدادات مزود الخدمة</h2>
        <div className="mb-8">
          <label htmlFor="api-source" className="block text-lg font-medium text-gray-200 mb-2">
            مزود خدمة الذكاء الاصطناعي
          </label>
          <p className="text-sm text-gray-400 mb-3">
            اختر مزود الخدمة الذي ترغب في استخدامه.
          </p>
          <select
            id="api-source"
            value={apiSource}
            onChange={handleApiSourceChange}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="gemini">Google Gemini</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        {apiSource === 'gemini' && (
            <div className="border-t border-gray-700 pt-6">
                <h3 className="text-xl font-semibold text-gray-200 mb-2">إعدادات Google Gemini</h3>
                <p className="text-sm text-gray-400 mb-3">
                    يمكنك إما استخدام نافذة Google AI Studio المنبثقة (إذا كانت متاحة) أو إدخال مفتاح API الخاص بك يدويًا هنا. المفتاح اليدوي له الأولوية.
                </p>
                 <div className="mb-4">
                    <label htmlFor="gemini-api-key" className="block text-lg font-medium text-gray-200 mb-2">
                        Google Gemini API Key
                    </label>
                    <input
                        type="password"
                        id="gemini-api-key"
                        value={geminiInputValue}
                        onChange={(e) => setGeminiInputValue(e.target.value)}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="أدخل مفتاح Gemini API هنا..."
                    />
                 </div>
                 <div className="flex items-center justify-end">
                    {geminiSaved && (
                        <span className="text-green-400 me-4 transition-opacity duration-300">
                        تم حفظ المفتاح!
                        </span>
                    )}
                    <button
                        onClick={handleSaveGeminiKey}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
                    >
                        حفظ مفتاح Gemini
                    </button>
                 </div>
            </div>
        )}

        {apiSource === 'openrouter' && (
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-xl font-semibold text-gray-200 mb-2">إعدادات OpenRouter</h3>
            <div className="mb-6">
              <label htmlFor="openrouter-api-key" className="block text-lg font-medium text-gray-200 mb-2">
                OpenRouter API Key
              </label>
              <p className="text-sm text-gray-400 mb-3">
                أدخل مفتاح API الخاص بك لـ OpenRouter. سيتم حفظه في متصفحك. يمكنك الحصول على مفتاح من <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">هنا</a>.
              </p>
              <input
                type="password"
                id="openrouter-api-key"
                value={openRouterInputValue}
                onChange={(e) => setOpenRouterInputValue(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="sk-or-..."
              />
            </div>

            <div className="flex items-center justify-end mb-6">
              {openRouterSaved && (
                <span className="text-green-400 me-4 transition-opacity duration-300">
                  تم حفظ المفتاح!
                </span>
              )}
              <button
                onClick={handleSaveOpenRouterKey}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
              >
                حفظ مفتاح OpenRouter
              </button>
            </div>
            
            <div className="mt-8 border-t border-gray-700 pt-6">
                <label htmlFor="openrouter-model" className="block text-lg font-medium text-gray-200 mb-2">
                    نموذج OpenRouter
                </label>
                <p className="text-sm text-gray-400 mb-3">
                    اختر النموذج المجاني الذي ترغب باستخدامه. النماذج التي تدعم تحليل الصور محددة. يتم الحفظ تلقائياً عند الاختيار.
                </p>
                <select
                    id="openrouter-model"
                    value={openRouterModel}
                    onChange={handleModelChange}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    {OPENROUTER_FREE_MODELS.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                </select>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-100 mb-4">إدارة البيانات</h2>
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center p-4 border border-gray-600 bg-gray-900/30 rounded-lg">
                <div>
                    <h3 className="text-lg font-medium text-gray-200">تصدير/استيراد البيانات</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        حفظ جميع القضايا في ملف JSON أو استيرادها من ملف.
                    </p>
                </div>
                <div className="flex gap-x-2 mt-4 md:mt-0 md:ms-6">
                    <button onClick={handleExport} disabled={casesCount === 0} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex-shrink-0">تصدير الكل</button>
                    <button onClick={handleImportClick} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex-shrink-0">استيراد</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center p-4 border border-red-500/30 bg-red-500/10 rounded-lg">
                <div>
                    <h3 className="text-lg font-medium text-red-300">حذف جميع القضايا</h3>
                    <p className="text-sm text-red-400 mt-1">
                        سيؤدي هذا الإجراء إلى حذف جميع القضايا والمحادثات المحفوظة نهائيًا.
                    </p>
                </div>
                <button
                    onClick={handleClearCases}
                    disabled={casesCount === 0}
                    className="mt-4 md:mt-0 md:ms-6 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                    حذف الكل
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
import React, { useState, useRef, useEffect } from 'react';
import { ApiSource, Case, OpenRouterModel } from '../types';
import * as dbService from '../services/dbService';
import { DEFAULT_OPENROUTER_MODELS } from '../constants';

const SettingsPage: React.FC = () => {
  const [apiSource, setApiSource] = useState<ApiSource>('gemini');
  
  // Gemini states
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiInputValue, setGeminiInputValue] = useState('');
  const [geminiSaved, setGeminiSaved] = useState(false);
  
  // OpenRouter states
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [openRouterModelId, setOpenRouterModelId] = useState<string>(DEFAULT_OPENROUTER_MODELS[0].id);
  const [openRouterInputValue, setOpenRouterInputValue] = useState<string>('');
  const [openRouterSaved, setOpenRouterSaved] = useState<boolean>(false);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>(DEFAULT_OPENROUTER_MODELS);
  const [newModelId, setNewModelId] = useState('');
  const [newModelSupportsImages, setNewModelSupportsImages] = useState(false);
  
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
      const storedModelId = await dbService.getSetting<string>('openRouterModel');
      const storedCustomModels = await dbService.getSetting<OpenRouterModel[]>('openRouterModels');
      
      const availableModels = storedCustomModels && storedCustomModels.length > 0 ? storedCustomModels : DEFAULT_OPENROUTER_MODELS;
      setOpenRouterModels(availableModels);

      if (storedModelId && availableModels.some(m => m.id === storedModelId)) {
        setOpenRouterModelId(storedModelId);
      } else {
        // If nothing is stored or stored model is no longer valid, default to the first model.
        setOpenRouterModelId(availableModels[0]?.id || '');
      }

      if (storedOpenRouterKey) {
        setOpenRouterApiKey(storedOpenRouterKey);
        setOpenRouterInputValue(storedOpenRouterKey);
      }

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
    setOpenRouterModelId(newModel);
    await dbService.setSetting({ key: 'openRouterModel', value: newModel });
  };

  const handleAddModel = async () => {
    const trimmedId = newModelId.trim();
    if (!trimmedId) {
        alert("يرجى إدخال معرف النموذج.");
        return;
    }
    if (openRouterModels.some(m => m.id === trimmedId)) {
        alert("هذا النموذج موجود بالفعل.");
        return;
    }

    const newModel: OpenRouterModel = {
        id: trimmedId,
        name: trimmedId, // Use ID as name for simplicity
        supportsImages: newModelSupportsImages,
    };

    const updatedModels = [...openRouterModels, newModel];
    setOpenRouterModels(updatedModels);
    await dbService.setSetting({ key: 'openRouterModels', value: updatedModels });

    setNewModelId('');
    setNewModelSupportsImages(false);
  };

  const handleDeleteModel = async (idToDelete: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف النموذج: ${idToDelete}؟`)) return;

    const updatedModels = openRouterModels.filter(m => m.id !== idToDelete);
    setOpenRouterModels(updatedModels);
    await dbService.setSetting({ key: 'openRouterModels', value: updatedModels });

    // If the deleted model was the selected one, select the first available model
    if (openRouterModelId === idToDelete) {
        const newSelectedModel = updatedModels.length > 0 ? updatedModels[0].id : '';
        setOpenRouterModelId(newSelectedModel);
        await dbService.setSetting({ key: 'openRouterModel', value: newSelectedModel });
    }
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
                    اختر النموذج الذي ترغب باستخدامه. يتم الحفظ تلقائياً عند الاختيار.
                </p>
                <select
                    id="openrouter-model"
                    value={openRouterModelId}
                    onChange={handleModelChange}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    {openRouterModels.map(model => (
                    <option key={model.id} value={model.id}>{model.name} {model.supportsImages ? '(يدعم الصور)' : ''}</option>
                    ))}
                </select>
            </div>

            <div className="mt-8 border-t border-gray-700 pt-6">
                <h4 className="text-lg font-medium text-gray-200 mb-2">إدارة نماذج OpenRouter</h4>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <h5 className="font-semibold text-gray-300 mb-3">إضافة نموذج جديد</h5>
                    <div className="flex flex-col sm:flex-row gap-2 items-start mb-4">
                        <input
                            type="text"
                            value={newModelId}
                            onChange={(e) => setNewModelId(e.target.value)}
                            className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:outline-none"
                            placeholder="مثال: google/gemini-flash-1.5"
                        />
                        <button onClick={handleAddModel} className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors flex-shrink-0">إضافة</button>
                    </div>
                    <div className="flex items-center mb-4">
                        <input
                            type="checkbox"
                            id="supports-images"
                            checked={newModelSupportsImages}
                            onChange={(e) => setNewModelSupportsImages(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-gray-700"
                        />
                        <label htmlFor="supports-images" className="ms-2 block text-sm text-gray-300">
                            هذا النموذج يدعم الصور
                        </label>
                    </div>

                    <h5 className="font-semibold text-gray-300 mb-2 border-t border-gray-700 pt-4">قائمة النماذج الحالية</h5>
                    <div className="max-h-60 overflow-y-auto space-y-2 pe-2">
                        {openRouterModels.map(model => (
                            <div key={model.id} className="flex justify-between items-center p-2 bg-gray-700 rounded-md">
                                <span className="text-sm text-gray-200 font-mono truncate me-2">{model.id} {model.supportsImages && '🖼️'}</span>
                                <button
                                    onClick={() => handleDeleteModel(model.id)}
                                    className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-full flex-shrink-0"
                                    aria-label={`حذف ${model.id}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
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

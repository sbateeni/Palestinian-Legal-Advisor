import React, { useState, useRef, useEffect } from 'react';
import { ApiSource, Case } from '../types';
import * as dbService from '../services/dbService';

const SettingsPage: React.FC = () => {
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [apiSource, setApiSource] = useState<ApiSource>('gemini');
  const [casesCount, setCasesCount] = useState(0);
  
  const [inputValue, setInputValue] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const storedApiKey = await dbService.getSetting<string>('openRouterApiKey');
      const storedApiSource = await dbService.getSetting<ApiSource>('apiSource');
      const allCases = await dbService.getAllCases();

      if (storedApiKey) {
        setOpenRouterApiKey(storedApiKey);
        setInputValue(storedApiKey);
      }
      if (storedApiSource) {
        setApiSource(storedApiSource);
      }
      setCasesCount(allCases.length);
    };
    loadSettings();
  }, []);


  const handleSave = async () => {
    await dbService.setSetting({ key: 'openRouterApiKey', value: inputValue });
    setOpenRouterApiKey(inputValue);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleApiSourceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSource = e.target.value as ApiSource;
    await dbService.setSetting({ key: 'apiSource', value: newSource });
    setApiSource(newSource);
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
    <div className="w-full max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-3">الإعدادات</h1>
      
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-100 mb-4">إعدادات مزود الخدمة</h2>
        <div className="mb-8">
          <label htmlFor="api-source" className="block text-lg font-medium text-gray-200 mb-2">
            مزود خدمة الذكاء الاصطناعي
          </label>
          <p className="text-sm text-gray-400 mb-3">
            اختر مزود الخدمة الذي ترغب في استخدامه. يتطلب OpenRouter إدخال مفتاح API أدناه.
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
            <div className="text-center p-4 border border-dashed border-gray-600 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">إعدادات Google Gemini</h3>
                <p className="text-gray-300">
                    يستخدم Google Gemini مفتاح API المحدد من خلال نافذة Google AI Studio المنبثقة.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                    لا يلزم إدخال أي مفتاح هنا. سيُطلب منك تحديده عند بدء محادثة.
                </p>
            </div>
        )}

        {apiSource === 'openrouter' && (
          <div>
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
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="sk-or-..."
              />
            </div>
            
            <div className="flex items-center justify-end">
              {saved && (
                <span className="text-green-400 me-4 transition-opacity duration-300">
                  تم الحفظ بنجاح!
                </span>
              )}
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
              >
                حفظ
              </button>
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

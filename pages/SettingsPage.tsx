import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { LOCAL_STORAGE_OPENROUTER_API_KEY, LOCAL_STORAGE_API_SOURCE_KEY } from '../constants';
import { ApiSource } from '../types';
import { debugLocalStorage, clearAllData, exportData, importData } from '../utils/debugUtils';

const SettingsPage: React.FC = () => {
  const [openRouterApiKey, setOpenRouterApiKey] = useLocalStorage<string>(LOCAL_STORAGE_OPENROUTER_API_KEY, '');
  const [apiSource, setApiSource] = useLocalStorage<ApiSource>(LOCAL_STORAGE_API_SOURCE_KEY, 'gemini');
  
  const [inputValue, setInputValue] = useState<string>(openRouterApiKey);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = () => {
    setOpenRouterApiKey(inputValue);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-3">الإعدادات</h1>
      
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
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
            onChange={(e) => setApiSource(e.target.value as ApiSource)}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="gemini">Google Gemini</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        {apiSource === 'gemini' && (
            <div className="text-center p-4 border border-dashed border-gray-600 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-200 mb-2">إعدادات Google Gemini</h2>
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
      
      {/* Debug Section */}
      <div className="mt-8 bg-gray-800 rounded-lg shadow-lg p-6 border border-yellow-500/30">
        <h2 className="text-xl font-bold mb-4 text-yellow-500">أدوات التشخيص والتصحيح</h2>
        <p className="text-sm text-gray-400 mb-4">
          هذه الأدوات مخصصة للمطورين لتشخيص مشكلات استمرارية البيانات.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={debugLocalStorage}
            className="px-4 py-2 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
          >
            عرض بيانات التخزين المحلي
          </button>
          
          <button
            onClick={exportData}
            className="px-4 py-2 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            تصدير جميع البيانات
          </button>
          
          <button
            onClick={clearAllData}
            className="px-4 py-2 bg-red-700 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
          >
            مسح جميع البيانات
          </button>
          
          <div className="flex flex-col">
            <label className="text-sm text-gray-300 mb-1">استيراد بيانات (JSON)</label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const jsonData = JSON.parse(event.target?.result as string);
                      importData(jsonData);
                    } catch (error) {
                      console.error('Invalid JSON file:', error);
                      alert('ملف JSON غير صالح.');
                    }
                  };
                  reader.readAsText(file);
                }
              }}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

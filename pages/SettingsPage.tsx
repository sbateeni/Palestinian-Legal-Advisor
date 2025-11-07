import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { LOCAL_STORAGE_OPENROUTER_API_KEY, LOCAL_STORAGE_API_SOURCE_KEY } from '../constants';
import { ApiSource } from '../types';

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
    </div>
  );
};

export default SettingsPage;

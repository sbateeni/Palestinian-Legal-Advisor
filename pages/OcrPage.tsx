import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as dbService from '../services/dbService';
import { analyzeImageWithOpenRouter } from '../services/openRouterService';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { OPENROUTER_FREE_MODELS } from '../constants';

const OcrPage: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<{ file: File; dataUrl: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isApiKeyReady, setIsApiKeyReady] = useState<boolean | null>(null);
    const [openRouterApiKey, setOpenRouterApiKey] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('google/gemini-flash-1.5:free');
    const [prompt, setPrompt] = useState<string>('ما الذي تراه في هذه الصورة؟ اشرح بالتفصيل.');


    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const imageModels = OPENROUTER_FREE_MODELS.filter(m => m.supportsImages);

    useEffect(() => {
        const loadApiKey = async () => {
            // This page specifically uses OpenRouter as per the request
            const storedApiSource = await dbService.getSetting<'openrouter'>('apiSource');
            if (storedApiSource !== 'openrouter') {
                // If the user has Gemini selected, we guide them to switch for this feature.
                setError("هذه الميزة تتطلب استخدام OpenRouter. يرجى التبديل إلى OpenRouter في صفحة الإعدادات.");
                setIsApiKeyReady(false); // Block usage
                return;
            }

            const storedApiKey = await dbService.getSetting<string>('openRouterApiKey');
            if (storedApiKey) {
                setOpenRouterApiKey(storedApiKey);
                setIsApiKeyReady(true);
            } else {
                setIsApiKeyReady(false);
            }
        };
        loadApiKey();
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setSelectedImage({ file, dataUrl: e.target?.result as string });
                setAnalysisResult(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        } else {
            setSelectedImage(null);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedImage) {
            setError("الرجاء اختيار صورة أولاً.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const result = await analyzeImageWithOpenRouter(openRouterApiKey, selectedImage.dataUrl, selectedModel, prompt);
            setAnalysisResult(result);
        } catch (err: any) {
            console.error("Analysis Error:", err);
            const errorMessage = err.toString();
            if (errorMessage.includes("API key") || errorMessage.includes("authentication")) {
                setError("مفتاح API لـ OpenRouter غير صالح. يرجى التحقق منه في الإعدادات.");
                setIsApiKeyReady(false);
            } else {
                setError(`حدث خطأ أثناء التحليل: ${err.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGoToSettings = () => {
        navigate('/settings');
    };

    if (isApiKeyReady === null) {
        return (
            <div className="w-full flex-grow flex items-center justify-center p-8 text-lg">
                <svg className="animate-spin h-6 w-6 text-white me-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>جاري التحقق من الإعدادات...</span>
            </div>
        );
    }
    
    if (!isApiKeyReady) {
        return (
          <div className="w-full flex-grow flex flex-col items-center justify-center text-center p-4">
              <h2 className="text-2xl font-bold mb-4 text-gray-200">مطلوب إعداد OpenRouter</h2>
              <p className="text-gray-400 mb-6 max-w-2xl">
                {error || 'لاستخدام ميزة تحليل الصور، يجب عليك تفعيل OpenRouter وإدخال مفتاح API الخاص بك في صفحة الإعدادات.'}
              </p>
              <button onClick={handleGoToSettings} className="mt-6 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                الانتقال إلى الإعدادات
              </button>
          </div>
        );
    }


    return (
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-3">
                🖼️ استخراج وتحليل النص من الصور
            </h1>

            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-200 mb-4">1. رفع الصورة</h2>
                <div 
                    className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-700/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        type="file" 
                        accept="image/*" 
                        id="imageInput" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden" 
                    />
                    {selectedImage ? (
                        <div className="relative inline-block">
                             <img src={selectedImage.dataUrl} alt="Preview" className="max-h-64 rounded-lg mx-auto shadow-lg" />
                             <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 leading-none shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                aria-label="Remove image"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ) : (
                        <div className="text-gray-400">
                             <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <p className="mt-2 text-lg">انقر هنا أو اسحب وأفلت صورة</p>
                            <p className="text-sm">PNG, JPG, GIF, WEBP</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-200 mb-4">2. اختر نموذج التحليل</h2>
                <select
                    id="model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    disabled={isLoading}
                >
                    {imageModels.map(model => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                </select>
            </div>
            
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-200 mb-4">3. أدخل الطلب (اختياري)</h2>
                 <textarea
                    id="prompt-text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    rows={3}
                    placeholder="صف ما تريد تحليله في الصورة..."
                    disabled={isLoading}
                />
            </div>

            <div className="text-center mb-6">
                <button 
                    className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors text-lg"
                    onClick={handleAnalyze} 
                    disabled={!selectedImage || isLoading}
                >
                    {isLoading ? "جاري التحليل..." : "4. ابدأ التحليل"}
                </button>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                 <h2 className="text-xl font-semibold text-gray-200 mb-4">📤 المخرجات</h2>
                 <div className="bg-gray-900 rounded-md p-4 min-h-[150px] text-gray-300 whitespace-pre-wrap">
                    {isLoading && (
                         <div className="flex items-center justify-center h-full">
                            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         </div>
                    )}
                    {error && (
                        <p className="text-red-400">{error}</p>
                    )}
                    {analysisResult && (
                         <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(analysisResult) as string) }}></div>
                    )}
                    {!isLoading && !error && !analysisResult && (
                        <p className="text-gray-500 text-center pt-10">لا يوجد مخرجات بعد.</p>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default OcrPage;
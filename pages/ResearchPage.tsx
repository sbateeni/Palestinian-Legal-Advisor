import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getResearchPrompt } from '../services/legalPrompts';
import { LegalRegion } from '../types';
import * as dbService from '../services/dbService';

const ResearchPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [region, setRegion] = useState<LegalRegion>('westbank');
    const [isApiKeyReady, setIsApiKeyReady] = useState<boolean | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            // تحميل المنطقة المختارة
            const storedRegion = await dbService.getSetting<LegalRegion>('legalRegion');
            if (storedRegion) setRegion(storedRegion);

            // التحقق من مفتاح API: نفحص البيئة أولاً ثم قاعدة البيانات المحلية
            const storedGeminiKey = await dbService.getSetting<string>('geminiApiKey');
            const hasEnvKey = !!process.env.API_KEY;
            
            // نعتبر المفتاح جاهزاً إذا وجد في أي من المصدرين
            setIsApiKeyReady(hasEnvKey || !!storedGeminiKey);
        };
        loadSettings();
    }, []);

    const handleSearch = async () => {
        if (!query.trim() || isLoading) return;
        
        setIsLoading(true);
        setResult(''); 

        try {
            // نستخدم المفتاح المتوفر (الأولوية لمتغيرات البيئة ثم المحلي)
            const storedKey = await dbService.getSetting<string>('geminiApiKey');
            const apiKey = process.env.API_KEY || storedKey;
            
            if (!apiKey) throw new Error("لم يتم العثور على مفتاح API.");

            const ai = new GoogleGenAI({ apiKey: apiKey });
            const model = 'gemini-3-pro-preview';
            const researchPrompt = getResearchPrompt(query, region);

            const responseStream = await ai.models.generateContentStream({
                model: model,
                contents: researchPrompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: "أنت باحث قانوني فلسطيني محترف. استخدم أداة البحث للوصول للقوانين السارية. اجعل النصوص واضحة جداً واستخدم تنسيق Markdown للجداول والنصوص المهمة.",
                    thinkingConfig: { thinkingBudget: 2048 }
                }
            });

            let fullText = '';
            for await (const chunk of responseStream) {
                if (chunk.text) {
                    fullText += chunk.text;
                    setResult(fullText);
                }
            }
            
            dbService.incrementTokenUsage(1);

        } catch (error: any) {
            console.error("Research Error:", error);
            setResult(`**حدث خطأ أثناء البحث:**\n${error.message || 'يرجى التحقق من مفتاح API في الإعدادات.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    if (isApiKeyReady === false) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-slate-950">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-8 rounded-full mb-6 border border-purple-200 dark:border-purple-800 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">مطلوب مفتاح API للبحث</h2>
                <p className="text-gray-600 dark:text-slate-300 mb-8 max-w-lg text-lg">يرجى ضبط مفتاح API في صفحة الإعدادات لتتمكن من استخدام ميزة البحث القانوني المتطور.</p>
                <a href="#/settings" className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-md">الانتقال للإعدادات</a>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col min-h-full bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Header */}
            <div className="mb-8 border-b border-gray-200 dark:border-slate-800 pb-4">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <span className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg text-purple-600 dark:text-purple-400 shadow-sm border border-purple-200 dark:border-purple-800/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                    </span>
                    محرك البحث القانوني والتشريعي
                </h1>
                <p className="text-gray-600 dark:text-slate-300 mt-2 text-lg font-bold">
                    استكشف التشريعات الفلسطينية السارية والقرارات بقانون بدقة متناهية.
                </p>
            </div>

            {/* Search Controls Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 mb-6 transition-all">
                <div className="flex flex-col sm:flex-row gap-4 mb-5">
                    {/* Region Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl flex-shrink-0 border border-gray-200 dark:border-gray-700 shadow-inner">
                        <button 
                            onClick={() => setRegion('westbank')}
                            className={`px-5 py-2 text-sm font-black rounded-lg transition-all ${region === 'westbank' ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-md' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100'}`}
                        >
                            الضفة الغربية
                        </button>
                        <button 
                            onClick={() => setRegion('gaza')}
                            className={`px-5 py-2 text-sm font-black rounded-lg transition-all ${region === 'gaza' ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-md' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100'}`}
                        >
                            قطاع غزة
                        </button>
                    </div>
                    
                    <div className="flex-grow text-xs sm:text-sm text-blue-700 dark:text-blue-300 flex items-center bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800/50 font-bold">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        سيتم البحث في: المقتفي، ديوان الفتوى، والجريدة الرسمية.
                    </div>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="أدخل اسم القانون أو الموضوع (مثال: قانون التنفيذ...)"
                        className="w-full p-4 ps-12 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner transition-all placeholder-gray-400 dark:placeholder-gray-600 font-bold"
                        autoFocus
                    />
                    <svg className="absolute start-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    
                    <button 
                        onClick={handleSearch}
                        disabled={isLoading || !query.trim()}
                        className="absolute end-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-purple-600 dark:bg-purple-700 text-white font-black rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin h-4 w-4 me-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                جاري البحث...
                            </span>
                        ) : 'بحث'}
                    </button>
                </div>
            </div>

            {/* Results Area Card */}
            <div className="flex-grow bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 overflow-y-auto min-h-[400px] transition-all">
                {!result && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 opacity-60">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        <p className="text-xl font-bold">نتائج البحث القانوني ستظهر هنا بعناية...</p>
                    </div>
                )}

                {isLoading && (
                    <div className="space-y-6 animate-pulse">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                            <div className="h-40 bg-gray-100 dark:bg-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-600"></div>
                            <div className="h-40 bg-gray-100 dark:bg-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-600"></div>
                            <div className="h-40 bg-gray-100 dark:bg-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-600"></div>
                        </div>
                    </div>
                )}

                {result && (
                    <div className="prose prose-purple dark:prose-invert prose-lg max-w-none prose-headings:font-black prose-p:font-bold prose-strong:text-purple-600 dark:prose-strong:text-purple-400">
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(result) as string) }} />
                    </div>
                )}
            </div>
            
            {/* Footer Note */}
            <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                    * ملاحظة: النتائج يتم توليدها بناءً على المعلومات المتاحة عبر الإنترنت، يرجى دائماً مراجعة النسخة الورقية للتأكد التام.
                </p>
            </div>
        </div>
    );
};

export default ResearchPage;
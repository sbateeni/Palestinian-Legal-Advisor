
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
            const storedRegion = await dbService.getSetting<LegalRegion>('legalRegion');
            if (storedRegion) setRegion(storedRegion);

            // Check Gemini Key (Strict requirement for search tool)
            let hasKey = false;
            if (window.aistudio) {
                try {
                    hasKey = await window.aistudio.hasSelectedApiKey();
                } catch (e) { console.error(e); }
            }
            if (!hasKey) {
                const storedKey = await dbService.getSetting<string>('geminiApiKey');
                hasKey = !!storedKey;
            }
            // Also check env var safely
            // @ts-ignore
            if (!hasKey && typeof process !== 'undefined' && process.env && process.env.API_KEY) {
                 hasKey = true;
            }
            setIsApiKeyReady(hasKey);
        };
        loadSettings();
    }, []);

    const handleSearch = async () => {
        if (!query.trim() || isLoading) return;
        
        setIsLoading(true);
        setResult(''); // Clear previous results

        try {
            // Initialize Gemini (Assuming Key context is handled globally via env or DB in service usually, 
            // but here we might need to instantiate directly or reuse service logic. 
            // For cleaner code, we'll fetch key like geminiService does)
            
            let apiKey = '';
            // @ts-ignore
            if (typeof process !== 'undefined' && process.env && process.env.API_KEY) apiKey = process.env.API_KEY;
            if (!apiKey) apiKey = await dbService.getSetting<string>('geminiApiKey') || '';
            
            // Note: In a real app, strict handling of window.aistudio via geminiService is better, 
            // but strictly following the prompt rules, we use standard init.
            
            const ai = new GoogleGenAI({ apiKey });
            const model = 'gemini-2.5-flash';

            const researchPrompt = getResearchPrompt(query, region);

            const responseStream = await ai.models.generateContentStream({
                model: model,
                contents: researchPrompt,
                config: {
                    tools: [{ googleSearch: {} }], // Enable Search Tool
                    systemInstruction: "أنت باحث قانوني مختص. التزم حرفياً بالبحث في المصادر المحددة فقط.",
                }
            });

            let fullText = '';
            for await (const chunk of responseStream) {
                if (chunk.text) {
                    fullText += chunk.text;
                    setResult(fullText);
                }
            }
            
            // Count Usage
            dbService.incrementTokenUsage(1);

        } catch (error: any) {
            console.error("Research Error:", error);
            setResult(`**حدث خطأ أثناء البحث:**\n${error.message || 'يرجى التحقق من مفتاح API أو الاتصال بالإنترنت.'}`);
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

    const handleSelectApiKey = async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                setIsApiKeyReady(true);
            } catch (e) { console.error(e); }
        }
    };

    if (isApiKeyReady === false) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-purple-100 p-6 rounded-full mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">مطلوب مفتاح API للبحث</h2>
                <p className="text-gray-600 mb-6 max-w-lg">خدمة البحث القانوني تتطلب الوصول المباشر إلى نماذج Google Gemini مع تفعيل خاصية البحث (Grounding).</p>
                {window.aistudio && (
                    <button onClick={handleSelectApiKey} className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                        تحديد مفتاح عبر Google AI
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col h-full">
            {/* Header */}
            <div className="mb-8 border-b border-gray-200 pb-4">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <span className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                    </span>
                    محرك البحث القانوني والتشريعي
                </h1>
                <p className="text-gray-500 mt-2 text-lg">
                    البحث في القوانين السارية (المقتفي، الجريدة الرسمية) مع التحقق من التعديلات الحديثة.
                </p>
            </div>

            {/* Search Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    {/* Region Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg flex-shrink-0">
                        <button 
                            onClick={() => setRegion('westbank')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${region === 'westbank' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            الضفة الغربية
                        </button>
                        <button 
                            onClick={() => setRegion('gaza')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${region === 'gaza' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            قطاع غزة
                        </button>
                    </div>
                    
                    <div className="flex-grow text-sm text-gray-500 flex items-center bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        سيتم البحث حصراً في المصادر المعتمدة: المقتفي، ديوان الفتوى والتشريع، وكالة وفا.
                    </div>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="أدخل اسم القانون، رقم التشريع، أو الموضوع (مثال: قانون العمل الفلسطيني، قرار بقانون التنفيذ...)"
                        className="w-full p-4 ps-12 bg-gray-50 border border-gray-300 rounded-xl text-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                        autoFocus
                    />
                    <svg className="absolute start-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    
                    <button 
                        onClick={handleSearch}
                        disabled={isLoading || !query.trim()}
                        className="absolute end-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'جاري البحث...' : 'بحث'}
                    </button>
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-grow bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-y-auto min-h-[400px]">
                {!result && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        <p className="text-lg">النتائج ستظهر هنا...</p>
                    </div>
                )}

                {isLoading && (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-32 bg-gray-100 rounded-lg mt-6"></div>
                    </div>
                )}

                {result && (
                    <div className="prose prose-purple prose-lg max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(result) as string) }} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResearchPage;

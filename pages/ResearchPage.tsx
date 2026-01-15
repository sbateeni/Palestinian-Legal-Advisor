
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getResearchPrompt } from '../services/legalPrompts';
import { LegalRegion } from '../types';
import * as dbService from '../services/dbService';
import { AGENT_MODEL_ROUTING } from '../constants';

const ResearchPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [region, setRegion] = useState<LegalRegion>('westbank');
    const [activeModel, setActiveModel] = useState<string>('auto');
    const [showFlashFallback, setShowFlashFallback] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const storedRegion = await dbService.getSetting<LegalRegion>('legalRegion');
            if (storedRegion) setRegion(storedRegion);

            const storedModel = await dbService.getSetting<string>('geminiModelId') || 'auto';
            setActiveModel(storedModel);
        };
        loadSettings();
    }, []);

    const handleSearch = async (forcedModel?: string) => {
        if (!query.trim() || isLoading) return;
        
        setIsLoading(true);
        setResult(''); 
        setShowFlashFallback(false);

        try {
            // Strictly use process.env.API_KEY
            const apiKey = process.env.API_KEY;
            
            if (!apiKey) {
                throw new Error("API Key is missing from the environment configuration.");
            }

            let modelId = forcedModel || activeModel;
            if (modelId === 'auto') {
                modelId = AGENT_MODEL_ROUTING['research'] || 'gemini-3-pro-preview';
            }

            const ai = new GoogleGenAI({ apiKey: apiKey });
            const researchPrompt = getResearchPrompt(query, region);

            const responseStream = await ai.models.generateContentStream({
                model: modelId,
                contents: researchPrompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: "أنت باحث قانوني فلسطيني محترف. التزم بالبحث في المقتفي والجريدة الرسمية. اجعل النصوص واضحة جداً في الوضع الليلي.",
                    thinkingConfig: modelId.includes('pro') ? { thinkingBudget: 2048 } : { thinkingBudget: 0 }
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
            let errorMessage = error.message;
            
            if (error.status === 429 || error.toString().includes("429")) {
                errorMessage = "⚠️ لقد وصلت للحد الأقصى لطلبات النموذج القوي (Pro) حالياً.";
                setShowFlashFallback(true);
            }

            setResult(`**تنبيه:**\n\n${errorMessage}`);
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

    return (
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col min-h-full bg-slate-950 transition-colors duration-300">
            <div className="mb-8 border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <span className="p-2 bg-purple-900/40 rounded-lg text-purple-400 shadow-inner border border-purple-800/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        الباحث القانوني الذكي
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg font-medium">
                        البحث في التشريعات السارية وفق نظام التوجيه التلقائي
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-xl border border-gray-700 shadow-inner">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-gray-300">
                        الوضع: {activeModel === 'auto' ? 'التوجيه التلقائي (موصى به)' : 'نموذج مخصص'}
                    </span>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700 mb-6 transition-all">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex bg-gray-900 p-1.5 rounded-xl flex-shrink-0 border border-gray-700 shadow-inner">
                        <button 
                            onClick={() => setRegion('westbank')}
                            className={`px-6 py-2 text-sm font-black rounded-lg transition-all ${region === 'westbank' ? 'bg-gray-700 text-purple-300 shadow-md border border-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            الضفة الغربية
                        </button>
                        <button 
                            onClick={() => setRegion('gaza')}
                            className={`px-6 py-2 text-sm font-black rounded-lg transition-all ${region === 'gaza' ? 'bg-gray-700 text-purple-300 shadow-md border border-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            قطاع غزة
                        </button>
                    </div>
                    
                    <div className="flex-grow text-xs sm:text-sm text-blue-300 flex items-center bg-blue-900/20 px-5 py-2 rounded-xl border border-blue-800/40 font-bold">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        البحث يشمل المقتفي، ديوان الفتوى والتشريع، وقرارات المحاكم العليا.
                    </div>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="أدخل اسم القانون، المادة، أو المسألة القانونية..."
                        className="w-full p-4 ps-14 bg-gray-900 border border-gray-700 rounded-2xl text-lg text-white focus:ring-2 focus:ring-purple-600 focus:outline-none shadow-inner transition-all placeholder-gray-600 font-bold"
                        autoFocus
                    />
                    <svg className="absolute start-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    
                    <button 
                        onClick={() => handleSearch()}
                        disabled={isLoading || !query.trim()}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 px-8 py-2.5 bg-purple-700 text-white font-black rounded-xl hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 transition-all shadow-lg"
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin h-5 w-5 me-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                جاري البحث...
                            </span>
                        ) : 'ابدأ البحث'}
                    </button>
                </div>
            </div>

            {showFlashFallback && (
                <div className="mb-6 p-5 bg-amber-900/20 border border-amber-700 rounded-2xl animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center text-amber-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 me-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <p className="font-bold text-sm">هل تريد تجربة "البحث السريع" لتجاوز ضغط الحصة الحالية؟</p>
                    </div>
                    <button 
                        onClick={() => handleSearch('gemini-3-flash-preview')}
                        className="px-6 py-2 bg-amber-600 text-white font-black rounded-lg hover:bg-amber-500 transition-all shadow-md whitespace-nowrap"
                    >
                        استخدام البحث السريع (Flash)
                    </button>
                </div>
            )}

            <div className="flex-grow bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8 overflow-y-auto min-h-[450px] transition-all">
                {!result && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-40 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-28 w-28 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        <p className="text-2xl font-black">نتائج البحث القانوني المتحقق منها</p>
                        <p className="text-sm mt-3">اكتب سؤالك في الأعلى وسأقوم بمراجعة المراجع الرسمية لك.</p>
                    </div>
                )}

                {isLoading && (
                    <div className="space-y-8 animate-pulse">
                        <div className="h-6 bg-gray-700 rounded-full w-3/4 shadow-inner"></div>
                        <div className="h-6 bg-gray-700 rounded-full w-1/2 shadow-inner"></div>
                    </div>
                )}

                {result && (
                    <div className="prose prose-invert prose-lg max-w-none 
                                    prose-headings:text-white prose-headings:font-black 
                                    prose-p:text-gray-100 prose-p:font-bold prose-p:leading-relaxed
                                    prose-strong:text-purple-400 prose-a:text-blue-400 prose-a:font-black">
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(result) as string) }} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResearchPage;

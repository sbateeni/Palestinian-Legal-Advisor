'use client';

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import {
    getResearchPrompt,
    RESEARCH_PAGE_SYSTEM_INSTRUCTION,
    isAllowedOfficialSourceUri,
    isGroundingSearchProxyUri,
    extractOfficialUrlsFromGrounding,
    getResearchUrlDiscoveryPrompt,
    RESEARCH_URL_DISCOVERY_INSTRUCTION,
    parseOfficialUrlsFromDiscoveryText,
} from '../services/legalPrompts';
import { GroundingMetadata, LegalRegion } from '../types';
import ChatMessageItem from '../components/ChatMessageItem';
import * as dbService from '../services/dbService';
import { AGENT_MODEL_ROUTING } from '../constants';
import { readClientGeminiKeyFromEnv } from '../lib/publicEnv';

type ScrapedSource = {
    title: string;
    text: string;
    finalUrl: string;
    truncated: boolean;
};

const ResearchPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [result, setResult] = useState('');
    const [groundingMetadata, setGroundingMetadata] = useState<GroundingMetadata | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [region, setRegion] = useState<LegalRegion>('westbank');
    const [activeModel, setActiveModel] = useState<string>('auto');
    const [showFlashFallback, setShowFlashFallback] = useState(false);
    /** وضع المقارنة: نص مستخرج من مواقع رسمية + إجابة Gemini */
    const [compareActive, setCompareActive] = useState(false);
    const [scrapedBlocks, setScrapedBlocks] = useState<ScrapedSource[]>([]);
    const [scrapeError, setScrapeError] = useState<string | null>(null);
    const [scrapePending, setScrapePending] = useState(false);

    const rawChunks = groundingMetadata?.groundingChunks || [];
    const officialGroundingChunks = rawChunks.filter(
        (chunk: any) => chunk?.web?.uri && isAllowedOfficialSourceUri(chunk.web.uri)
    );
    const searchProxyGroundingChunks = rawChunks.filter(
        (chunk: any) => chunk?.web?.uri && isGroundingSearchProxyUri(chunk.web.uri)
    );
    const hasResearchGroundingBox =
        officialGroundingChunks.length > 0 || searchProxyGroundingChunks.length > 0;

    const getFlashModel = () => {
        // Use the same "Flash" model the smart routing uses for non-Pro tasks.
        return AGENT_MODEL_ROUTING['analysis'] || 'gemini-2.5-flash';
    };

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

        setCompareActive(true);
        setScrapedBlocks([]);
        setScrapeError(null);
        setScrapePending(true);

        setIsLoading(true);
        setResult(''); 
        setGroundingMetadata(undefined);
        setShowFlashFallback(false);
        let resolvedModelId = '';
        let lastGroundingMetadata: GroundingMetadata | undefined = undefined;
        let apiKeyForScrape = '';

        try {
            let apiKey = readClientGeminiKeyFromEnv();
            if (!apiKey) {
                apiKey = await dbService.getSetting<string>('geminiApiKey') || "";
            }
            
            if (!apiKey) {
                throw new Error("مفتاح API لـ Gemini غير متوفر. يرجى إعداده في الإعدادات.");
            }

            apiKeyForScrape = apiKey;

            let modelId = forcedModel || activeModel;
            if (modelId === 'auto') {
                modelId = AGENT_MODEL_ROUTING['research'] || 'gemini-3-pro-preview';
            }
            resolvedModelId = modelId;

            const ai = new GoogleGenAI({ apiKey: apiKey });
            const researchPrompt = getResearchPrompt(query, region);

            const config: any = {
                tools: [{ googleSearch: {} }],
                systemInstruction: RESEARCH_PAGE_SYSTEM_INSTRUCTION,
            };

            // Only enable thinking budget for Pro models.
            if (modelId.includes('pro')) {
                config.thinkingConfig = { thinkingBudget: 2048 };
            }

            const responseStream = await ai.models.generateContentStream({
                model: modelId,
                contents: researchPrompt,
                config: config
            });

            let fullText = '';
            for await (const chunk of responseStream) {
                if (chunk.text) {
                    fullText += chunk.text;
                    setResult(fullText);
                }
                const maybeGrounding = (chunk as any)?.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;
                if (maybeGrounding) lastGroundingMetadata = maybeGrounding;
            }

            await dbService.incrementTokenUsageForModel(resolvedModelId || modelId, 1);

            /** إعادة محاولة غير متدفقة: أحياناً لا يُرفق grounding مع البث رغم وجود نتائج؛ أو يفشل النص قصيراً */
            const chunksEmpty = !lastGroundingMetadata?.groundingChunks?.length;
            const looksNotFound = /\bلم يتم العثور على نص صريح\b/i.test(fullText);
            const textTooShort = fullText.trim().length < 120;
            if (chunksEmpty || looksNotFound || textTooShort) {
                try {
                    const fallback = await ai.models.generateContent({
                        model: modelId,
                        contents: researchPrompt,
                        config,
                    });
                    const fbGm = (fallback as any)?.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;
                    const fbText = (fallback as any)?.text?.trim?.() || '';
                    if (fbGm?.groundingChunks?.length) {
                        lastGroundingMetadata = fbGm;
                    }
                    if (fbText && (!fullText.trim() || fbText.length > fullText.length || looksNotFound)) {
                        fullText = fbText;
                        setResult(fullText);
                    }
                    await dbService.incrementTokenUsageForModel(resolvedModelId || modelId, 1);
                } catch (fbErr) {
                    console.warn('Research fallback generateContent:', fbErr);
                }
            }
            
            setGroundingMetadata(lastGroundingMetadata);

        } catch (error: any) {
            console.error("Research Error:", error);
            let errorMessage = error.message;
            
            if (error.status === 429 || error.toString().includes("429")) {
                errorMessage = "⚠️ لقد وصلت للحد الأقصى لطلبات النموذج القوي (Pro) حالياً.";
                setShowFlashFallback(true);
            }

            setResult(`**تنبيه:**\n\n${errorMessage}\n\nالنموذج المستخدم: \`${resolvedModelId || 'غير معروف'}\``);
            setGroundingMetadata(undefined);
        } finally {
            setIsLoading(false);
        }

        if (!apiKeyForScrape) {
            setScrapePending(false);
            return;
        }

        try {
            let urls = extractOfficialUrlsFromGrounding(lastGroundingMetadata, 5);
            const manual = sourceUrl.trim();
            if (manual && isAllowedOfficialSourceUri(manual)) {
                try {
                    const manualKey = new URL(manual).href.split('#')[0];
                    urls = [
                        manual,
                        ...urls.filter((u) => {
                            try {
                                return new URL(u).href.split('#')[0] !== manualKey;
                            } catch {
                                return true;
                            }
                        }),
                    ];
                } catch {
                    urls = [manual, ...urls];
                }
            }
            urls = urls.slice(0, 3);

            if (urls.length === 0) {
                const ai = new GoogleGenAI({ apiKey: apiKeyForScrape });
                const flashModel = getFlashModel();
                const disc = await ai.models.generateContent({
                    model: flashModel,
                    contents: getResearchUrlDiscoveryPrompt(query, region),
                    config: {
                        tools: [{ googleSearch: {} }],
                        systemInstruction: RESEARCH_URL_DISCOVERY_INSTRUCTION,
                    },
                });
                const discText = (disc as any)?.text?.trim?.() || '';
                urls = parseOfficialUrlsFromDiscoveryText(discText, 3);
                await dbService.incrementTokenUsageForModel(flashModel, 1);
            }

            if (urls.length === 0) {
                return;
            }

            const settled = await Promise.allSettled(
                urls.map((url) =>
                    fetch('/api/research-scrape', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url }),
                    }).then(async (r) => r.json())
                )
            );

            const blocks: ScrapedSource[] = [];
            const failMsgs: string[] = [];
            settled.forEach((s, i) => {
                if (s.status === 'fulfilled' && s.value?.ok) {
                    blocks.push({
                        title: s.value.title,
                        text: s.value.text,
                        finalUrl: s.value.finalUrl,
                        truncated: Boolean(s.value.truncated),
                    });
                } else if (s.status === 'fulfilled' && s.value && !s.value.ok) {
                    failMsgs.push(s.value.error || urls[i]);
                } else if (s.status === 'rejected') {
                    failMsgs.push(String(s.reason));
                }
            });

            setScrapedBlocks(blocks);
            if (blocks.length === 0 && failMsgs.length > 0) {
                setScrapeError(failMsgs.join(' — '));
            }
        } catch (e) {
            console.warn('Official scrape / discovery:', e);
            setScrapeError(e instanceof Error ? e.message : String(e));
        } finally {
            setScrapePending(false);
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
                        بعد إجابة Gemini يُستخرج النص تلقائياً من روابط رسمية (مقتفى، OGB، …) إن وُجدت؛ الصياغة الملزمة هي عمود الاستخراج.
                    </div>
                </div>

                <div className="relative mb-3">
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
                <details className="group">
                    <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-400 list-none flex items-center gap-2">
                        <span className="text-slate-600 group-open:rotate-90 transition-transform inline-block">›</span>
                        رابط تشريعي يدوي (اختياري — إن أردت فرض صفحة محددة للاستخراج)
                    </summary>
                    <input
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://muqtafi.birzeit.edu/..."
                        className="w-full mt-2 p-3 ps-4 bg-gray-900/80 border border-gray-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-purple-600/60 focus:outline-none placeholder-gray-600 font-mono"
                        dir="ltr"
                    />
                </details>
            </div>

            {showFlashFallback && (
                <div className="mb-6 p-5 bg-amber-900/20 border border-amber-700 rounded-2xl animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center text-amber-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 me-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <p className="font-bold text-sm">هل تريد تجربة "البحث السريع" لتجاوز ضغط الحصة الحالية؟</p>
                    </div>
                    <button 
                        type="button"
                        onClick={() => handleSearch(getFlashModel())}
                        className="px-6 py-2 bg-amber-600 text-white font-black rounded-lg hover:bg-amber-500 transition-all shadow-md whitespace-nowrap"
                    >
                        استخدام البحث السريع (Flash)
                    </button>
                </div>
            )}

            <div className="flex-grow bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8 overflow-y-auto min-h-[450px] transition-all">
                {!compareActive && !result && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-40 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-28 w-28 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        <p className="text-2xl font-black">نتائج البحث القانوني المتحقق منها</p>
                        <p className="text-sm mt-3">اكتب سؤالك في الأعلى وسأقوم بمراجعة المراجع الرسمية لك.</p>
                    </div>
                )}

                {compareActive && (isLoading || result) && (
                    <div className="min-h-[200px] grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-5 flex flex-col min-h-[280px] max-h-[70vh] lg:max-h-none">
                                <h3 className="text-sm font-black text-emerald-300 mb-2 flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                                    النص المستخرج من المصادر الرسمية (سكرابنج تلقائي)
                                </h3>
                                <p className="text-[11px] text-emerald-200/70 mb-3 leading-relaxed">
                                    يُجمع من روابط التثبيت الرسمية التي تعود بها خدمة البحث، أو من بحث ثانٍ عند الحاجة. للصياغة القانونية الدقيقة راجع هذا العمود والرابط الأصلي.
                                </p>
                                {scrapePending && (
                                    <p className="text-sm text-emerald-200/80 animate-pulse">جاري تحديد الروابط الرسمية واستخراج النص حرفياً…</p>
                                )}
                                {scrapeError && !scrapePending && scrapedBlocks.length === 0 && (
                                    <div className="text-sm text-red-300 bg-red-950/30 border border-red-800/40 rounded-lg p-3">{scrapeError}</div>
                                )}
                                {!scrapePending && scrapedBlocks.length === 0 && !scrapeError && result && (
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        لم يُعثر على صفحات رسمية مباشرة للاستخراج في هذه الجولة (غالباً لأن التثبيت أعاد روابط وكيل بحث فقط). جرّب قسم «مواقع رسمية» أسفل إجابة Gemini، أو أضف رابطاً يدوياً من القسم الطيّ تحت مربع البحث.
                                    </p>
                                )}
                                {scrapedBlocks.length > 0 && !scrapePending && (
                                    <div className="space-y-5 flex-grow overflow-y-auto max-h-[55vh]">
                                        {scrapedBlocks.map((block, idx) => (
                                            <div key={`${block.finalUrl}-${idx}`} className="rounded-lg bg-black/30 border border-emerald-900/30 p-3">
                                                <a
                                                    href={block.finalUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-mono text-emerald-400 hover:underline break-all block mb-2"
                                                >
                                                    {block.title}
                                                </a>
                                                {block.truncated && (
                                                    <p className="text-[11px] text-amber-300/90 mb-2">مقتطع لطول النص — راجع الرابط للنص الكامل.</p>
                                                )}
                                                <div className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                                                    {block.text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        <div className="min-w-0">
                            {result ? (
                                <>
                                    <h3 className="text-sm font-black text-purple-300 mb-3 flex items-center gap-2">
                                        <span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
                                        إجابة Gemini (بحث مُدعّم)
                                    </h3>
                                    <ChatMessageItem
                                        content={result}
                                        isModel={true}
                                        groundingMetadata={groundingMetadata}
                                    />
                                </>
                            ) : isLoading ? (
                                <div className="space-y-4 animate-pulse pt-2">
                                    <div className="h-5 bg-gray-700 rounded-full w-2/3" />
                                    <div className="h-5 bg-gray-700 rounded-full w-1/2" />
                                </div>
                            ) : null}

                        {result && hasResearchGroundingBox && (
                            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 rounded-lg p-3 -mx-2 no-print shadow-inner">
                                <p className="text-xs font-black text-blue-700 dark:text-blue-400 mb-3 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 me-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    المصادر المرتبطة بالإجابة
                                </p>
                                <div className="space-y-4">
                                    {officialGroundingChunks.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-600 dark:text-slate-400 mb-2">
                                                مواقع رسمية معتمدة
                                            </p>
                                            <div className="space-y-2">
                                                {officialGroundingChunks.map((chunk: any, idx: number) => (
                                                    <a
                                                        key={`o-${idx}`}
                                                        href={chunk.web.uri}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center p-2 rounded bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-gray-200 dark:border-slate-700 transition-all group/link shadow-sm"
                                                    >
                                                        <span className="flex-shrink-0 w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[10px] me-2 font-mono border border-blue-200 dark:border-blue-700 shadow-inner font-bold">{idx + 1}</span>
                                                        <div className="flex-grow min-w-0">
                                                            <p className="text-xs font-black text-gray-900 dark:text-white truncate group-hover/link:text-blue-700 dark:group-hover/link:text-blue-400">{chunk.web.title || "مصدر قانوني"}</p>
                                                            <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate font-mono">{new URL(chunk.web.uri).hostname}</p>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {searchProxyGroundingChunks.length > 0 && (
                                        <div className="rounded-lg border border-slate-600 bg-slate-900/40 p-3 text-sm text-slate-200 leading-relaxed">
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">تدعيم بحث Google</p>
                                            <p>
                                                وُجد تدعيم عبر بحث Google، لكن الروابط التي تعيدها الخدمة هي روابط وسيط تقني (vertexaisearch) وقد يظهر بجانبها عنوان يشير لمواقع من خارج فلسطين — لذلك لا نعرضها كروابط قابلة للنقر. اعتمد على الروابط أعلاه من النطاقات الرسمية المعتمدة، أو على النص في الإجابة مع التحقق اليدوي.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!isLoading && groundingMetadata && rawChunks.length > 0 && !hasResearchGroundingBox && (
                            <div className="mt-6 p-4 rounded-xl bg-amber-900/20 border border-amber-700 text-amber-200 shadow-inner">
                                وُرِدت بيانات مصادر من الخدمة لكن لا يمكن عرض الروابط (مثلاً صيغة غير معروفة). يُفضّل التحقق يدوياً من المصادر الرسمية.
                            </div>
                        )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResearchPage;

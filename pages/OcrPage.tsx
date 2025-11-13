import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyzeImageWithGemini } from './geminiService';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import * as dbService from '../services/dbService';
import { Case, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';


// Add AIStudio interface for Gemini API key handling, consistent with ChatPage
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

type SelectedImage = {
    id: string;
    file: File;
    dataUrl: string;
};

type AnalysisResult = {
    isLoading: boolean;
    result: string | null;
    error: string | null;
};

const OcrPage: React.FC = () => {
    const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
    const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});
    const [isApiKeyReady, setIsApiKeyReady] = useState<boolean | null>(null);
    const [prompt, setPrompt] = useState<string>('ما الذي تراه في هذه الصورة؟ اشرح بالتفصيل.');
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [isSending, setIsSending] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadInitialData = async () => {
            // Check for API key
            const storedGeminiKey = await dbService.getSetting<string>('geminiApiKey');
            const hasAiStudioKey = window.aistudio?.hasSelectedApiKey ? await window.aistudio.hasSelectedApiKey() : false;
            setIsApiKeyReady(!!storedGeminiKey || hasAiStudioKey);

            // Load cases for the dropdown
            const loadedCases = await dbService.getAllCases();
            setCases(loadedCases.sort((a, b) => b.createdAt - a.createdAt));
        };
        loadInitialData();
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const newImages: SelectedImage[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const newImage = {
                            id: uuidv4(),
                            file,
                            dataUrl: e.target?.result as string
                        };
                        // Use callback form of setState to get the latest state
                        setSelectedImages(prev => [...prev, newImage]);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    };
    
    const removeImage = (idToRemove: string) => {
        setSelectedImages(prev => prev.filter(img => img.id !== idToRemove));
        setAnalysisResults(prev => {
            const newResults = { ...prev };
            delete newResults[idToRemove];
            return newResults;
        });
    };

    const handleAnalyze = async () => {
        if (selectedImages.length === 0) return;

        for (const image of selectedImages) {
            // Don't re-analyze if already done
            if (analysisResults[image.id]?.result) continue;

            setAnalysisResults(prev => ({
                ...prev,
                [image.id]: { isLoading: true, result: null, error: null }
            }));

            try {
                const result = await analyzeImageWithGemini(image.dataUrl, image.file.type, prompt);
                setAnalysisResults(prev => ({
                    ...prev,
                    [image.id]: { isLoading: false, result, error: null }
                }));
            // FIX: Use a type-safe catch block to properly handle errors and avoid incorrect type inference.
            } catch (err) {
                console.error("Analysis Error:", err);
                let displayError: string;
                if (err instanceof Error) {
                    const errorMessage = err.toString();
                    displayError = `حدث خطأ أثناء التحليل: ${err.message}`;
                    if (errorMessage.includes("API key") || errorMessage.includes("authentication") || errorMessage.includes("was not found")) {
                        displayError = "مفتاح API لـ Gemini غير صالح أو غير متوفر. الرجاء إعادة المحاولة بعد تحديد مفتاح صالح.";
                        setIsApiKeyReady(false);
                    }
                } else {
                    displayError = `حدث خطأ غير معروف: ${String(err)}`;
                }
                setAnalysisResults(prev => ({
                    ...prev,
                    [image.id]: { isLoading: false, result: null, error: displayError }
                }));
            }
        }
    };
    
    const handleSendToCase = async () => {
        if (!selectedCaseId) {
            alert("الرجاء اختيار قضية أولاً.");
            return;
        }

        const successfulAnalyses = Object.entries(analysisResults)
            .filter(([, res]) => res.result)
            .map(([id, res]) => ({
                id,
                result: res.result!,
                image: selectedImages.find(img => img.id === id)!
            }));

        if (successfulAnalyses.length === 0) {
            alert("لا توجد نتائج تحليل ناجحة لإرسالها.");
            return;
        }

        setIsSending(true);
        try {
            const caseToUpdate = await dbService.getCase(selectedCaseId);
            if (!caseToUpdate) {
                throw new Error("لم يتم العثور على القضية المحددة.");
            }

            const analysisSummary = successfulAnalyses
                .map((analysis, index) => `--- تحليل المستند ${index + 1} (${analysis.image.file.name}) ---\n${analysis.result}`)
                .join('\n\n');

            const analysisMessage: ChatMessage = {
                id: uuidv4(),
                role: 'user',
                content: `تم تحليل المستندات التالية وإضافتها إلى القضية:\n\n${analysisSummary}`,
                images: successfulAnalyses.map(a => ({ dataUrl: a.image.dataUrl, mimeType: a.image.file.type })),
            };
            
            caseToUpdate.chatHistory.push(analysisMessage);
            await dbService.updateCase(caseToUpdate);

            alert("تم إرسال التحليلات بنجاح إلى القضية!");
            navigate(`/case/${selectedCaseId}`);

        } catch (error) {
            console.error("Failed to send to case:", error);
            alert(`فشل إرسال التحليلات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleSelectApiKey = async () => {
        if (window.aistudio?.openSelectKey) {
            try {
                await window.aistudio.openSelectKey();
                setIsApiKeyReady(true);
            } catch (error) {
                console.error("Error opening Gemini API key selector:", error);
            }
        }
    };

    if (isApiKeyReady === null) {
        return <div className="text-center p-8">جاري التحقق من الإعدادات...</div>;
    }
    
    if (!isApiKeyReady) {
        return (
          <div className="w-full flex-grow flex flex-col items-center justify-center text-center p-4">
              <h2 className="text-2xl font-bold mb-4 text-gray-200">مطلوب مفتاح Google AI API</h2>
              <p className="text-gray-400 mb-6 max-w-2xl">
                لاستخدام ميزة تحليل الصور، يرجى تحديد مفتاح Google AI API الخاص بك عبر النافذة المنبثقة، أو إدخاله يدويًا في <Link to="/settings" className="text-blue-400 hover:underline">صفحة الإعدادات</Link>.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                {window.aistudio && (
                    <button onClick={handleSelectApiKey} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">تحديد مفتاح عبر Google AI</button>
                )}
                 <Link to="/settings" className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">الانتقال إلى الإعدادات</Link>
              </div>
          </div>
        );
    }
    
    const canAnalyze = selectedImages.length > 0 && selectedImages.some(img => !analysisResults[img.id]);
    const canSend = Object.values(analysisResults).some(r => r.result) && selectedCaseId;

    return (
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-3">🖼️ تحليل المستندات والصور</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Input */}
                <div className="space-y-6">
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-200 mb-4">1. رفع الصور</h2>
                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full h-full text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                <p className="mt-2 text-lg">انقر لرفع صورة أو أكثر</p>
                                <p className="text-sm">يمكنك تحديد عدة ملفات</p>
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-200 mb-4">2. أدخل الطلب (موحد لجميع الصور)</h2>
                         <textarea id="prompt-text" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={3} />
                    </div>

                    <div className="text-center">
                        <button className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors text-lg" onClick={handleAnalyze} disabled={!canAnalyze}>
                            3. ابدأ التحليل
                        </button>
                    </div>

                    <div className="bg-gray-800 rounded-lg shadow-lg p-6 mt-6 border-t-4 border-green-500">
                        <h2 className="text-xl font-semibold text-gray-200 mb-4">4. إرسال إلى قضية</h2>
                        <p className="text-sm text-gray-400 mb-3">اختر قضية من القائمة لإضافة الصور ونتائج تحليلها إليها.</p>
                        <select value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4">
                            <option value="" disabled>-- اختر قضية --</option>
                            {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <button className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors" onClick={handleSendToCase} disabled={!canSend || isSending}>
                            {isSending ? "جاري الإرسال..." : "إرسال النتائج إلى القضية المختارة"}
                        </button>
                    </div>
                </div>

                {/* Right Column: Output */}
                <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-200 mb-4">📤 المخرجات</h2>
                    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
                        {selectedImages.length === 0 && <p className="text-gray-500 text-center pt-10">لم يتم رفع أي صور بعد.</p>}
                        {selectedImages.map(image => (
                            <div key={image.id} className="bg-gray-900 rounded-md p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <p className="text-sm font-medium text-gray-400 truncate flex-grow me-2">{image.file.name}</p>
                                    <button onClick={() => removeImage(image.id)} className="p-1 text-gray-500 hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                                <img src={image.dataUrl} alt={image.file.name} className="max-h-48 rounded-lg mx-auto shadow-md mb-4" />
                                <div className="bg-gray-800 rounded p-3 min-h-[80px]">
                                    {analysisResults[image.id]?.isLoading && <div className="text-center text-gray-400">جاري التحليل...</div>}
                                    {analysisResults[image.id]?.error && <p className="text-red-400 text-sm">{analysisResults[image.id]?.error}</p>}
                                    {analysisResults[image.id]?.result && <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(analysisResults[image.id]!.result!) as string) }}></div>}
                                    {!analysisResults[image.id] && <p className="text-gray-600 text-center text-sm">في انتظار التحليل</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OcrPage;
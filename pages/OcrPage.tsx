import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyzeImageWithGemini, proofreadTextWithGemini } from './geminiService';
import { analyzeImageWithOpenRouter, proofreadTextWithOpenRouter } from '../services/openRouterService';
import { OPENROUTER_FREE_MODELS } from '../constants';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import * as dbService from '../services/dbService';
import { Case, ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configure the worker for pdf.js, pointing to the CDN-hosted script
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@5.4.394/build/pdf.worker.js';


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
    status: string | null;
    result: string | null;
    error: string | null;
    tags?: string[];
};

type AnalysisType = 'ai' | 'ocr';
type AnalysisProvider = 'gemini' | 'openrouter';
type AnalysisProcessState = 'idle' | 'running' | 'paused' | 'done';


const OcrPage: React.FC = () => {
    const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
    const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});
    
    // API Provider State
    const [analysisProvider, setAnalysisProvider] = useState<AnalysisProvider>('gemini');
    const [openRouterModelForOcr, setOpenRouterModelForOcr] = useState<string>('');
    const [isGeminiApiKeyReady, setIsGeminiApiKeyReady] = useState<boolean | null>(null);
    const [isOpenRouterApiKeyReady, setIsOpenRouterApiKeyReady] = useState<boolean | null>(null);

    const [prompt, setPrompt] = useState<string>('ما الذي تراه في هذه الصورة؟ اشرح بالتفصيل.');
    const [analysisType, setAnalysisType] = useState<AnalysisType>('ai');
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [isSending, setIsSending] = useState(false);
    const [loadingFiles, setLoadingFiles] = useState<Record<string, { name: string; progress: number }>>({});
    const [isProcessingPdf, setIsProcessingPdf] = useState(false);
    const [pdfProcessingMessage, setPdfProcessingMessage] = useState('');
    const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
    
    // State management for pause/resume functionality
    const [analysisState, setAnalysisState] = useState<AnalysisProcessState>('idle');
    const [imagesToAnalyzeQueue, setImagesToAnalyzeQueue] = useState<SelectedImage[]>([]);
    const [currentAnalysisIndex, setCurrentAnalysisIndex] = useState(0);
    const [totalToAnalyze, setTotalToAnalyze] = useState(0);


    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadInitialData = async () => {
            // Check for Gemini API key
            const storedGeminiKey = await dbService.getSetting<string>('geminiApiKey');
            const hasAiStudioKey = window.aistudio?.hasSelectedApiKey ? await window.aistudio.hasSelectedApiKey() : false;
            setIsGeminiApiKeyReady(!!storedGeminiKey || hasAiStudioKey);

            // Check for OpenRouter API key
            const storedOpenRouterKey = await dbService.getSetting<string>('openRouterApiKey');
            setIsOpenRouterApiKeyReady(!!storedOpenRouterKey);

            // Set default model for OpenRouter OCR from valid image models
            const imageModels = OPENROUTER_FREE_MODELS.filter(m => m.supportsImages);
            setOpenRouterModelForOcr(imageModels.length > 0 ? imageModels[0].id : '');

            // Load cases for the dropdown
            const loadedCases = await dbService.getAllCases();
            setCases(loadedCases.sort((a, b) => b.createdAt - a.createdAt));
        };
        loadInitialData();
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;
    
        // FIX: Iterate over FileList directly. `Array.from(files)` can cause type inference issues.
        for (const file of files) {
            const tempId = uuidv4();
            
            setLoadingFiles(prev => ({ ...prev, [tempId]: { name: file.name, progress: 0 } }));
    
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const progress = (e.loaded / e.total) * 100;
                        setLoadingFiles(prev => prev[tempId] ? { ...prev, [tempId]: { ...prev[tempId], progress } } : prev);
                    }
                };
                reader.onload = (e) => {
                    const newImage = { id: uuidv4(), file, dataUrl: e.target?.result as string };
                    setSelectedImages(prev => [...prev, newImage]);
                    setLoadingFiles(prev => {
                        const newState = { ...prev };
                        delete newState[tempId];
                        return newState;
                    });
                };
                reader.onerror = () => {
                     console.error("Error reading file:", file.name);
                     setLoadingFiles(prev => {
                        const newState = { ...prev };
                        delete newState[tempId];
                        return newState;
                    });
                };
                reader.readAsDataURL(file);
            } else if (file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const progress = (e.loaded / e.total) * 100;
                        setLoadingFiles(prev => prev[tempId] ? { ...prev, [tempId]: { ...prev[tempId], progress } } : prev);
                    }
                };
                reader.onload = async (e) => {
                     setLoadingFiles(prev => {
                        const newState = { ...prev };
                        delete newState[tempId];
                        return newState;
                    });
                    
                    setIsProcessingPdf(true);
                    try {
                        const typedarray = new Uint8Array(e.target!.result as ArrayBuffer);
                        const pdf = await pdfjsLib.getDocument(typedarray).promise;
                        
                        const newImages: SelectedImage[] = [];
                        for (let i = 1; i <= pdf.numPages; i++) {
                            setPdfProcessingMessage(`جاري تحويل الصفحة ${i} من ${pdf.numPages}...`);
                            const page = await pdf.getPage(i);
                            const viewport = page.getViewport({ scale: 2.0 }); // Increased scale for better quality
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
    
                            if (context) {
                                // FIX: Add the `canvas` property to the `render` parameters. The type definitions for this version of pdfjs-dist seem to require it.
                                await page.render({ canvas, canvasContext: context, viewport: viewport }).promise;
                                const dataUrl = canvas.toDataURL('image/png');
                                // Create a File-like object to maintain type consistency
                                const pageFile = {
                                    name: `${file.name} (صفحة ${i})`,
                                    type: 'image/png'
                                } as File;
                                newImages.push({ id: uuidv4(), file: pageFile, dataUrl });
                            }
                        }
                        setSelectedImages(prev => [...prev, ...newImages]);
                    } catch (pdfError) {
                        console.error("Error processing PDF:", pdfError);
                        alert(`فشل في معالجة ملف PDF: ${pdfError instanceof Error ? pdfError.message : 'خطأ غير معروف'}`);
                    } finally {
                       setIsProcessingPdf(false);
                       setPdfProcessingMessage('');
                    }
                };
                 reader.onerror = () => {
                     console.error("Error reading PDF file:", file.name);
                     setLoadingFiles(prev => {
                        const newState = { ...prev };
                        delete newState[tempId];
                        return newState;
                    });
                };
                reader.readAsArrayBuffer(file);
            } else {
                alert('نوع الملف غير مدعوم. يرجى تحميل صورة أو ملف PDF.');
                setLoadingFiles(prev => {
                    const newState = { ...prev };
                    delete newState[tempId];
                    return newState;
                });
            }
        }
        // Clear the input value to allow re-uploading the same file
        if (event.target) {
            event.target.value = '';
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
    
    // Effect to process the next image in the queue when the state is 'running'
    useEffect(() => {
        if (analysisState !== 'running' || imagesToAnalyzeQueue.length === 0) {
            if (analysisState === 'running' && imagesToAnalyzeQueue.length === 0 && totalToAnalyze > 0) {
                setAnalysisState('done');
                setTimeout(() => {
                    setAnalysisState('idle');
                    setCurrentAnalysisIndex(0);
                    setTotalToAnalyze(0);
                }, 1500);
            }
            return;
        }
    
        let isCancelled = false;
    
        const processImage = async (image: SelectedImage) => {
            setAnalysisResults(prev => ({
                ...prev,
                [image.id]: { isLoading: true, status: 'في الانتظار...', result: null, error: null }
            }));
    
            try {
                let result: string;
                if (analysisType === 'ai') {
                     const finalPrompt = `${prompt}\n\nملاحظة هامة: يجب أن تكون إجابتك باللغة العربية فقط، دون أي رموز أو لغات أخرى.`;
                     if (analysisProvider === 'gemini') {
                        setAnalysisResults(prev => ({ ...prev, [image.id]: { ...prev[image.id]!, status: 'جاري التحليل عبر Gemini...' } }));
                        result = await analyzeImageWithGemini(image.dataUrl, image.file.type, finalPrompt);
                     } else { // openrouter
                        setAnalysisResults(prev => ({ ...prev, [image.id]: { ...prev[image.id]!, status: `جاري التحليل عبر ${openRouterModelForOcr}...` } }));
                        const apiKey = await dbService.getSetting<string>('openRouterApiKey');
                        if (!apiKey) throw new Error("مفتاح OpenRouter API غير موجود.");
                        result = await analyzeImageWithOpenRouter(apiKey, image.dataUrl, openRouterModelForOcr, finalPrompt);
                     }
                } else { // OCR
                    setAnalysisResults(prev => ({ ...prev, [image.id]: { ...prev[image.id]!, status: 'جاري تهيئة محرك OCR...' } }));
                    const tesseractResult = await Tesseract.recognize(image.dataUrl, 'ara', { 
                        logger: m => {
                            if (!isCancelled && m.status === 'recognizing text') {
                                setAnalysisResults(prev => ({ ...prev, [image.id]: { ...prev[image.id]!, status: `جاري استخلاص النص... ${Math.round(m.progress * 100)}%` } }));
                            }
                        } 
                    });
                    
                    const ocrText = tesseractResult.data.text;
                    if (!ocrText.trim()) {
                        result = "لم يتمكن محرك OCR من استخلاص أي نص من هذه الصورة.";
                    } else {
                        if (analysisProvider === 'gemini') {
                             setAnalysisResults(prev => ({ ...prev, [image.id]: { ...prev[image.id]!, status: 'جاري التدقيق اللغوي عبر Gemini...' } }));
                             result = await proofreadTextWithGemini(ocrText);
                        } else { // openrouter
                            setAnalysisResults(prev => ({ ...prev, [image.id]: { ...prev[image.id]!, status: 'جاري التدقيق اللغوي عبر OpenRouter...' } }));
                            const apiKey = await dbService.getSetting<string>('openRouterApiKey');
                             if (!apiKey) throw new Error("مفتاح OpenRouter API غير موجود.");
                            // We can use any powerful model for proofreading, even an image one.
                            result = await proofreadTextWithOpenRouter(apiKey, ocrText, openRouterModelForOcr);
                        }
                    }
                }
                if (!isCancelled) {
                    setAnalysisResults(prev => ({
                        ...prev,
                        [image.id]: { isLoading: false, status: null, result, error: null, tags: [] }
                    }));
                }
            } catch (err) {
                if (!isCancelled) {
                    console.error("Analysis Error:", err);
                    let displayError: string;
                    if (err instanceof Error) {
                        const errorMessage = err.toString();
                        if (errorMessage.includes("API key") || errorMessage.includes("authentication") || errorMessage.includes("was not found")) {
                             displayError = `مفتاح API لـ ${analysisProvider} غير صالح أو غير متوفر. الرجاء إعادة المحاولة بعد تحديد مفتاح صالح.`;
                             if (analysisProvider === 'gemini') setIsGeminiApiKeyReady(false);
                             else setIsOpenRouterApiKeyReady(false);
                        } else {
                            displayError = `حدث خطأ أثناء التحليل: ${err.message}`;
                        }
                    } else {
                        displayError = `حدث خطأ غير معروف: ${String(err)}`;
                    }
                    setAnalysisResults(prev => ({
                        ...prev,
                        [image.id]: { isLoading: false, status: null, result: null, error: displayError }
                    }));
                }
            } finally {
                if (!isCancelled) {
                    setCurrentAnalysisIndex(prev => prev + 1);
                    setImagesToAnalyzeQueue(prev => prev.slice(1));
                }
            }
        };
    
        processImage(imagesToAnalyzeQueue[0]);
    
        return () => {
            isCancelled = true;
        };
    }, [analysisState, imagesToAnalyzeQueue]);

    const handleStartAnalysis = () => {
        const imagesToProcess = selectedImages.filter(img => !analysisResults[img.id]?.result);
        if (imagesToProcess.length === 0) return;

        setImagesToAnalyzeQueue(imagesToProcess);
        setTotalToAnalyze(imagesToProcess.length);
        setCurrentAnalysisIndex(0);
        setAnalysisState('running');
    };

    const handlePauseAnalysis = () => {
        setAnalysisState('paused');
    };

    const handleResumeAnalysis = () => {
        setAnalysisState('running');
    };

    const handleCancelAnalysis = () => {
        setAnalysisState('idle');
        setImagesToAnalyzeQueue([]);
        setCurrentAnalysisIndex(0);
        setTotalToAnalyze(0);
        // Reset loading states for any in-progress items
        Object.keys(analysisResults).forEach(key => {
            if (analysisResults[key].isLoading) {
                 setAnalysisResults(prev => ({...prev, [key]: {...prev[key], isLoading: false, status: 'تم الإلغاء' }}));
            }
        });
    };
    
     const handleTagInputChange = (imageId: string, value: string) => {
        setTagInputs(prev => ({ ...prev, [imageId]: value }));
    };

    const handleAddTag = (imageId: string) => {
        const newTag = tagInputs[imageId]?.trim();
        if (!newTag) return;

        setAnalysisResults(prev => {
            const currentResult = prev[imageId];
            if (!currentResult) return prev;
            
            const existingTags = currentResult.tags || [];
            if (existingTags.includes(newTag)) {
                // Clear input if tag already exists
                setTagInputs(p => ({ ...p, [imageId]: '' }));
                return prev;
            }

            return {
                ...prev,
                [imageId]: { ...currentResult, tags: [...existingTags, newTag] }
            };
        });
        setTagInputs(prev => ({ ...prev, [imageId]: '' }));
    };

    const handleRemoveTag = (imageId: string, tagToRemove: string) => {
        setAnalysisResults(prev => {
            const currentResult = prev[imageId];
            if (!currentResult || !currentResult.tags) return prev;

            return {
                ...prev,
                [imageId]: { ...currentResult, tags: currentResult.tags.filter(t => t !== tagToRemove) }
            };
        });
    };

    const handleSendToCase = async () => {
        if (!selectedCaseId) {
            alert("الرجاء اختيار قضية أو إنشاء واحدة جديدة.");
            return;
        }

        const successfulAnalyses = (Object.entries(analysisResults) as [string, AnalysisResult][])
            .filter(([, res]) => res.result)
            .map(([id, res]) => ({
                id,
                result: res.result!,
                tags: res.tags,
                image: selectedImages.find(img => img.id === id)!
            }));

        if (successfulAnalyses.length === 0) {
            alert("لا توجد نتائج تحليل ناجحة لإرسالها.");
            return;
        }
    
        setIsSending(true);
        try {
            const analysisSummary = successfulAnalyses
                .map((analysis, index) => {
                    const header = analysisType === 'ai'
                        ? `--- تحليل المستند ${index + 1} (${analysis.image.file.name}) ---`
                        : `--- نص مستخلص (OCR) من المستند ${index + 1} (${analysis.image.file.name}) ---`;

                    let tagsHeader = '';
                    if (analysis.tags && analysis.tags.length > 0) {
                       tagsHeader = `\n**التصنيفات:** ${analysis.tags.join(', ')}\n`;
                    }

                    return `${header}${tagsHeader}\n${analysis.result}`;
                })
                .join('\n\n');
            
            const messageContent = analysisType === 'ai'
                ? `تم تحليل المستندات التالية باستخدام الذكاء الاصطناعي وإضافتها إلى القضية:\n\n${analysisSummary}`
                : `تم استخلاص النص وتصنيفه من المستندات التالية وإضافته إلى القضية:\n\n${analysisSummary}`;
    
            const analysisMessage: ChatMessage = {
                id: uuidv4(),
                role: 'user',
                content: messageContent,
                // Images are intentionally omitted here to only send the text summary.
            };
    
            if (selectedCaseId === '__NEW__') {
                const firstAnalysis = successfulAnalyses[0];
                const newCaseTitle = `تحليل مستندات بتاريخ ${new Date().toLocaleString('ar-EG')}`;
                const summary = firstAnalysis.result.substring(0, 150) + (firstAnalysis.result.length > 150 ? '...' : '');
    
                const newCase: Case = {
                    id: uuidv4(),
                    title: newCaseTitle,
                    summary: summary,
                    chatHistory: [analysisMessage],
                    createdAt: Date.now(),
                    status: 'جديدة',
                };
    
                await dbService.addCase(newCase);
                alert("تم إنشاء القضية الجديدة وإرسال النتائج بنجاح!");
                navigate(`/case/${newCase.id}`);
    
            } else {
                const caseToUpdate = await dbService.getCase(selectedCaseId);
                if (!caseToUpdate) {
                    throw new Error("لم يتم العثور على القضية المحددة.");
                }
                caseToUpdate.chatHistory.push(analysisMessage);
                await dbService.updateCase(caseToUpdate);
    
                alert("تم إرسال النتائج بنجاح إلى القضية!");
                navigate(`/case/${selectedCaseId}`);
            }
    
        } catch (error) {
            console.error("Failed to send to case:", error);
            alert(`فشل إرسال النتائج: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleSelectApiKey = async () => {
        if (window.aistudio?.openSelectKey) {
            try {
                await window.aistudio.openSelectKey();
                setIsGeminiApiKeyReady(true);
            } catch (error) {
                console.error("Error opening Gemini API key selector:", error);
            }
        }
    };
    
    const isUploading = Object.keys(loadingFiles).length > 0 || isProcessingPdf;
    const isAnalyzing = analysisState === 'running' || analysisState === 'paused';
    const hasFilesToAnalyze = selectedImages.length > 0 && selectedImages.some(img => !analysisResults[img.id]?.result);
    const isCurrentProviderApiKeyReady = analysisProvider === 'gemini' ? isGeminiApiKeyReady : isOpenRouterApiKeyReady;

    if (isCurrentProviderApiKeyReady === null) {
        return <div className="text-center p-8">جاري التحقق من الإعدادات...</div>;
    }
    
    if (!isCurrentProviderApiKeyReady) {
        const isGemini = analysisProvider === 'gemini';
        return (
          <div className="w-full flex-grow flex flex-col items-center justify-center text-center p-4">
              <h2 className="text-2xl font-bold mb-4 text-gray-200">
                {isGemini ? 'مطلوب مفتاح Google AI API' : 'مطلوب مفتاح OpenRouter API'}
              </h2>
               {isGemini ? (
                <p className="text-gray-400 mb-6 max-w-2xl">
                    لاستخدام ميزة تحليل الصور، يرجى تحديد مفتاح Google AI API الخاص بك عبر النافذة المنبثقة، أو إدخاله يدويًا في <Link to="/settings" className="text-blue-400 hover:underline">صفحة الإعدادات</Link>.
                </p>
               ) : (
                <p className="text-gray-400 mb-6 max-w-2xl">
                    لاستخدام OpenRouter، يرجى إدخال مفتاح API الخاص بك في <Link to="/settings" className="text-blue-400 hover:underline">صفحة الإعدادات</Link>.
                </p>
               )}
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                {isGemini && window.aistudio && (
                    <button onClick={handleSelectApiKey} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">تحديد مفتاح عبر Google AI</button>
                )}
                 <Link to="/settings" className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">الانتقال إلى الإعدادات</Link>
              </div>
          </div>
        );
    }
    
    // FIX: Explicitly cast result of Object.values to fix type inference issues.
    const canSend = (Object.values(analysisResults) as AnalysisResult[]).some(r => r.result) && selectedCaseId;

    return (
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-3">🖼️ تحليل المستندات والصور</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Input */}
                <div className="space-y-6">
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-200 mb-4">1. رفع الملفات</h2>
                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                            <input type="file" accept="image/*,application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || isAnalyzing} className="w-full h-full text-gray-400 disabled:cursor-wait">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                <p className="mt-2 text-lg">انقر لرفع صورة أو PDF</p>
                                <p className="text-sm">يمكنك تحديد عدة ملفات</p>
                            </button>
                        </div>
                         {Object.keys(loadingFiles).length > 0 && (
                            <div className="mt-4 space-y-2">
                                <h3 className="text-sm font-medium text-gray-300">جاري الرفع...</h3>
                                {/* FIX: Explicitly cast result of Object.entries to fix type inference issues. */}
                                {(Object.entries(loadingFiles) as [string, { name: string, progress: number }][]).map(([id, { name, progress }]) => (
                                    <div key={id}>
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span className="truncate max-w-[70%]">{name}</span>
                                            <span>{Math.round(progress)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-600 rounded-full h-1.5 mt-1">
                                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {isProcessingPdf && (
                             <div className="mt-4 flex items-center text-sm text-yellow-400">
                                <svg className="animate-spin h-4 w-4 me-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>{pdfProcessingMessage}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-200 mb-4">2. اختر نوع التحليل</h2>
                        
                        <div className="mb-4">
                            <h3 className="text-md font-semibold text-gray-300 mb-2">مزود الخدمة</h3>
                             <div className="flex items-center space-x-2 space-x-reverse bg-gray-700 rounded-lg p-1">
                                <button onClick={() => setAnalysisProvider('gemini')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${analysisProvider === 'gemini' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                                    Google Gemini
                                </button>
                                <button onClick={() => setAnalysisProvider('openrouter')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${analysisProvider === 'openrouter' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                                    OpenRouter
                                </button>
                            </div>
                        </div>

                        {analysisProvider === 'openrouter' && (
                            <div className="mb-4">
                                <label htmlFor="or-model-ocr" className="block text-sm font-medium text-gray-300 mb-2">اختر نموذج OpenRouter (يدعم الصور):</label>
                                <select 
                                    id="or-model-ocr" 
                                    value={openRouterModelForOcr} 
                                    onChange={(e) => setOpenRouterModelForOcr(e.target.value)}
                                    disabled={isUploading || isAnalyzing}
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                                >
                                    {OPENROUTER_FREE_MODELS.filter(m => m.supportsImages).map(model => (
                                        <option key={model.id} value={model.id}>{model.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-700">
                             <h3 className="text-md font-semibold text-gray-300 mb-2">نوع التحليل</h3>
                            <div className="flex items-center space-x-2 space-x-reverse bg-gray-700 rounded-lg p-1 mb-4">
                                <button onClick={() => setAnalysisType('ai')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${analysisType === 'ai' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                                    تحليل بالذكاء الاصطناعي
                                </button>
                                <button onClick={() => setAnalysisType('ocr')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${analysisType === 'ocr' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                                    استخلاص النص وتصنيفه (OCR)
                                </button>
                            </div>
                            {analysisType === 'ai' && (
                                <div>
                                    <label htmlFor="prompt-text" className="block text-sm font-medium text-gray-300 mb-2">أدخل الطلب (موحد لجميع الملفات):</label>
                                    <textarea id="prompt-text" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={isUploading || isAnalyzing} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50" rows={3} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-200 mb-4">3. ابدأ التحليل</h2>
                        <div className="space-y-2">
                             {analysisState === 'idle' || analysisState === 'done' ? (
                                <button
                                    className="w-full px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors text-lg"
                                    onClick={handleStartAnalysis}
                                    disabled={!hasFilesToAnalyze || isUploading}
                                >
                                    {analysisState === 'done' ? 'اكتمل التحليل' : `ابدأ تحليل (${selectedImages.filter(img => !analysisResults[img.id]?.result).length}) ملفات`}
                                </button>
                            ) : analysisState === 'running' ? (
                                <button
                                    className="w-full px-8 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors text-lg flex items-center justify-center"
                                    onClick={handlePauseAnalysis}
                                >
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    إيقاف مؤقت
                                </button>
                            ) : ( // paused state
                                <div className="flex gap-x-2">
                                    <button
                                        className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                                        onClick={handleResumeAnalysis}
                                    >
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                        </svg>
                                        استئناف التحليل
                                    </button>
                                    <button
                                        className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                                        onClick={handleCancelAnalysis}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        إلغاء
                                    </button>
                                </div>
                            )}
                        </div>
                        {isAnalyzing && totalToAnalyze > 0 && (
                            <div className="mt-4">
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-300">
                                        إجمالي التقدم ({currentAnalysisIndex} / {totalToAnalyze})
                                    </span>
                                    <span className="text-sm font-medium text-gray-300">
                                        {Math.round((currentAnalysisIndex / totalToAnalyze) * 100)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-600 rounded-full h-2.5">
                                    <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(currentAnalysisIndex / totalToAnalyze) * 100}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-800 rounded-lg shadow-lg p-6 mt-6 border-t-4 border-green-500">
                        <h2 className="text-xl font-semibold text-gray-200 mb-4">4. إرسال إلى قضية</h2>
                        <p className="text-sm text-gray-400 mb-3">اختر قضية من القائمة أو أنشئ واحدة جديدة لإضافة الملفات ونتائج تحليلها إليها.</p>
                        <select value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} disabled={isUploading || isAnalyzing} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4 disabled:opacity-50">
                            <option value="" disabled>-- اختر قضية أو أنشئ واحدة --</option>
                            <option value="__NEW__">➕ إنشاء قضية جديدة</option>
                            {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <button 
                            className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors" 
                            onClick={handleSendToCase} 
                            disabled={!canSend || isSending || isUploading || isAnalyzing}
                        >
                            {isSending ? "جاري الحفظ..." : selectedCaseId === '__NEW__' ? "إنشاء قضية جديدة وإرسال النتائج" : "إرسال النتائج إلى القضية المختارة"}
                        </button>
                    </div>
                </div>

                {/* Right Column: Output */}
                <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-200 mb-4">📤 المخرجات</h2>
                    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
                        {selectedImages.length === 0 && <p className="text-gray-500 text-center pt-10">لم يتم رفع أي ملفات بعد.</p>}
                        {selectedImages.map(image => (
                            <div key={image.id} className="bg-gray-900 rounded-md p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <p className="text-sm font-medium text-gray-400 truncate flex-grow me-2">{image.file.name}</p>
                                    <button onClick={() => removeImage(image.id)} className="p-1 text-gray-500 hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                                <img src={image.dataUrl} alt={image.file.name} className="max-h-48 rounded-lg mx-auto shadow-md mb-4 border border-gray-700" />
                                <div className="bg-gray-800 rounded p-3 min-h-[80px]">
                                    {analysisResults[image.id]?.isLoading && (
                                        <div className="flex flex-col items-center justify-center text-center text-gray-400">
                                             <svg className="animate-spin h-6 w-6 mb-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                             <p className="text-sm">{analysisResults[image.id]?.status || 'جاري المعالجة...'}</p>
                                        </div>
                                    )}
                                    {analysisResults[image.id]?.error && <p className="text-red-400 text-sm">{analysisResults[image.id]?.error}</p>}
                                    {analysisResults[image.id]?.result && (
                                        <>
                                            <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(analysisResults[image.id]!.result!) as string) }}></div>
                                            
                                            {analysisType === 'ocr' && (
                                                <div className="mt-4 border-t border-gray-700 pt-3">
                                                    <h4 className="text-xs font-semibold text-gray-400 mb-2">التصنيفات</h4>
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {analysisResults[image.id]?.tags?.map(tag => (
                                                            <span key={tag} className="bg-teal-500/20 text-teal-300 text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
                                                                {tag}
                                                                <button onClick={() => handleRemoveTag(image.id, tag)} className="ms-1.5 text-teal-400 hover:text-white">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-x-2">
                                                        <input
                                                            type="text"
                                                            value={tagInputs[image.id] || ''}
                                                            onChange={(e) => handleTagInputChange(image.id, e.target.value)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(image.id); } }}
                                                            className="flex-grow bg-gray-700 border border-gray-600 rounded-md p-1.5 text-sm text-gray-200 focus:ring-blue-500 focus:outline-none"
                                                            placeholder="أضف تصنيف..."
                                                        />
                                                        <button onClick={() => handleAddTag(image.id)} className="px-3 py-1.5 bg-gray-600 text-gray-200 text-sm rounded-md hover:bg-gray-500">إضافة</button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
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
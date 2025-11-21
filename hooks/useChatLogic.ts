
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Case, ChatMessage, ApiSource, OpenRouterModel, GroundingMetadata, ActionMode, LegalRegion } from '../types';
import * as dbService from '../services/dbService';
import { streamChatResponseFromGemini, countTokensForGemini, proofreadTextWithGemini, summarizeChatHistory } from '../pages/geminiService';
import { streamChatResponseFromOpenRouter } from '../services/openRouterService';
import { DEFAULT_OPENROUTER_MODELS } from '../constants';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@5.4.394/build/pdf.worker.js';

export const useChatLogic = (caseId?: string) => {
    const navigate = useNavigate();
    const [caseData, setCaseData] = useState<Case | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isApiKeyReady, setIsApiKeyReady] = useState<boolean | null>(null);
    const [apiSource, setApiSource] = useState<ApiSource>('gemini');
    const [region, setRegion] = useState<LegalRegion>('westbank'); 
    const [openRouterApiKey, setOpenRouterApiKey] = useState<string>('');
    const [openRouterModel, setOpenRouterModel] = useState<string>(DEFAULT_OPENROUTER_MODELS[0].id);
    const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>(DEFAULT_OPENROUTER_MODELS);
    const [thinkingMode, setThinkingMode] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<{ dataUrl: string; mimeType: string } | null>(null);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    const [tokenCount, setTokenCount] = useState(0);
    const [authError, setAuthError] = useState<string | null>(null);
    const [actionMode, setActionMode] = useState<ActionMode>('analysis');
    const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [isPinnedPanelOpen, setIsPinnedPanelOpen] = useState(true);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    
    const isNewCase = !caseId;

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true); 
            try {
                const storedApiSource = await dbService.getSetting<ApiSource>('apiSource');
                if (storedApiSource) setApiSource(storedApiSource);

                const storedRegion = await dbService.getSetting<LegalRegion>('legalRegion');
                if (storedRegion) setRegion(storedRegion);

                const storedCustomModels = await dbService.getSetting<OpenRouterModel[]>('openRouterModels');
                const availableModels = storedCustomModels && storedCustomModels.length > 0 ? storedCustomModels : DEFAULT_OPENROUTER_MODELS;
                setOpenRouterModels(availableModels);

                if (storedApiSource === 'openrouter') {
                    const storedApiKey = await dbService.getSetting<string>('openRouterApiKey');
                    const storedModel = await dbService.getSetting<string>('openRouterModel');
                    if (storedModel && availableModels.some(m => m.id === storedModel)) {
                        setOpenRouterModel(storedModel.replace(/:free$/, ''));
                    } else {
                        setOpenRouterModel(availableModels[0].id);
                    }

                    if (storedApiKey && storedApiKey.trim().length > 0) {
                        setOpenRouterApiKey(storedApiKey.trim());
                        setIsApiKeyReady(true);
                    } else {
                        setIsApiKeyReady(false);
                    }
                } else {
                    const storedGeminiKey = await dbService.getSetting<string>('geminiApiKey');
                    const hasStoredKey = !!storedGeminiKey && storedGeminiKey.trim().length > 0;
                    const hasEnvKey = !!process.env.API_KEY && process.env.API_KEY.trim().length > 0;
                    
                    let hasAiStudioKey = false;
                    try {
                        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                            hasAiStudioKey = await window.aistudio.hasSelectedApiKey();
                        }
                    } catch (e) { console.warn("AI Studio check failed", e); }

                    setIsApiKeyReady(hasStoredKey || hasEnvKey || hasAiStudioKey);
                }

                if (!isNewCase) {
                    const loadedCase = await dbService.getCase(caseId);
                    if (loadedCase) {
                        setCaseData(loadedCase);
                        setChatHistory(loadedCase.chatHistory);
                        setPinnedMessages(loadedCase.pinnedMessages || []);
                        if (storedApiSource !== 'openrouter') {
                            countTokensForGemini(loadedCase.chatHistory).then(setTokenCount);
                        }
                    } else {
                        // Case not found (maybe deleted or bad ID)
                        console.warn("Case not found in DB");
                    }
                } else {
                    setChatHistory([]);
                    setPinnedMessages([]);
                    setTokenCount(0);
                }
            } catch (error) {
                console.error("Failed to load initial data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [caseId, isNewCase, navigate]);

    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [chatHistory]);

    const handleSelectApiKey = async () => {
        if (apiSource === 'gemini' && window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            try {
                await window.aistudio.openSelectKey();
                const hasKey = await window.aistudio.hasSelectedApiKey();
                if (hasKey) setIsApiKeyReady(true);
            } catch (error) {
                console.error("Error opening Gemini API key selector:", error);
            }
        } else {
            navigate('/settings');
        }
    };

    const handlePinMessage = async (messageToPin: ChatMessage) => {
        const isPinned = pinnedMessages.some(p => p.id === messageToPin.id);
        if (isPinned) return;

        const newPinnedMessages = [...pinnedMessages, messageToPin];
        setPinnedMessages(newPinnedMessages);

        if (caseData) {
            const updatedCase = { ...caseData, pinnedMessages: newPinnedMessages };
            await dbService.updateCase(updatedCase);
            setCaseData(updatedCase);
        }
    };

    const handleUnpinMessage = async (messageIdToUnpin: string) => {
        const newPinnedMessages = pinnedMessages.filter(p => p.id !== messageIdToUnpin);
        setPinnedMessages(newPinnedMessages);

        if (caseData) {
            const updatedCase = { ...caseData, pinnedMessages: newPinnedMessages };
            await dbService.updateCase(updatedCase);
            setCaseData(updatedCase);
        }
    };

    const handleSummarize = async () => {
        if (isSummaryLoading || isLoading || chatHistory.length === 0) return;

        setIsSummaryLoading(true);
        const tempSummaryMessage: ChatMessage = {
            id: uuidv4(),
            role: 'model',
            content: 'جاري إنشاء الملخص...',
            model: apiSource === 'gemini' ? 'gemini-2.5-flash' : openRouterModel,
        };

        const currentChatHistory = [...chatHistory, tempSummaryMessage];
        setChatHistory(currentChatHistory);

        try {
            if (apiSource !== 'gemini') {
                throw new Error("خاصية التلخيص متاحة حاليًا لـ Google Gemini فقط.");
            }

            const historyToSummarize = chatHistory.filter(m => m.id !== tempSummaryMessage.id);
            const summaryText = await summarizeChatHistory(historyToSummarize);

            const finalSummaryContent = `**ملخص المحادثة:**\n\n${summaryText}`;

            const finalHistory = currentChatHistory.map(msg =>
                msg.id === tempSummaryMessage.id ? { ...msg, content: finalSummaryContent } : msg
            );
            setChatHistory(finalHistory);

            if (caseData) {
                const updatedCase = { ...caseData, chatHistory: finalHistory, summary: summaryText.substring(0, 150) };
                await dbService.updateCase(updatedCase);
                setCaseData(updatedCase);
            }

        } catch (error: any) {
            console.error("Summarization error:", error);
            const errorMessage = `**خطأ في التلخيص:** ${error.message || 'فشل إنشاء الملخص.'}`;
            setChatHistory(prev => prev.map(msg =>
                msg.id === tempSummaryMessage.id ? { ...msg, content: errorMessage, isError: true } : msg
            ));
        } finally {
            setIsSummaryLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadedImage(null);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setUploadedImage({ dataUrl: e.target?.result as string, mimeType: file.type });
            };
            reader.readAsDataURL(file);

            setIsProcessingFile(true);
            setProcessingMessage('جاري تهيئة محرك استخلاص النصوص...');

            Tesseract.recognize(
                file,
                'ara',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            setProcessingMessage(`جاري استخلاص النص... ${Math.round(m.progress * 100)}%`);
                        }
                    }
                }
            ).then(async ({ data: { text } }) => {
                if (!text.trim()) {
                    setIsProcessingFile(false);
                    setProcessingMessage('');
                    return;
                }

                setProcessingMessage('جاري تدقيق النص المستخلص لغوياً...');
                const correctedText = await proofreadTextWithGemini(text);

                setUserInput(prev => prev.trim() + (prev.trim() ? '\n\n' : '') + `--- نص مستخلص ومصحح من صورة: ${file.name} ---\n` + correctedText.trim());
            }).catch(ocrError => {
                console.error("Error during OCR:", ocrError);
                alert(`فشل في استخلاص النص من الصورة: ${ocrError instanceof Error ? ocrError.message : 'خطأ غير معروف'}`);
            }).finally(() => {
                setIsProcessingFile(false);
                setProcessingMessage('');
            });

        } else if (file.type === 'application/pdf') {
            setIsProcessingFile(true);
            setProcessingMessage('جاري معالجة ملف PDF...');
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const typedarray = new Uint8Array(e.target!.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        setProcessingMessage(`جاري معالجة الصفحة ${i} من ${pdf.numPages}...`);
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
                        fullText += pageText + '\n\n';
                    }
                    setUserInput(prev => prev.trim() + (prev.trim() ? '\n\n' : '') + `--- محتوى من ملف PDF: ${file.name} ---\n` + fullText.trim());
                } catch (pdfError) {
                    console.error("Error processing PDF:", pdfError);
                    alert(`فشل في معالجة ملف PDF: ${pdfError instanceof Error ? pdfError.message : 'خطأ غير معروف'}`);
                } finally {
                    setIsProcessingFile(false);
                    setProcessingMessage('');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert('نوع الملف غير مدعوم. يرجى تحميل صورة أو ملف PDF.');
        }
        event.target.value = '';
    };

    const processStream = useCallback(async (
        stream: AsyncGenerator<{ text: string; model: string; groundingMetadata?: GroundingMetadata }>,
        tempModelMessageId: string
    ) => {
        let fullResponse = '';
        let responseModel = '';
        let groundingMetadata: GroundingMetadata | undefined;
        let wasAborted = false;

        try {
            for await (const chunk of stream) {
                if (chunk.text) {
                    fullResponse += chunk.text;
                }
                responseModel = chunk.model;

                if (chunk.groundingMetadata) {
                    groundingMetadata = chunk.groundingMetadata;
                }

                setChatHistory(prev =>
                    prev.map(msg =>
                        msg.id === tempModelMessageId ? {
                            ...msg,
                            content: fullResponse,
                            model: responseModel,
                            groundingMetadata: groundingMetadata
                        } : msg
                    )
                );
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                throw e;
            } else {
                wasAborted = true;
            }
        }

        if (wasAborted) {
            const stoppedMessage = '\n\n**(تم إيقاف الإنشاء)**';
            fullResponse += stoppedMessage;
            setChatHistory(prev =>
                prev.map(msg =>
                    msg.id === tempModelMessageId ? { ...msg, content: fullResponse, model: responseModel, groundingMetadata } : msg
                )
            );
        }

        return { fullResponse, responseModel, groundingMetadata };
    }, []);

    const handleSendMessage = async (prompt?: string) => {
        setAuthError(null);
        const messageContent = (prompt || userInput).trim();
        if (isLoading || isProcessingFile || (!messageContent && !uploadedImage)) return;

        if (apiSource === 'openrouter' && uploadedImage) {
            const selectedModelInfo = openRouterModels.find(m => m.id === openRouterModel);
            if (!selectedModelInfo?.supportsImages) {
                alert(`النموذج المحدد (${selectedModelInfo?.name || openRouterModel}) لا يدعم تحليل الصور.`);
                return;
            }
        }

        setIsLoading(true);

        const userMessage: ChatMessage = {
            id: uuidv4(),
            role: 'user',
            content: messageContent,
            images: uploadedImage ? [uploadedImage] : undefined,
        };

        setUserInput('');
        setUploadedImage(null);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        const tempModelMessage: ChatMessage = { role: 'model', content: '', id: uuidv4() };
        const newHistory = [...chatHistory, userMessage, tempModelMessage];
        setChatHistory(newHistory);

        abortControllerRef.current = new AbortController();

        // --- IMMEDIATE SAVE PROTOCOL ---
        const targetCaseId = caseId || uuidv4();
        let currentCaseData = caseData;

        try {
            const initialTitle = messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '') || 'قضية جديدة';
            const initialSummary = messageContent.substring(0, 150) + (messageContent.length > 150 ? '...' : '');

            // We save the history WITH the empty model message so the user sees something loading if they reload
            if (isNewCase) {
                const newCase: Case = {
                    id: targetCaseId,
                    title: initialTitle,
                    summary: initialSummary,
                    chatHistory: newHistory, 
                    pinnedMessages: [],
                    createdAt: Date.now(),
                    status: 'جديدة',
                    caseType: 'chat' // Default type
                };
                await dbService.addCase(newCase);
                currentCaseData = newCase;
            } else if (caseData) {
                const updatedCase = {
                    ...caseData,
                    chatHistory: newHistory,
                };
                await dbService.updateCase(updatedCase);
                currentCaseData = updatedCase;
            }
        } catch (saveError) {
            console.error("Failed to save initial case state:", saveError);
            setIsLoading(false);
            return;
        }

        // --- API CALL ---
        let finalResponseText = '';
        let finalModelName = '';
        let finalMetadata: GroundingMetadata | undefined;
        let finalIsError = false;

        try {
            let stream;
            const historyToSend = [...chatHistory, userMessage];

            if (apiSource === 'openrouter') {
                stream = streamChatResponseFromOpenRouter(openRouterApiKey, historyToSend, openRouterModel, actionMode, region, abortControllerRef.current.signal);
            } else {
                stream = streamChatResponseFromGemini(historyToSend, thinkingMode, actionMode, region, abortControllerRef.current.signal);
            }

            const { fullResponse, responseModel, groundingMetadata } = await processStream(stream, tempModelMessage.id);
            
            finalResponseText = fullResponse;
            finalModelName = responseModel;
            finalMetadata = groundingMetadata;

            if (apiSource === 'gemini') {
                countTokensForGemini([...historyToSend, { ...tempModelMessage, content: fullResponse }]).then(setTokenCount);
            }

        } catch (error: any) {
            console.error(`Error during ${apiSource} streaming:`, error);
            let chatErrorMessage = 'حدث خطأ أثناء معالجة الطلب.';
            const errorMessage = error.toString();
            const errorStatus = error.status;

            if (errorStatus === 401 || errorMessage.includes("API key") || errorMessage.includes("authentication") || errorMessage.includes("was not found")) {
                chatErrorMessage = `مفتاح API غير صالح أو تم رفضه لـ ${apiSource}. يرجى الانتقال إلى صفحة الإعدادات للتأكد من صحة المفتاح.`;
                setAuthError(chatErrorMessage);
            } else {
                chatErrorMessage = `حدث خطأ: ${error.message}`;
            }

            finalResponseText = chatErrorMessage;
            finalIsError = true;

            setChatHistory(prev =>
                prev.map(msg =>
                    msg.id === tempModelMessage.id ? { ...msg, content: chatErrorMessage, isError: true } : msg
                )
            );
        } finally {
            // --- FINAL SAVE PROTOCOL ---
            try {
                if (currentCaseData) {
                    const finalModelMsgObject: ChatMessage = {
                        id: tempModelMessage.id,
                        role: 'model',
                        content: finalResponseText,
                        model: finalModelName,
                        groundingMetadata: finalMetadata,
                        isError: finalIsError
                    };

                    const finalHistory = newHistory.map(msg => 
                        msg.id === tempModelMessage.id ? finalModelMsgObject : msg
                    );

                    const summarySnippet = finalIsError 
                        ? currentCaseData.summary 
                        : finalResponseText.substring(0, 150) + (finalResponseText.length > 150 ? '...' : '');

                    const finalCaseUpdate: Case = {
                        ...currentCaseData,
                        chatHistory: finalHistory,
                        summary: summarySnippet
                    };

                    await dbService.updateCase(finalCaseUpdate);
                    setCaseData(finalCaseUpdate);

                    if (isNewCase) {
                        navigate(`/case/${targetCaseId}`, { replace: true });
                    }
                }
            } catch (dbError) {
                console.error("Failed to save final response:", dbError);
            }

            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleStopGenerating = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    return {
        caseData,
        chatHistory,
        userInput,
        setUserInput,
        isLoading,
        isApiKeyReady,
        apiSource,
        thinkingMode,
        setThinkingMode,
        uploadedImage,
        setUploadedImage,
        isProcessingFile,
        processingMessage,
        tokenCount,
        authError,
        actionMode,
        setActionMode,
        pinnedMessages,
        isSummaryLoading,
        isPinnedPanelOpen,
        setIsPinnedPanelOpen,
        chatContainerRef,
        fileInputRef,
        textareaRef,
        handleSendMessage,
        handleStopGenerating,
        handleSummarize,
        handleSelectApiKey,
        handleFileChange,
        handlePinMessage,
        handleUnpinMessage
    };
};

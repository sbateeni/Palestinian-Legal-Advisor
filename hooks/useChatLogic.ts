
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
    const [region, setRegion] = useState<LegalRegion>('westbank'); // Default Region
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

    // 1. Initialization Effect
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

                    if (storedApiKey) {
                        setOpenRouterApiKey(storedApiKey);
                        setIsApiKeyReady(true);
                    } else {
                        setIsApiKeyReady(false);
                    }
                } else {
                    const storedGeminiKey = await dbService.getSetting<string>('geminiApiKey');
                    const hasAiStudioKey = window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function'
                        ? await window.aistudio.hasSelectedApiKey()
                        : false;

                    setIsApiKeyReady(!!storedGeminiKey || hasAiStudioKey);
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
                        console.error("Case not found");
                        navigate('/');
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

    // 2. Auto-scroll Effect
    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [chatHistory]);


    // 3. Helper Functions
    const handleSelectApiKey = async () => {
        if (apiSource === 'gemini' && window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            try {
                await window.aistudio.openSelectKey();
                setIsApiKeyReady(true);
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

    // 4. Summarization Logic
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

            if (isNewCase) {
                const newCase: Case = {
                    id: uuidv4(),
                    title: 'قضية جديدة (مع ملخص)',
                    summary: summaryText.substring(0, 150) + (summaryText.length > 150 ? '...' : ''),
                    chatHistory: finalHistory,
                    pinnedMessages: pinnedMessages,
                    createdAt: Date.now(),
                    status: 'جديدة',
                };
                await dbService.addCase(newCase);
                navigate(`/case/${newCase.id}`, { replace: true });
            } else if (caseData) {
                const updatedCase = { ...caseData, chatHistory: finalHistory };
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

    // 5. File Handling Logic
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

    // 6. Streaming Logic
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

    // 7. Send Message Logic
    const handleSendMessage = async (prompt?: string) => {
        setAuthError(null);
        const messageContent = (prompt || userInput).trim();
        if (isLoading || isProcessingFile || (!messageContent && !uploadedImage)) return;

        if (apiSource === 'openrouter' && uploadedImage) {
            const selectedModelInfo = openRouterModels.find(m => m.id === openRouterModel);
            if (!selectedModelInfo?.supportsImages) {
                alert(`النموذج المحدد (${selectedModelInfo?.name || openRouterModel}) لا يدعم تحليل الصور. يرجى اختيار نموذج يدعم الصور من الإعدادات، أو إزالة الصورة المرفقة.`);
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

        const currentChatHistory = [...chatHistory, userMessage];
        setChatHistory(currentChatHistory);

        const tempModelMessage: ChatMessage = { role: 'model', content: '', id: uuidv4() };
        setChatHistory(prev => [...prev, tempModelMessage]);

        abortControllerRef.current = new AbortController();

        try {
            let stream;
            // PASS THE REGION TO THE SERVICES
            if (apiSource === 'openrouter') {
                stream = streamChatResponseFromOpenRouter(openRouterApiKey, currentChatHistory, openRouterModel, actionMode, region, abortControllerRef.current.signal);
            } else {
                stream = streamChatResponseFromGemini(currentChatHistory, thinkingMode, actionMode, region, abortControllerRef.current.signal);
            }

            const { fullResponse, responseModel, groundingMetadata } = await processStream(stream, tempModelMessage.id);

            const finalModelMessage: ChatMessage = {
                id: tempModelMessage.id,
                role: 'model',
                content: fullResponse,
                model: responseModel,
                groundingMetadata: groundingMetadata
            };

            const finalMsgs = [...currentChatHistory, finalModelMessage];
            setChatHistory(finalMsgs);

            if (isNewCase) {
                const newCase: Case = {
                    id: uuidv4(),
                    title: messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : ''),
                    summary: fullResponse.substring(0, 150) + (fullResponse.length > 150 ? '...' : ''),
                    chatHistory: finalMsgs,
                    pinnedMessages: pinnedMessages,
                    createdAt: Date.now(),
                    status: 'جديدة',
                };
                await dbService.addCase(newCase);
                navigate(`/case/${newCase.id}`, { replace: true });
            } else if (caseData) {
                const updatedCase = {
                    ...caseData,
                    summary: fullResponse.substring(0, 150) + (fullResponse.length > 150 ? '...' : ''),
                    chatHistory: finalMsgs,
                    pinnedMessages: pinnedMessages,
                };
                await dbService.updateCase(updatedCase);
                setCaseData(updatedCase);
            }

            if (apiSource === 'gemini') {
                countTokensForGemini(finalMsgs).then(setTokenCount);
            }

        } catch (error: any) {
            console.error(`Error during ${apiSource} streaming:`, error);
            let chatErrorMessage = 'حدث خطأ أثناء معالجة الطلب.';
            const errorMessage = error.toString();
            const errorStatus = error.status;

            if (errorStatus === 401 || errorMessage.includes("API key") || errorMessage.includes("authentication") || errorMessage.includes("was not found") || errorMessage.includes("User not found")) {
                chatErrorMessage = `مفتاح API غير صالح أو تم رفضه لـ ${apiSource}. يرجى الانتقال إلى صفحة الإعدادات للتأكد من صحة المفتاح.`;
                setAuthError(chatErrorMessage);
            } else if (apiSource === 'openrouter' && (errorMessage.includes("No endpoints found") || error.status === 404)) {
                chatErrorMessage = `حدث خطأ: النموذج المحدد (${openRouterModel}) قد يكون غير متاح مؤقتاً أو غير متوافق مع الطلب. يرجى تجربة نموذج آخر.`;
            } else {
                chatErrorMessage = `حدث خطأ: ${error.message}`;
            }

            setChatHistory(prev =>
                prev.map(msg =>
                    msg.id === tempModelMessage.id ? { ...msg, content: chatErrorMessage, isError: true } : msg
                )
            );
        } finally {
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

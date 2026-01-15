
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Case, ChatMessage, ApiSource, OpenRouterModel, GroundingMetadata, ActionMode, LegalRegion, CaseType } from '../types';
import * as dbService from '../services/dbService';
import { streamChatResponseFromGemini, countTokensForGemini, summarizeChatHistory, analyzeImageWithGemini } from '../pages/geminiService';
import { streamChatResponseFromOpenRouter } from '../services/openRouterService';
import { DEFAULT_OPENROUTER_MODELS } from '../constants';
import { OCR_STRICT_PROMPT } from '../services/legalPrompts';
import * as pdfjsLib from 'pdfjs-dist';

const { useNavigate } = ReactRouterDOM;

// Use the correct worker version matching importmap
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

export const useChatLogic = (caseId?: string, initialCaseType: CaseType = 'chat') => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(!!caseId);
    const [isNotFound, setIsNotFound] = useState(false);
    
    const [caseData, setCaseData] = useState<Case | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    
    // API Key availability state
    const [isApiKeyReady, setIsApiKeyReady] = useState<boolean | null>(null);
    const [apiSource, setApiSource] = useState<ApiSource>('gemini');
    const [region, setRegion] = useState<LegalRegion>('westbank'); 
    const [openRouterApiKey, setOpenRouterApiKey] = useState<string>('');
    const [openRouterModel, setOpenRouterModel] = useState<string>(DEFAULT_OPENROUTER_MODELS[0].id);
    const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>(DEFAULT_OPENROUTER_MODELS);
    const [thinkingMode, setThinkingMode] = useState(false);
    
    const [uploadedImages, setUploadedImages] = useState<{ dataUrl: string; mimeType: string }[]>([]);
    
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
            if (!caseId) {
                // Initial check for API key
                const storedSource = await dbService.getSetting<ApiSource>('apiSource') || 'gemini';
                setApiSource(storedSource);
                
                if (storedSource === 'openrouter') {
                    const orKey = await dbService.getSetting<string>('openRouterApiKey');
                    setIsApiKeyReady(!!orKey && orKey.trim().length > 0);
                } else {
                    // Check env or storage for Gemini
                    const envKey = process.env.API_KEY;
                    const hasEnv = !!envKey && envKey !== "" && envKey !== "undefined";
                    const storedGeminiKey = await dbService.getSetting<string>('geminiApiKey');
                    setIsApiKeyReady(hasEnv || (!!storedGeminiKey && storedGeminiKey.trim().length > 0));
                }
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const storedApiSource = await dbService.getSetting<ApiSource>('apiSource') || 'gemini';
                setApiSource(storedApiSource);

                const storedRegion = await dbService.getSetting<LegalRegion>('legalRegion');
                if (storedRegion) setRegion(storedRegion);

                if (storedApiSource === 'openrouter') {
                    const storedApiKey = await dbService.getSetting<string>('openRouterApiKey');
                    const storedModel = await dbService.getSetting<string>('openRouterModel');
                    setOpenRouterModel(storedModel || DEFAULT_OPENROUTER_MODELS[0].id);

                    if (storedApiKey && storedApiKey.trim().length > 0) {
                        setOpenRouterApiKey(storedApiKey.trim());
                        setIsApiKeyReady(true);
                    } else {
                        setIsApiKeyReady(false);
                    }
                } else {
                    const envKey = process.env.API_KEY;
                    const hasEnv = !!envKey && envKey !== "" && envKey !== "undefined";
                    const storedGeminiKey = await dbService.getSetting<string>('geminiApiKey');
                    setIsApiKeyReady(hasEnv || (!!storedGeminiKey && storedGeminiKey.trim().length > 0));
                }

                const loadedCase = await dbService.getCase(caseId);
                if (loadedCase) {
                    setCaseData(loadedCase);
                    setChatHistory(loadedCase.chatHistory || []);
                    setPinnedMessages(loadedCase.pinnedMessages || []);
                    if (storedApiSource === 'gemini') {
                        countTokensForGemini(loadedCase.chatHistory).then(setTokenCount);
                    }
                } else {
                    setIsNotFound(true);
                }
            } catch (error) {
                console.error("Failed to load initial data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [caseId]);

    const handleSelectApiKey = async () => {
        if (apiSource === 'gemini' && window.aistudio?.openSelectKey) {
            await window.aistudio.openSelectKey();
            setIsApiKeyReady(true);
        } else {
            navigate('/settings');
        }
    };

    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [chatHistory]);

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

    const handleEditMessage = async (messageId: string, newContent: string) => {
        const updatedHistory = chatHistory.map(msg => 
            msg.id === messageId ? { ...msg, content: newContent } : msg
        );
        setChatHistory(updatedHistory);
        
        if (caseData) {
            const updatedCase = { ...caseData, chatHistory: updatedHistory };
            await dbService.updateCase(updatedCase);
            setCaseData(updatedCase);
        }
    };

    const handleConvertCaseType = async (newType: string) => {
        if (!caseData) return;
        const normalizedType: CaseType = newType === 'civil' ? 'chat' : (newType as CaseType);

        setIsLoading(true);
        try {
            const cleanedHistory = caseData.chatHistory.filter(msg => {
                const isRedirectMsg = /```json\s*\{[\s\S]*?"redirect"[\s\S]*?\}\s*```/.test(msg.content);
                return !isRedirectMsg;
            });

            const updatedCase: Case = {
                ...caseData,
                caseType: normalizedType,
                chatHistory: cleanedHistory 
            };
            await dbService.updateCase(updatedCase);
            setCaseData(updatedCase); 
            
            const routePrefix = normalizedType === 'sharia' ? '/sharia' : '/case';
            navigate(`${routePrefix}/${caseData.id}`, { replace: true });
            window.location.reload();
        } catch (error) {
            console.error("Failed to convert case type:", error);
            alert("حدث خطأ أثناء نقل القضية.");
            setIsLoading(false);
        }
    };

    const handleSummarize = async () => {
        if (isSummaryLoading || isLoading || chatHistory.length === 0) return;
        setIsSummaryLoading(true);
        const tempSummaryMessage: ChatMessage = { id: uuidv4(), role: 'model', content: 'جاري إنشاء الملخص...', model: apiSource === 'gemini' ? 'gemini-3-flash-preview' : openRouterModel };
        const currentChatHistory = [...chatHistory, tempSummaryMessage];
        setChatHistory(currentChatHistory);

        try {
            if (apiSource !== 'gemini') throw new Error("خاصية التلخيص متاحة حاليًا لـ Google Gemini فقط.");
            const summaryText = await summarizeChatHistory(chatHistory);
            const finalSummaryContent = `**ملخص المحادثة:**\n\n${summaryText}`;
            const finalHistory = currentChatHistory.map(msg => msg.id === tempSummaryMessage.id ? { ...msg, content: finalSummaryContent } : msg);
            setChatHistory(finalHistory);
            if (caseData) {
                const updatedCase = { ...caseData, chatHistory: finalHistory, summary: summaryText.substring(0, 150) };
                await dbService.updateCase(updatedCase);
                setCaseData(updatedCase);
            }
        } catch (error: any) {
            setChatHistory(prev => prev.map(msg => msg.id === tempSummaryMessage.id ? { ...msg, content: `خطأ: ${error.message}`, isError: true } : msg));
        } finally {
            setIsSummaryLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        setIsProcessingFile(true);
        const fileList = Array.from(files) as File[];
        let processedCount = 0;

        fileList.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const dataUrl = e.target?.result as string;
                    setUploadedImages(prev => [...prev, { dataUrl, mimeType: file.type }]);
                    
                    setProcessingMessage(`جاري تحليل الصورة: ${file.name}...`);
                    try {
                        const extractedText = await analyzeImageWithGemini(dataUrl, file.type, OCR_STRICT_PROMPT);
                        if (extractedText && extractedText.length > 5) {
                             setUserInput(prev => prev.trim() + (prev.trim() ? '\n\n' : '') + `--- نص مستخلص من صورة: ${file.name} ---\n` + extractedText.trim());
                        }
                    } catch (error) {
                        console.error("OCR Error:", error);
                    } finally {
                        processedCount++;
                        if (processedCount === fileList.length) {
                            setIsProcessingFile(false);
                            setProcessingMessage('');
                        }
                    }
                };
                reader.readAsDataURL(file);
                
            } else if (file.type === 'application/pdf') {
                setProcessingMessage(`جاري معالجة PDF: ${file.name}...`);
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const typedarray = new Uint8Array(e.target!.result as ArrayBuffer);
                        const pdf = await pdfjsLib.getDocument(typedarray).promise;
                        let fullText = '';
                        
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const items: any[] = textContent.items.filter((item: any) => 'str' in item && item.str.trim().length > 0);

                            items.sort((a, b) => {
                                const yDiff = b.transform[5] - a.transform[5];
                                if (Math.abs(yDiff) > 8) return yDiff; 
                                return a.transform[4] - b.transform[4];
                            });

                            let pageText = '';
                            let lastY = -1;
                            let lastX = -1;

                            for (const item of items) {
                                const y = item.transform[5];
                                const x = item.transform[4];
                                if (lastY !== -1 && Math.abs(y - lastY) > 8) {
                                    pageText += '\n'; 
                                } else if (lastX !== -1 && x > lastX + 10) {
                                    pageText += ' ';
                                }
                                pageText += item.str;
                                lastY = y;
                                lastX = x + item.width;
                            }
                            fullText += `--- محتوى PDF الصفحة ${i} ---\n${pageText}\n\n`;
                        }
                        
                        setUserInput(prev => prev.trim() + (prev.trim() ? '\n\n' : '') + `--- ملف PDF: ${file.name} ---\n` + fullText.trim());
                    } catch (err) {
                        console.error("PDF Error", err);
                    } finally { 
                        processedCount++;
                        if (processedCount === fileList.length) {
                            setIsProcessingFile(false);
                            setProcessingMessage('');
                        }
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                processedCount++;
                if (processedCount === fileList.length) {
                    setIsProcessingFile(false);
                    setProcessingMessage('');
                }
            }
        });
        
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
                if (chunk.text) fullResponse += chunk.text;
                responseModel = chunk.model;
                if (chunk.groundingMetadata) groundingMetadata = chunk.groundingMetadata;
                setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? { ...msg, content: fullResponse, model: responseModel, groundingMetadata } : msg));
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') throw e;
            else wasAborted = true;
        }
        if (wasAborted) {
            fullResponse += '\n\n**(تم إيقاف الإنشاء)**';
            setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? { ...msg, content: fullResponse, model: responseModel, groundingMetadata } : msg));
        }
        return { fullResponse, responseModel, groundingMetadata };
    }, []);

    const handleSendMessage = async (prompt?: string, overrideMode?: ActionMode) => {
        setAuthError(null);
        const messageContent = (prompt || userInput).trim();
        if (isLoading || isProcessingFile || (!messageContent && uploadedImages.length === 0)) return;

        let effectiveMode = overrideMode || actionMode;
        
        setIsLoading(true);
        const userMessage: ChatMessage = { 
            id: uuidv4(), 
            role: 'user', 
            content: messageContent,
            images: uploadedImages.length > 0 ? uploadedImages : undefined 
        };
        
        setUserInput('');
        setUploadedImages([]); 
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        const tempModelMessage: ChatMessage = { role: 'model', content: '', id: uuidv4() };
        const newHistory = [...chatHistory, userMessage, tempModelMessage];
        setChatHistory(newHistory);
        abortControllerRef.current = new AbortController();

        const currentCaseType = caseData?.caseType || initialCaseType;
        const targetCaseId = caseId || uuidv4();
        let currentCaseData = caseData;

        try {
            if (isNewCase) {
                const newCase: Case = {
                    id: targetCaseId,
                    title: messageContent.substring(0, 50) || 'قضية جديدة',
                    summary: messageContent.substring(0, 150),
                    chatHistory: [userMessage],
                    createdAt: Date.now(),
                    status: 'جديدة',
                    caseType: currentCaseType 
                };
                await dbService.addCase(newCase);
                currentCaseData = newCase;
                setCaseData(newCase);
            } else if (caseData) {
                const updatedCase = { ...caseData, chatHistory: [...chatHistory, userMessage] };
                await dbService.updateCase(updatedCase);
                currentCaseData = updatedCase;
                setCaseData(updatedCase);
            }
        } catch (e) { setIsLoading(false); return; }

        try {
            let stream;
            const historyToSend = [...chatHistory, userMessage]; 
            
            if (apiSource === 'openrouter') {
                stream = streamChatResponseFromOpenRouter(openRouterApiKey, historyToSend, openRouterModel, effectiveMode, region, currentCaseType, abortControllerRef.current.signal);
            } else {
                stream = streamChatResponseFromGemini(historyToSend, thinkingMode, effectiveMode, region, currentCaseType, abortControllerRef.current.signal);
            }

            const { fullResponse, responseModel, groundingMetadata } = await processStream(stream, tempModelMessage.id);
            
            if (currentCaseData) {
                const finalHistory = newHistory.map(msg => msg.id === tempModelMessage.id ? { ...msg, content: fullResponse, model: responseModel, groundingMetadata } : msg);
                const updatedCase = { ...currentCaseData, chatHistory: finalHistory, summary: fullResponse.substring(0, 150) + '...' };
                await dbService.updateCase(updatedCase);
                setCaseData(updatedCase);
                if (isNewCase) {
                    const routePrefix = currentCaseType === 'sharia' ? '/sharia' : (currentCaseType === 'forgery' ? '/forgery' : '/case');
                    navigate(`${routePrefix}/${targetCaseId}`, { replace: true });
                }
            }
            
            if (apiSource === 'gemini') {
                countTokensForGemini([...historyToSend, { ...tempModelMessage, content: fullResponse }])
                    .then(setTokenCount)
                    .catch(() => setTokenCount(0));
            }

        } catch (error: any) {
            const errorMessage = error.message || 'حدث خطأ غير متوقع.';
            setChatHistory(prev => prev.map(msg => msg.id === tempModelMessage.id ? { ...msg, content: errorMessage, isError: true } : msg));
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleFollowUpAction = (newMode: ActionMode, prompt: string) => {
        setActionMode(newMode);
        handleSendMessage(prompt, newMode);
    };

    const handleStopGenerating = () => abortControllerRef.current?.abort();

    return {
        caseData, chatHistory, userInput, setUserInput, isLoading, isNotFound, isApiKeyReady,
        apiSource, thinkingMode, setThinkingMode, 
        uploadedImages, setUploadedImages,
        isProcessingFile, processingMessage, tokenCount, authError,
        actionMode, setActionMode, pinnedMessages, isSummaryLoading,
        isPinnedPanelOpen, setIsPinnedPanelOpen, chatContainerRef, fileInputRef, textareaRef,
        handleSendMessage, handleStopGenerating, handleSummarize, handleSelectApiKey,
        handleFileChange, handlePinMessage, handleUnpinMessage, handleEditMessage,
        handleConvertCaseType, handleFollowUpAction
    };
};

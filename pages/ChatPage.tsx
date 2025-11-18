
// FIX: Fix TypeScript error by using a named interface for the global aistudio property.
// Using a named interface `AIStudio` resolves potential type conflicts with other global declarations.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Case, ChatMessage, ApiSource, OpenRouterModel, GroundingMetadata } from '../types';
import * as dbService from '../services/dbService';
import { streamChatResponseFromGemini, countTokensForGemini, proofreadTextWithGemini, summarizeChatHistory } from './geminiService';
import { streamChatResponseFromOpenRouter } from '../services/openRouterService';
import { DEFAULT_OPENROUTER_MODELS, SUGGESTED_PROMPTS } from '../constants';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configure the worker for pdf.js
// The '?url' import suffix for workers is a Vite-specific feature that does not work with
// browser-native import maps that load from a CDN. We provide the full URL to the worker script.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@5.4.394/build/pdf.worker.js';

// Configure marked to open links in a new tab for security and better UX
const renderer = new marked.Renderer();
const linkRenderer = renderer.link;
// FIX: Cast to 'any' to handle type definition changes in marked v12+ (args vs object)
renderer.link = function (this: any, ...args: any[]) {
    const html = linkRenderer.apply(this, args as any);
    // Use rel="noopener noreferrer" for security
    return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
} as any;
marked.setOptions({ renderer });

// Define Legal Modes
type ActionMode = 'analysis' | 'loopholes' | 'drafting' | 'strategy';

const ACTION_MODES: { id: ActionMode; label: string; icon: React.ReactNode; color: string; promptPrefix: string }[] = [
    {
        id: 'analysis',
        label: 'تحليل شامل',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>,
        color: 'bg-blue-600 hover:bg-blue-500',
        promptPrefix: '' // Default behavior
    },
    {
        id: 'loopholes',
        label: 'كشف الثغرات',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" /></svg>,
        color: 'bg-rose-600 hover:bg-rose-500',
        promptPrefix: '🔴 **[وضع كشف الثغرات ومحامي الخصم]**: تقمص دور محامي الخصم الشرس. ابحث عن كل خطأ إجرائي، ثغرة قانونية، تناقض في الوقائع، أو مشكلة في التقادم والاختصاص في النص التالي. لا تجامل. هدفك هو إسقاط الدعوى أو تضعيف الموقف.\n\nالنص:\n'
    },
    {
        id: 'drafting',
        label: 'صياغة قانونية',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>,
        color: 'bg-emerald-600 hover:bg-emerald-500',
        promptPrefix: '📝 **[وضع الصياغة القانونية]**: بناءً على الوقائع التالية، قم بصياغة وثيقة قانونية رسمية (لائحة دعوى، مذكرة دفاع، أو عقد حسب السياق). استخدم لغة قانونية فلسطينية رصينة، ونسق النص ليناسب تقديمه للمحكمة، مع ترك فراغات للبيانات الناقصة (مثل التواريخ الدقيقة أو الأسماء).\n\nالوقائع:\n'
    },
    {
        id: 'strategy',
        label: 'خطة الفوز',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>,
        color: 'bg-amber-600 hover:bg-amber-500',
        promptPrefix: '🚀 **[وضع التخطيط الاستراتيجي للفوز]**: لا تكتفِ بالتحليل. ضع خطة عملية (خطوة بخطوة 1، 2، 3) للفوز بهذه القضية أو تحقيق أفضل نتيجة ممكنة. حدد ما هي الأدلة القوية التي يجب التركيز عليها، وما هي المعلومات التي يجب الحذر عند ذكرها. اقترح تكتيكات تفاوضية.\n\nالقضية:\n'
    }
];


interface ChatPageProps {
  caseId?: string;
}

// Helper component to render message content with proper parsing of thoughts and tools
const MessageContent: React.FC<{ content: string; isModel: boolean }> = ({ content, isModel }) => {
    if (!isModel) {
        return <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(content, { breaks: true }) as string) }}></div>;
    }

    const { toolCode, thought, finalContent } = useMemo(() => {
        let c = content || '';
        let tc: string | null = null;
        let th: string | null = null;

        // 1. Extract tool_code if present at the start
        // Pattern: starts with tool_code, captures until 'thought' or Arabic chars or end of string
        const toolCodeRegex = /^tool_code\s*\n([\s\S]*?)(?=\n(thought|[\u0600-\u06FF]|$))/;
        const tcMatch = c.match(toolCodeRegex);
        if (tcMatch) {
             tc = tcMatch[1].trim();
             c = c.replace(tcMatch[0], '').trim();
        }

        // 2. Extract thought if present (after tool_code removal)
        // Pattern: starts with thought, captures until it hits an Arabic character on a new line (heuristically the start of the answer)
        // or a double newline followed by non-whitespace.
        const thoughtRegex = /^thought\s*\n([\s\S]*?)(?=\n[\u0600-\u06FF]|$)/;
        const thMatch = c.match(thoughtRegex);
        if (thMatch) {
            th = thMatch[1].trim();
            c = c.replace(thMatch[0], '').trim();
        } else if (c.startsWith('thought')) {
             // Fallback for streaming where the end might not be clear yet
             // If we are strictly in 'thought' block (entire content is thought)
             th = c.replace(/^thought\s*\n/, '').trim();
             c = ''; // Hide content until real answer appears or stream finishes
        }
        
        return { toolCode: tc, thought: th, finalContent: c };
    }, [content]);

    return (
        <div className="flex flex-col gap-y-2 w-full">
            {/* Hidden Debug Info - Tool Code */}
            {toolCode && (
                <details className="group bg-black/40 rounded-md border border-gray-800 overflow-hidden">
                    <summary className="px-3 py-1.5 text-xs font-mono text-gray-600 cursor-pointer hover:bg-gray-900/50 hover:text-gray-400 transition-colors flex items-center select-none">
                        <svg className="w-3 h-3 me-2 transition-transform group-open:rotate-90" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        Debug: Tool Code Execution
                    </summary>
                    <div className="p-3 bg-black/90 text-green-500 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap" dir="ltr">
                        {toolCode}
                    </div>
                </details>
            )}
            
            {/* Legal Reasoning - Thought Process */}
            {thought && (
                <details className="group bg-indigo-950/30 rounded-lg border border-indigo-500/20 overflow-hidden mb-3 shadow-sm">
                    <summary className="px-4 py-2 text-xs font-bold text-indigo-300 cursor-pointer hover:bg-indigo-900/40 transition-all flex items-center select-none border-b border-transparent group-open:border-indigo-500/20">
                        <svg className="w-4 h-4 me-2 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        <span className="flex-grow tracking-wide">عملية التفكير والتحليل القانوني (أنقر للعرض)</span>
                        <svg className="w-3 h-3 transition-transform group-open:rotate-90 text-indigo-400/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </summary>
                    {/* Render thought content with markdown parsing for better structure */}
                    <div className="p-4 text-indigo-100/90 text-sm leading-relaxed bg-indigo-900/10">
                         <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(thought) as string) }}></div>
                    </div>
                </details>
            )}

            {/* Final Answer */}
            {finalContent && (
                <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(finalContent, { breaks: true }) as string) }}></div>
            )}
            
            {!finalContent && !toolCode && !thought && (
                <div className="flex items-center space-x-2 space-x-reverse text-gray-400 text-sm animate-pulse">
                     <span>جاري التحليل...</span>
                </div>
            )}
        </div>
    );
};

const ChatPage: React.FC<ChatPageProps> = ({ caseId }) => {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApiKeyReady, setIsApiKeyReady] = useState<boolean | null>(null);
  const [apiSource, setApiSource] = useState<ApiSource>('gemini');
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>('');
  const [openRouterModel, setOpenRouterModel] = useState<string>(DEFAULT_OPENROUTER_MODELS[0].id);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>(DEFAULT_OPENROUTER_MODELS);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ dataUrl: string; mimeType: string } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>('analysis');


  // New states for added features
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isPinnedPanelOpen, setIsPinnedPanelOpen] = useState(true);


  const navigate = useNavigate();
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

        const storedCustomModels = await dbService.getSetting<OpenRouterModel[]>('openRouterModels');
        const availableModels = storedCustomModels && storedCustomModels.length > 0 ? storedCustomModels : DEFAULT_OPENROUTER_MODELS;
        setOpenRouterModels(availableModels);

        if (storedApiSource === 'openrouter') {
          const storedApiKey = await dbService.getSetting<string>('openRouterApiKey');
          const storedModel = await dbService.getSetting<string>('openRouterModel');
          if (storedModel && availableModels.some(m => m.id === storedModel)) {
            // Sanitize the stored model ID to remove the legacy ":free" suffix
            setOpenRouterModel(storedModel.replace(/:free$/, ''));
          } else {
            // Default to the first model in the list if none is set or if stored model is no longer valid
            setOpenRouterModel(availableModels[0].id);
          }
          
          if (storedApiKey) {
            setOpenRouterApiKey(storedApiKey);
            setIsApiKeyReady(true);
          } else {
            setIsApiKeyReady(false);
          }
        } else {
          // For Gemini, check both aistudio and our own db setting
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

  useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
  }, [chatHistory]);

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
  
  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => {
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  const handlePinMessage = async (messageToPin: ChatMessage) => {
    const isPinned = pinnedMessages.some(p => p.id === messageToPin.id);
    if (isPinned) return; // Already pinned
    
    const newPinnedMessages = [...pinnedMessages, messageToPin];
    setPinnedMessages(newPinnedMessages);

    if (caseData) {
        const updatedCase = { ...caseData, pinnedMessages: newPinnedMessages };
        await dbService.updateCase(updatedCase);
        setCaseData(updatedCase); // Update local case data state
    }
  };

  const handleUnpinMessage = async (messageIdToUnpin: string) => {
    const newPinnedMessages = pinnedMessages.filter(p => p.id !== messageIdToUnpin);
    setPinnedMessages(newPinnedMessages);

    if (caseData) {
        const updatedCase = { ...caseData, pinnedMessages: newPinnedMessages };
        await dbService.updateCase(updatedCase);
        setCaseData(updatedCase); // Update local case data state
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
        // We only support summarization via Gemini for now as it's more integrated and tested.
        if (apiSource !== 'gemini') {
            throw new Error("خاصية التلخيص متاحة حاليًا لـ Google Gemini فقط.");
        }
        
        // Exclude the last temporary message from the history sent for summarization
        const historyToSummarize = chatHistory.filter(m => m.id !== tempSummaryMessage.id);
        const summaryText = await summarizeChatHistory(historyToSummarize);
        
        const finalSummaryContent = `**ملخص المحادثة:**\n\n${summaryText}`;

        const finalHistory = currentChatHistory.map(msg => 
            msg.id === tempSummaryMessage.id ? { ...msg, content: finalSummaryContent } : msg
        );
        setChatHistory(finalHistory);

        // Save the updated history
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


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadedImage(null);

        if (file.type.startsWith('image/')) {
            // Keep the image for preview and potential model submission
            const reader = new FileReader();
            reader.onload = (e) => {
                setUploadedImage({ dataUrl: e.target?.result as string, mimeType: file.type });
            };
            reader.readAsDataURL(file);

            // Start OCR
            setIsProcessingFile(true);
            setProcessingMessage('جاري تهيئة محرك استخلاص النصوص...');

            Tesseract.recognize(
                file,
                'ara', // Specify Arabic language
                {
                    logger: m => {
                        console.log(m);
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
        event.target.value = ''; // Allow re-uploading same file
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
              
              // Update grounding metadata if present in this chunk.
              // We accumulate it because it might come in one specific chunk.
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
      
      // Return the final state including metadata so it can be saved to DB
      return { fullResponse, responseModel, groundingMetadata };
  }, []);

  const handleSendMessage = async (prompt?: string) => {
    setAuthError(null); // Clear previous auth errors
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

    // Determine if we need to prepend special instructions based on the selected mode
    const activeModeConfig = ACTION_MODES.find(m => m.id === actionMode);
    const augmentedContent = activeModeConfig && activeModeConfig.id !== 'analysis' 
        ? `${activeModeConfig.promptPrefix}${messageContent}`
        : messageContent;
    
    // We display the user's original input in the chat bubble, but send the augmented prompt to the AI
    // However, to ensure the AI understands the context in future turns if we reload history,
    // it is often safer to save the augmented prompt.
    // Let's save the augmented prompt but maybe visually clean it up? 
    // For simplicity and correctness, we save what we send. The user will see the "tag" we added.
    
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: augmentedContent, // Send and save the augmented content
      images: uploadedImage ? [uploadedImage] : undefined,
    };
    
    setUserInput('');
    setUploadedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset textarea height
    }

    const currentChatHistory = [...chatHistory, userMessage];
    setChatHistory(currentChatHistory);

    const tempModelMessage: ChatMessage = { role: 'model', content: '', id: uuidv4() };
    setChatHistory(prev => [...prev, tempModelMessage]);
    
    abortControllerRef.current = new AbortController();

    try {
        let stream;
        if (apiSource === 'openrouter') {
            stream = streamChatResponseFromOpenRouter(openRouterApiKey, currentChatHistory, openRouterModel, abortControllerRef.current.signal);
        } else {
            stream = streamChatResponseFromGemini(currentChatHistory, thinkingMode, abortControllerRef.current.signal);
        }

        const { fullResponse, responseModel, groundingMetadata } = await processStream(stream, tempModelMessage.id);
        
        // Construct the final message object with all metadata for saving
        const finalModelMessage: ChatMessage = {
            id: tempModelMessage.id,
            role: 'model',
            content: fullResponse,
            model: responseModel,
            groundingMetadata: groundingMetadata // Ensure this is saved
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
             // Token counting is async, doesn't block
             countTokensForGemini(finalMsgs).then(setTokenCount);
        }

    } catch (error: any) {
        console.error(`Error during ${apiSource} streaming:`, error);
        let chatErrorMessage = 'حدث خطأ أثناء معالجة الطلب.';
        const errorMessage = error.toString();
        const errorStatus = error.status; // From custom error in openRouterService
        
        // More specific check for auth errors
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

  const getModelDisplayName = (modelId?: string): string => {
    if (!modelId) return '';
    if (modelId === 'gemini-2.5-pro') return 'Gemini 2.5 Pro';
    if (modelId === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';

    const openRouterModel = openRouterModels.find(m => m.id === modelId);
    return openRouterModel?.name || modelId;
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
    const isGemini = apiSource === 'gemini';
    return (
      <div className="w-full flex-grow flex flex-col items-center justify-center text-center p-4">
          <h2 className="text-2xl font-bold mb-4 text-gray-200">مطلوب مفتاح API</h2>
          {isGemini ? (
            <p className="text-gray-400 mb-6 max-w-2xl">
              لاستخدام Gemini، يرجى تحديد مفتاح Google AI API الخاص بك عبر النافذة المنبثقة، أو إدخاله يدويًا في <Link to="/settings" className="text-blue-400 hover:underline">صفحة الإعدادات</Link>.
            </p>
          ) : (
            <p className="text-gray-400 mb-6 max-w-2xl">
              لاستخدام OpenRouter، يرجى إدخال مفتاح API الخاص بك في صفحة الإعدادات.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            {isGemini && window.aistudio && (
              <button onClick={handleSelectApiKey} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                تحديد مفتاح عبر Google AI
              </button>
            )}
            <button onClick={() => navigate('/settings')} className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">
              الانتقال إلى الإعدادات
            </button>
          </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col flex-grow bg-gray-800 overflow-hidden">
        <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center flex-wrap gap-2 sticky top-0 z-10">
            <h2 className="text-lg font-semibold text-gray-200 truncate">{caseData?.title || 'قضية جديدة'}</h2>
            <div className="flex items-center gap-x-3">
                {apiSource === 'gemini' && tokenCount > 0 && (
                  <div className="text-sm text-gray-400" title="إجمالي التوكن المستخدمة في هذه المحادثة">
                    <span>الاستهلاك: </span>
                    <span className="font-mono font-semibold text-gray-300">{tokenCount.toLocaleString('ar-EG')}</span>
                    <span> توكن</span>
                  </div>
                )}
                {apiSource === 'gemini' && (
                  <button 
                      onClick={handleSummarize} 
                      disabled={isLoading || isSummaryLoading || chatHistory.length === 0}
                      className="flex items-center space-x-2 space-x-reverse px-3 py-1.5 bg-gray-700 text-gray-200 rounded-md text-sm hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="تلخيص المحادثة الحالية"
                  >
                      {isSummaryLoading ? (
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5zM12 13a1 1 0 100 2h-4a1 1 0 100-2h4zm-1-3a1 1 0 10-2 0v1a1 1 0 102 0v-1z" /></svg>
                      )}
                      <span>تلخيص</span>
                  </button>
                )}
                {apiSource === 'gemini' && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <label htmlFor="thinking-mode-toggle" className="text-sm font-medium text-gray-300 cursor-pointer">وضع التفكير العميق (Pro)</label>
                        <button id="thinking-mode-toggle" role="switch" aria-checked={thinkingMode} onClick={() => setThinkingMode(!thinkingMode)}
                            className={`${thinkingMode ? 'bg-blue-600' : 'bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800`}>
                            <span className={`${thinkingMode ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                        </button>
                    </div>
                )}
            </div>
        </div>

        {pinnedMessages.length > 0 && (
            <div className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 sticky top-[61px] z-10">
                <div className="p-2">
                    <button onClick={() => setIsPinnedPanelOpen(!isPinnedPanelOpen)} className="w-full flex justify-between items-center text-left text-sm font-semibold text-gray-300 hover:text-white p-1">
                        <span>الرسائل المثبتة ({pinnedMessages.length})</span>
                        <svg className={`h-5 w-5 transition-transform ${isPinnedPanelOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>
                {isPinnedPanelOpen && (
                    <div className="p-3 border-t border-gray-700/50 max-h-48 overflow-y-auto space-y-2">
                        {pinnedMessages.map(msg => (
                            <div key={`pinned-${msg.id}`} className="bg-gray-700/50 p-2 rounded-lg text-xs text-gray-300 flex items-start group">
                                <p className="prose prose-invert prose-sm max-w-none line-clamp-2 flex-grow">{msg.content}</p>
                                <button onClick={() => handleUnpinMessage(msg.id)} className="p-1 text-gray-500 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0 ms-2" aria-label="إلغاء تثبيت الرسالة">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto">
            {chatHistory.length === 0 && !isLoading ? (
                <div className="text-center text-gray-400 flex flex-col items-center justify-center h-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-1.5 8.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm3 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM9 13.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM12 1c-3.86 0-7 3.14-7 7 0 1.95.8 3.72 2.05 4.95-.02.02-.05.04-.05.05 0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5c0-.01-.03-.03-.05-.05C18.2 11.72 19 9.95 19 8c0-3.86-3.14-7-7-7z"></path>
                    </svg>
                    <h2 className="text-2xl font-bold mb-4 text-gray-200">المستشار القانوني الفلسطيني</h2>
                    <p className="mb-8 max-w-xl">ابدأ بوصف وقائع القضية، أو ارفق مستنداً. اختر وضع "كشف الثغرات" أو "خطة الفوز" للحصول على استراتيجيات متقدمة.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {chatHistory.map((msg) => {
                        const isPinned = pinnedMessages.some(p => p.id === msg.id);
                        return (
                            <div key={msg.id} className={`flex flex-col group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-xl lg:max-w-3xl px-5 py-3 rounded-2xl relative ${msg.isError ? 'bg-red-500/30 text-red-200' : msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                    <div className="absolute top-2 left-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handlePinMessage(msg)} className="p-1.5 bg-gray-600/50 rounded-full text-gray-300 hover:bg-gray-500/80 disabled:opacity-50 disabled:cursor-default" title={isPinned ? "تم التثبيت" : "تثبيت الرسالة"} disabled={isPinned}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isPinned ? 'text-yellow-400' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10.49 2.23a.75.75 0 00-1.02-.04l-7.5 6.25a.75.75 0 00.99 1.18L8 5.44V14a1 1 0 102 0V5.44l5.03 4.18a.75.75 0 00.99-1.18l-7.5-6.25z" clipRule="evenodd" />
                                                <path d="M4 14a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM16 14a1 1 0 011 1v1a1 1 0 011-1z" />
                                            </svg>
                                        </button>
                                        {msg.role === 'model' && (
                                            <button onClick={() => handleCopy(msg.content, msg.id)} className="p-1.5 bg-gray-600/50 rounded-full text-gray-300 hover:bg-gray-500/80" aria-label="نسخ">
                                            {copiedMessageId === msg.id ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            )}
                                            </button>
                                        )}
                                    </div>
                                    {msg.images && msg.images.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {msg.images.map((image, index) => (
                                                <img key={index} src={image.dataUrl} alt={`محتوى مرفق ${index + 1}`} className="rounded-lg max-w-xs max-h-64 object-contain" />
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Use the parsed message content component */}
                                    <MessageContent content={msg.content || '...'} isModel={msg.role === 'model'} />
                                    
                                    {/* Render Grounding Sources if available */}
                                    {msg.groundingMetadata?.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-600/50">
                                            <p className="text-xs text-gray-400 mb-2 font-semibold flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 me-1 text-blue-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                                                مصادر البحث (Grounding):
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {msg.groundingMetadata.groundingChunks.map((chunk, idx) => (
                                                    chunk.web && (
                                                        <a 
                                                            key={idx} 
                                                            href={chunk.web.uri} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-xs bg-gray-800/50 hover:bg-gray-800 text-blue-300 px-2 py-1 rounded border border-gray-600/50 transition-colors flex items-center max-w-[200px]"
                                                            title={chunk.web.title}
                                                        >
                                                            <span className="truncate">{chunk.web.title || chunk.web.uri}</span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ms-1 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                        </a>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {msg.role === 'model' && msg.model && !msg.isError && msg.content && (
                                    <div className="px-3 pt-1.5">
                                    <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded-full">{getModelDisplayName(msg.model)}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    {isLoading && chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role !== 'model' && (
                        <div className="flex justify-start">
                            <div className="max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none">
                                <div className="animate-pulse flex items-center space-x-2 space-x-reverse">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-800">
            {authError && (
                <div className="mb-3 p-3 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg text-sm" role="alert">
                    <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <h3 className="font-bold">خطأ في المصادقة</h3>
                            <p className="mt-1">{authError}</p>
                            <Link to="/settings" className="text-red-200 font-semibold hover:underline mt-2 inline-block">
                                الانتقال إلى الإعدادات لتصحيح المفتاح
                            </Link>
                        </div>
                    </div>
                </div>
            )}
            {/* Legal Action Toolbar - Added Here */}
            <div className="mb-3 bg-gray-700/30 p-2 rounded-xl overflow-x-auto">
                <div className="flex items-center gap-2 min-w-max">
                    {ACTION_MODES.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => setActionMode(mode.id)}
                            className={`flex items-center space-x-1.5 space-x-reverse px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                actionMode === mode.id 
                                    ? mode.color + ' text-white shadow-lg scale-105' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            <span className={actionMode === mode.id ? 'animate-pulse' : ''}>{mode.icon}</span>
                            <span>{mode.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {chatHistory.length > 0 && !isLoading && (
                <div className="mb-3">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                         <span className="text-sm text-gray-400 font-medium whitespace-nowrap">اقتراحات:</span>
                         {SUGGESTED_PROMPTS.map((prompt, index) => (
                             <button
                                 key={index}
                                 onClick={() => handleSendMessage(prompt)}
                                 className="px-3 py-1.5 bg-gray-700/80 text-gray-200 rounded-full text-sm whitespace-nowrap hover:bg-gray-600/80 transition-colors"
                             >
                                 {prompt}
                             </button>
                         ))}
                    </div>
                </div>
            )}
            {uploadedImage && (
                <div className="relative inline-block mb-2">
                    <img src={uploadedImage.dataUrl} alt="Preview" className="h-24 w-auto rounded-lg object-contain border border-gray-600" />
                    <button 
                        onClick={() => setUploadedImage(null)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 leading-none shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label="Remove image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
            {isProcessingFile && (
                <div className="flex items-center text-gray-400 mb-2">
                    <svg className="animate-spin h-5 w-5 me-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>{processingMessage || 'جاري المعالجة...'}</span>
                </div>
            )}
            <div className="flex items-center space-x-reverse space-x-3">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || isProcessingFile} className="p-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors" aria-label="إرفاق ملف">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </button>
                <textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={(e) => {
                    setUserInput(e.target.value);
                    // Auto-resize logic
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  className={`flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:outline-none resize-none transition-all duration-300 ${
                      actionMode === 'loopholes' ? 'focus:ring-rose-500 placeholder-rose-300/30' :
                      actionMode === 'drafting' ? 'focus:ring-emerald-500 placeholder-emerald-300/30' :
                      actionMode === 'strategy' ? 'focus:ring-amber-500 placeholder-amber-300/30' :
                      'focus:ring-blue-500'
                  }`}
                  placeholder={
                      actionMode === 'loopholes' ? "أدخل تفاصيل القضية لكشف الثغرات ومهاجمة الأدلة..." :
                      actionMode === 'drafting' ? "أدخل الوقائع لصياغة وثيقة قانونية رسمية..." :
                      actionMode === 'strategy' ? "اشرح الوضع للحصول على خطة فوز استراتيجية..." :
                      "اكتب رسالتك أو ارفق ملفاً..."
                  }
                  rows={1}
                  style={{maxHeight: '10rem'}}
                  disabled={isLoading || isProcessingFile}
                />
                {isLoading ? (
                    <button onClick={handleStopGenerating} className="p-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors" aria-label="إيقاف الإنشاء">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                ) : (
                    <button 
                        onClick={() => handleSendMessage()} 
                        disabled={isProcessingFile || (!userInput.trim() && !uploadedImage)} 
                        className={`p-3 text-white font-semibold rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors ${
                             actionMode === 'loopholes' ? 'bg-rose-600 hover:bg-rose-700' :
                             actionMode === 'drafting' ? 'bg-emerald-600 hover:bg-emerald-700' :
                             actionMode === 'strategy' ? 'bg-amber-600 hover:bg-amber-700' :
                             'bg-blue-600 hover:bg-blue-700'
                        }`}
                        aria-label="إرسال"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};

export default ChatPage;

// FIX: Create ChatPage component to handle legal case chat interface.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Case, ChatMessage, ApiSource } from '../types';
import * as dbService from '../services/dbService';
import { streamChatResponseFromGemini } from '../services/geminiService';
import { streamChatResponseFromOpenRouter } from '../services/openRouterService';
import { SUGGESTED_PROMPTS } from '../constants';
import * as pdfjsLib from 'pdf-js-dist';

// Configure the worker for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdf-js-dist@^4.4.175/build/pdf.worker.mjs`;

interface ChatPageProps {
  caseId?: string;
}

const ChatPage: React.FC<ChatPageProps> = ({ caseId }) => {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApiKeyReady, setIsApiKeyReady] = useState<boolean | null>(null);
  const [apiSource, setApiSource] = useState<ApiSource>('gemini');
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>('');
  const [thinkingMode, setThinkingMode] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ dataUrl: string; mimeType: string } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const navigate = useNavigate();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNewCase = !caseId;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const storedApiSource = await dbService.getSetting<ApiSource>('apiSource');
        if (storedApiSource) setApiSource(storedApiSource);

        if (storedApiSource === 'openrouter') {
          const storedApiKey = await dbService.getSetting<string>('openRouterApiKey');
          if (storedApiKey) {
            setOpenRouterApiKey(storedApiKey);
            setIsApiKeyReady(true);
          } else {
            setIsApiKeyReady(false);
          }
        } else {
          // For Gemini
          if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setIsApiKeyReady(hasKey);
          } else {
            setIsApiKeyReady(true); // Assume ready for local dev
          }
        }

        if (!isNewCase) {
          const loadedCase = await dbService.getCase(caseId);
          if (loadedCase) {
            setCaseData(loadedCase);
            setChatHistory(loadedCase.chatHistory);
          } else {
            console.error("Case not found");
            navigate('/');
          }
        } else {
          setChatHistory([]);
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
        } else if (file.type === 'application/pdf') {
            setIsProcessingFile(true);
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const typedarray = new Uint8Array(e.target!.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
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
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert('نوع الملف غير مدعوم. يرجى تحميل صورة أو ملف PDF.');
        }
        event.target.value = ''; // Allow re-uploading same file
    };

  const processStream = useCallback(async (
      stream: AsyncGenerator<{ text: string }>,
      tempModelMessageId: string
  ) => {
      let fullResponse = '';
      for await (const chunk of stream) {
          if (chunk.text) {
              fullResponse += chunk.text;
              setChatHistory(prev =>
                  prev.map(msg =>
                      msg.id === tempModelMessageId ? { ...msg, content: fullResponse } : msg
                  )
              );
          }
      }
      return fullResponse;
  }, []);

  const handleSendMessage = async (prompt?: string) => {
    const messageContent = (prompt || userInput).trim();
    if (isLoading || isProcessingFile || (!messageContent && !uploadedImage)) return;

    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: messageContent || 'حلل المرفق.',
      imageUrl: uploadedImage?.dataUrl,
      imageMimeType: uploadedImage?.mimeType
    };
    
    setUserInput('');
    setUploadedImage(null);

    const currentChatHistory = [...chatHistory, userMessage];
    setChatHistory(currentChatHistory);

    const tempModelMessage: ChatMessage = { role: 'model', content: '', id: uuidv4() };
    setChatHistory(prev => [...prev, tempModelMessage]);

    try {
        let stream;
        if (apiSource === 'openrouter') {
            stream = streamChatResponseFromOpenRouter(openRouterApiKey, currentChatHistory);
        } else {
            stream = streamChatResponseFromGemini(currentChatHistory, thinkingMode);
        }

        const fullResponse = await processStream(stream, tempModelMessage.id);
        const finalHistory = [...currentChatHistory, { ...tempModelMessage, content: fullResponse }];

        if (isNewCase) {
            const newCase: Case = {
                id: uuidv4(),
                title: messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : ''),
                summary: fullResponse.substring(0, 150) + (fullResponse.length > 150 ? '...' : ''),
                chatHistory: finalHistory,
                createdAt: Date.now(),
                status: 'جديدة',
            };
            await dbService.addCase(newCase);
            navigate(`/case/${newCase.id}`, { replace: true });
        } else if (caseData) {
            const updatedCase = {
                ...caseData,
                summary: fullResponse.substring(0, 150) + (fullResponse.length > 150 ? '...' : ''),
                chatHistory: finalHistory
            };
            await dbService.updateCase(updatedCase);
            setCaseData(updatedCase);
        }
    } catch (error: any) {
        console.error(`Error during ${apiSource} streaming:`, error);
        let chatErrorMessage = 'حدث خطأ أثناء معالجة الطلب.';
        const errorMessage = error.toString();
        
        if (errorMessage.includes("API key") || errorMessage.includes("authentication") || errorMessage.includes("was not found")) {
            setIsApiKeyReady(false);
            chatErrorMessage = `مفتاح API غير صالح أو غير متوفر لـ ${apiSource}. الرجاء إعادة المحاولة بعد تحديد مفتاح صالح.`;
        } else {
            chatErrorMessage = `حدث خطأ: ${error.message}`;
        }

        setChatHistory(prev =>
            prev.map(msg =>
                msg.id === tempModelMessage.id ? { ...msg, content: chatErrorMessage, isError: true } as any : msg
            )
        );
    } finally {
        setIsLoading(false);
    }
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
      return (
        <div className="w-full flex-grow flex flex-col items-center justify-center text-center p-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-200">مطلوب مفتاح API</h2>
            <p className="text-gray-400 mb-6 max-w-2xl">
              {apiSource === 'openrouter' 
                ? 'لاستخدام المستشار القانوني مع OpenRouter، يرجى إدخال مفتاح API الخاص بك في صفحة الإعدادات.'
                : 'لاستخدام المستشار القانوني مع Gemini، يرجى تحديد مفتاح Google AI API الخاص بك.'
              }
            </p>
            <button onClick={handleSelectApiKey} className="mt-6 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
              {apiSource === 'openrouter' ? 'الانتقال إلى الإعدادات' : 'تحديد مفتاح API'}
            </button>
        </div>
      );
  }

  return (
    <div className="w-full flex flex-col flex-grow bg-gray-800 rounded-lg overflow-hidden shadow-xl">
        <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center flex-wrap gap-2 sticky top-0 z-10">
            <h2 className="text-lg font-semibold text-gray-200 truncate">{caseData?.title || 'قضية جديدة'}</h2>
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

        <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto">
            {chatHistory.length === 0 && !isLoading ? (
                <div className="text-center text-gray-400">
                    <h2 className="text-2xl font-bold mb-4 text-gray-200">المستشار القانوني الفلسطيني</h2>
                    <p className="mb-8">ابدأ بوصف وقائع القضية، اطرح سؤالاً، أو ارفق مستنداً لتحليله.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                        {SUGGESTED_PROMPTS.map((prompt, index) => (
                            <button key={index} onClick={() => handleSendMessage(prompt)} className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 text-right transition-colors text-gray-300">
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {chatHistory.map((msg) => (
                        <div key={msg.id} className={`flex group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xl lg:max-w-3xl px-5 py-3 rounded-2xl relative ${(msg as any).isError ? 'bg-red-500/30 text-red-200 rounded-bl-none' : msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                {msg.role === 'model' && (
                                    <button onClick={() => handleCopy(msg.content, msg.id)} className="absolute top-2 left-2 p-1.5 bg-gray-600/50 rounded-full text-gray-300 hover:bg-gray-500/80 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="نسخ">
                                       {copiedMessageId === msg.id ? (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                       ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                       )}
                                    </button>
                                )}
                                {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="محتوى مرفق" className="rounded-lg mb-2 max-w-xs max-h-64 object-contain" />
                                )}
                                {/* FIX: Use marked.parseSync for synchronous markdown parsing to prevent type errors. */}
                                <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.content || '...', { breaks: true })) }}></div>
                            </div>
                        </div>
                    ))}
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
                    <span>جاري معالجة ملف PDF...</span>
                </div>
            )}
            <div className="flex items-center space-x-reverse space-x-3">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || isProcessingFile} className="p-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors" aria-label="إرفاق ملف">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </button>
                <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" placeholder="اكتب رسالتك أو ارفق ملفاً..." rows={1} disabled={isLoading || isProcessingFile}/>
                <button onClick={() => handleSendMessage()} disabled={isLoading || isProcessingFile || (!userInput.trim() && !uploadedImage)} className="p-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors" aria-label="إرسال"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
            </div>
        </div>
    </div>
  );
};

export default ChatPage;
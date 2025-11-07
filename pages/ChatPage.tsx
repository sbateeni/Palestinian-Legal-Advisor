import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorage from '../hooks/useLocalStorage';
import { Case, ChatMessage, ApiSource } from '../types';
import { LOCAL_STORAGE_CASES_KEY, SUGGESTED_PROMPTS, LOCAL_STORAGE_API_SOURCE_KEY, LOCAL_STORAGE_OPENROUTER_API_KEY } from '../constants';
import { startChat, streamChatResponse } from '../services/geminiService';
import { streamChatResponseFromOpenRouter } from '../services/openRouterService';
import { formatStructuredLegalResponse } from '../utils/formatLegalResponse';
import { Chat } from '@google/genai';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

interface ChatPageProps {
  caseId?: string;
}

const ChatPage: React.FC<ChatPageProps> = ({ caseId }) => {
  const navigate = useNavigate();
  
  const [cases, setCases] = useLocalStorage<Case[]>(LOCAL_STORAGE_CASES_KEY, []);
  const [apiSource] = useLocalStorage<ApiSource>(LOCAL_STORAGE_API_SOURCE_KEY, 'gemini');
  const [openRouterApiKey] = useLocalStorage<string>(LOCAL_STORAGE_OPENROUTER_API_KEY, '');

  // Ensure cases are properly loaded
  useEffect(() => {
    // This will trigger a re-render if cases change in another tab
  }, [cases]);

  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [userInput, setUserInput] = useState('');
  const [userRole, setUserRole] = useState<'plaintiff' | 'defendant' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialCase, setIsInitialCase] = useState(!caseId);
  const [isApiKeyReady, setIsApiKeyReady] = useState<boolean | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  useEffect(() => {
    if (apiSource === 'gemini') {
        const checkApiKey = async () => {
          if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setIsApiKeyReady(hasKey);
          } else {
            console.warn('window.aistudio not found.');
            setIsApiKeyReady(true); // Assume it's handled if aistudio is not present
          }
        };
        checkApiKey();
    } else { // openrouter
        setIsApiKeyReady(!!openRouterApiKey);
    }
  }, [apiSource, openRouterApiKey]);

  useEffect(() => {
    if (caseId) {
      const foundCase = cases.find(c => c.id === caseId);
      if (foundCase) {
        setCurrentCase(foundCase);
        setIsInitialCase(false);
        chatSessionRef.current = null;
      } else {
        navigate('/');
      }
    } else {
      setCurrentCase(null);
      setIsInitialCase(true);
      chatSessionRef.current = null;
    }
  }, [caseId, cases, navigate]);
  
  useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
  }, [currentCase?.chatHistory]);

  const handleSelectApiKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        setIsApiKeyReady(true);
      } catch (error) {
        console.error("Error opening API key selector:", error);
      }
    }
  };

  const initializeChatSession = (history: ChatMessage[]): boolean => {
      chatSessionRef.current = startChat(history);
      if (!chatSessionRef.current) {
          alert("فشل في بدء المحادثة. تحقق من صلاحية مفتاح API الخاص بك.");
          window.aistudio?.hasSelectedApiKey().then(hasKey => {
              if (!hasKey) setIsApiKeyReady(false);
          });
          return false;
      }
      return true;
  }

  const handleSendMessage = async (message: string) => {
    if (isLoading || !message.trim()) return;
    setIsLoading(true);

    let caseToProcess: Case;
    let isNewCaseCreation = false;

    if (isInitialCase) {
        if (!userRole) {
          alert('يرجى تحديد صفتك في القضية');
          setIsLoading(false);
          return;
        }
        
        isNewCaseCreation = true;
        const fullMessage = `صفتي في القضية: ${
          userRole === 'plaintiff' ? 'مشتكي (مدعي)' : 'مشتكى عليه (مدعى عليه)'
        }\n\nتفاصيل القضية:\n${message}`;
        
        caseToProcess = {
            id: uuidv4(),
            title: `قضية جديدة - ${new Date().toLocaleDateString('ar')}`,
            summary: message,
            createdAt: Date.now(),
            chatHistory: [{ role: 'user', content: fullMessage }],
        };
    } else if (currentCase) {
        caseToProcess = {
            ...currentCase,
            chatHistory: [...currentCase.chatHistory, { role: 'user', content: message }],
        };
    } else {
        setIsLoading(false);
        return;
    }

    const tempModelMessage: ChatMessage = { role: 'model', content: '' };
    setCurrentCase({ ...caseToProcess, chatHistory: [...caseToProcess.chatHistory, tempModelMessage] });

    if (apiSource === 'gemini') {
        await streamResponseGemini(caseToProcess, message, isNewCaseCreation);
    } else {
        await streamResponseOpenRouter(caseToProcess, message);
    }

    if (isNewCaseCreation) {
        setIsInitialCase(false);
        navigate(`/case/${caseToProcess.id}`, { replace: true });
    }
  };
  
  const streamResponseGemini = async (caseWithUserMsg: Case, message: string, isNewCase: boolean) => {
    let fullResponse = '';
    
    try {
        if (isNewCase || !chatSessionRef.current) {
          if (!initializeChatSession(caseWithUserMsg.chatHistory)) {
             throw new Error("Failed to initialize chat session.");
          }
        }
        if (!chatSessionRef.current) throw new Error("Chat session not initialized.");
        const stream = await streamChatResponse(chatSessionRef.current, message);
        
        for await (const chunk of stream) {
            const text = chunk.text;
            fullResponse += text;
            setCurrentCase(prev => {
                if (!prev) return null;
                const newHistory = [...prev.chatHistory];
                newHistory[newHistory.length - 1] = { role: 'model', content: fullResponse };
                return { ...prev, chatHistory: newHistory };
            });
        }

        const finalCase: Case = { ...caseWithUserMsg, chatHistory: [...caseWithUserMsg.chatHistory, { role: 'model', content: fullResponse }] };
        setCases(prev => prev.find(c => c.id === finalCase.id) ? prev.map(c => c.id === finalCase.id ? finalCase : c) : [...prev, finalCase]);

    } catch (error: any) {
        console.error('Error during Gemini streaming chat:', error);
        let chatErrorMessage = 'حدث خطأ أثناء معالجة الطلب.';
        if (error.message.includes('API key')) setIsApiKeyReady(false);
        if (error.toString().includes('429') || error.toString().includes('Quota')) chatErrorMessage = 'لقد تجاوزت حد الطلبات. يرجى الانتظار والمحاولة مرة أخرى.';
        
        setCurrentCase(prev => {
            if (!prev) return null;
            const newHistory = [...prev.chatHistory];
            newHistory[newHistory.length - 1] = { role: 'model', content: chatErrorMessage };
            return { ...prev, chatHistory: newHistory };
        });
    } finally {
        setIsLoading(false);
        setUserInput('');
    }
  };

  const streamResponseOpenRouter = async (caseWithUserMsg: Case, message: string) => {
    let fullResponse = '';
    try {
        if (!openRouterApiKey) throw new Error("مفتاح OpenRouter API غير موجود.");
        const historyForApi = caseWithUserMsg.chatHistory.slice(0, -1);
        const stream = streamChatResponseFromOpenRouter(openRouterApiKey, historyForApi, message);
        
        for await (const textChunk of stream) {
            fullResponse += textChunk;
            setCurrentCase(prev => {
                if (!prev) return null;
                const newHistory = [...prev.chatHistory];
                newHistory[newHistory.length - 1] = { role: 'model', content: fullResponse };
                return { ...prev, chatHistory: newHistory };
            });
        }
        
        const finalCase: Case = { ...caseWithUserMsg, chatHistory: [...caseWithUserMsg.chatHistory, { role: 'model', content: fullResponse }] };
        setCases(prev => prev.find(c => c.id === finalCase.id) ? prev.map(c => c.id === finalCase.id ? finalCase : c) : [...prev, finalCase]);

    } catch (error: any) {
        console.error('Error during OpenRouter streaming chat:', error);
        const chatErrorMessage = `حدث خطأ: ${error.message}`;
        setCurrentCase(prev => {
            if (!prev) return null;
            const newHistory = [...prev.chatHistory];
            newHistory[newHistory.length - 1] = { role: 'model', content: chatErrorMessage };
            return { ...prev, chatHistory: newHistory };
        });
    } finally {
        setIsLoading(false);
        setUserInput('');
    }
  };

  if (isApiKeyReady === null) {
      return (
        <div className="w-full flex items-center justify-center p-8 text-lg">
          <svg className="animate-spin h-6 w-6 text-white me-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span>جاري التحقق من إعدادات API...</span>
        </div>
      );
  }

  if (!isApiKeyReady) {
      return apiSource === 'gemini' ? (
        <div className="w-full flex flex-col items-center justify-center text-center p-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-200">مطلوب مفتاح Google AI API</h2>
            <p className="text-gray-400 mb-6 max-w-2xl">لاستخدام المستشار القانوني، يرجى تحديد مفتاح Google AI API الخاص بك.</p>
            <button onClick={handleSelectApiKey} className="mt-6 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">تحديد مفتاح API</button>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center justify-center text-center p-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-200">مطلوب مفتاح OpenRouter API</h2>
            <p className="text-gray-400 mb-6 max-w-2xl">يرجى إدخال مفتاح OpenRouter API الخاص بك في صفحة الإعدادات للمتابعة.</p>
            <button onClick={() => navigate('/settings')} className="mt-6 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">الانتقال إلى الإعدادات</button>
        </div>
      );
  }

  if (isInitialCase) {
    return (
      <div className="w-full flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-200">ابدأ قضية جديدة</h2>
        <p className="text-gray-400 mb-6 max-w-2xl">أدخل وصفاً كاملاً للقضية القانونية التي تريد تحليلها. كلما كانت التفاصيل أكثر، كانت الإجابات أدق.</p>
        <div className="w-full max-w-3xl bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          <div className="space-y-6 p-4 border-b border-gray-700">
            <div>
              <label className="block text-right text-gray-300 text-lg font-medium mb-3">ما هي صفتك في القضية؟</label>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setUserRole('plaintiff')}
                  className={`flex-1 py-4 px-6 rounded-lg font-medium transition-colors ${
                    userRole === 'plaintiff'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  مشتكي (مدعي)
                </button>
                <button
                  onClick={() => setUserRole('defendant')}
                  className={`flex-1 py-4 px-6 rounded-lg font-medium transition-colors ${
                    userRole === 'defendant'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  مشتكى عليه (مدعى عليه)
                </button>
              </div>
            </div>

          </div>
          <div className="p-4">
            <textarea 
              value={userInput} 
              onChange={(e) => setUserInput(e.target.value)} 
              className="w-full h-48 p-4 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              placeholder="اكتب تفاصيل قضيتك هنا..."
            />
          </div>
          <div className="p-4 border-t border-gray-700">
            <button 
              onClick={() => handleSendMessage(userInput)} 
              disabled={isLoading || !userInput.trim() || !userRole} 
              className="w-full px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '...جار التحليل' : 'بدء التحليل'}
            </button>
          </div>
          {currentCase && currentCase.chatHistory.length > 0 && (
            <div className="p-6 border-t border-gray-700">
              <div className="space-y-4">
                {currentCase.chatHistory.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl px-5 py-3 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-gray-700 text-gray-200 rounded-bl-none'
                    }`}>
                      {msg.role === 'model' ? (
                        <div className="legal-analysis prose prose-invert prose-lg">
                          <div dangerouslySetInnerHTML={{
                            __html: formatStructuredLegalResponse(msg.content) || (isLoading ? 'جاري التحليل...' : '')
                          }} />
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-base">{msg.content}</pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-[calc(100vh-100px)] bg-gray-800 rounded-lg overflow-hidden shadow-xl">
      <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto">
        <div className="space-y-6">
          {currentCase?.chatHistory.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                {msg.role === 'model' ? (
                  <div className="legal-analysis prose prose-invert prose-lg">
                    <div dangerouslySetInnerHTML={{
                      __html: formatStructuredLegalResponse(msg.content) || (isLoading ? 'جاري التحليل...' : '')
                    }} />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-base">{msg.content || '...'}</pre>
                )}
              </div>
            </div>
          ))}
          {isLoading && currentCase?.chatHistory.length > 0 && currentCase?.chatHistory[currentCase?.chatHistory.length - 1].role === 'model' && (
             <div className="flex justify-start">
               <div className="max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none">
                 <div className="animate-pulse">...يفكر</div>
               </div>
             </div>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map(prompt => (<button key={prompt} onClick={() => handleSendMessage(prompt)} disabled={isLoading} className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 disabled:opacity-50 transition-colors">{prompt}</button>))}
        </div>
        <div className="flex items-center space-x-reverse space-x-3">
          <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(userInput); } }} className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" placeholder="اكتب رسالتك هنا..." rows={1} disabled={isLoading}/>
          <button onClick={() => handleSendMessage(userInput)} disabled={isLoading || !userInput.trim()} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg></button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
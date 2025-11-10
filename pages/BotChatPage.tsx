import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '../types';
// FIX: Correct the function name to match the export from geminiService.
import { streamChatResponseFromGemini } from '../services/geminiService';
// FIX: Import 'marked' for Markdown parsing and 'DOMPurify' for HTML sanitization to render model responses safely.
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const BotChatPage: React.FC = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: uuidv4(),
      role: 'model',
      content: 'أهلاً بك! أنا مساعدك الذكي. يمكنك طرح الأسئلة أو تحليل الصور باستخدام Gemini.'
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [uploadedImage, setUploadedImage] = useState<{ dataUrl: string; mimeType: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiKeyReady, setIsApiKeyReady] = useState<boolean | null>(null);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsApiKeyReady(hasKey);
        } else {
          setIsApiKeyReady(true); // Assume ready for local dev
        }
      } catch (error) {
        console.error("Error checking API key:", error);
        setIsApiKeyReady(false);
      }
    };
    checkKey();
  }, []);
  
  useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
  }, [chatHistory]);

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic validation for image types
      if (!file.type.startsWith('image/')) {
        alert('يرجى تحديد ملف صورة صالح.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage({ dataUrl: e.target?.result as string, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
    // Reset file input value to allow re-uploading the same file
    event.target.value = '';
  };
  
  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => {
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  const handleSendMessage = async () => {
    const messageContent = userInput.trim();
    if (isLoading || (!messageContent && !uploadedImage)) return;

    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: messageContent || 'تحليل الصورة.',
      imageUrl: uploadedImage?.dataUrl,
      imageMimeType: uploadedImage?.mimeType
    };
    
    // Clear inputs after preparing the message
    setUserInput('');
    setUploadedImage(null);

    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    
    const tempModelMessage: ChatMessage = { role: 'model', content: '', id: uuidv4() };
    setChatHistory(prev => [...prev, tempModelMessage]);

    let fullResponse = '';
    
    try {
      // FIX: Use the correct function name for streaming the chat response.
      const stream = streamChatResponseFromGemini(newHistory, thinkingMode);

      for await (const chunk of stream) {
        if (chunk.text) {
          fullResponse += chunk.text;
          setChatHistory(prev => {
              const updatedHistory = prev.map(msg => 
                  msg.id === tempModelMessage.id ? { ...msg, content: fullResponse } : msg
              );
              return updatedHistory;
          });
        }
      }
    } catch (error: any) {
        console.error(`Error during Gemini bot streaming:`, error);
        let chatErrorMessage = 'حدث خطأ أثناء معالجة الطلب.';
        const errorMessage = error.toString();
        
        if (errorMessage.includes("API key") || errorMessage.includes("authentication") || errorMessage.includes("was not found")) {
            setIsApiKeyReady(false);
            chatErrorMessage = `مفتاح API غير صالح أو غير متوفر لـ Gemini. الرجاء إعادة المحاولة بعد تحديد مفتاح صالح.`;
        } else {
            chatErrorMessage = `حدث خطأ: ${error.message}`;
        }
        
        setChatHistory(prev => {
            const updatedHistory = prev.map(msg => 
                msg.id === tempModelMessage.id ? { ...msg, content: chatErrorMessage } : msg
            );
            return updatedHistory;
        });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isApiKeyReady === null) {
      return (
        <div className="w-full flex-grow flex items-center justify-center p-8 text-lg">
          <svg className="animate-spin h-6 w-6 text-white me-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span>جاري التحقق من إعدادات API...</span>
        </div>
      );
  }

  if (!isApiKeyReady) {
      return (
        <div className="w-full flex-grow flex flex-col items-center justify-center text-center p-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-200">مطلوب مفتاح Google AI API</h2>
            <p className="text-gray-400 mb-6 max-w-2xl">لاستخدام المساعد الذكي، يرجى تحديد مفتاح Google AI API الخاص بك.</p>
            <button onClick={handleSelectApiKey} className="mt-6 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">تحديد مفتاح API</button>
        </div>
      );
  }

  return (
    <div className="w-full flex flex-col flex-grow bg-gray-800 rounded-lg overflow-hidden shadow-xl">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center flex-wrap gap-2 sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-gray-200 truncate">المساعد الذكي</h2>
        <div className="flex items-center space-x-2 space-x-reverse">
            <label htmlFor="thinking-mode-toggle" className="text-sm font-medium text-gray-300 cursor-pointer">وضع التفكير العميق (Pro)</label>
            <button
              id="thinking-mode-toggle"
              role="switch"
              aria-checked={thinkingMode}
              onClick={() => setThinkingMode(!thinkingMode)}
              className={`${
                thinkingMode ? 'bg-blue-600' : 'bg-gray-600'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
            >
              <span
                className={`${
                  thinkingMode ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
        </div>
      </div>

      <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto">
        <div className="space-y-6">
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl lg:max-w-3xl px-5 py-3 rounded-2xl relative ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="محتوى مرفق" className="rounded-lg mb-2 max-w-xs max-h-64 object-contain" />
                )}
                {msg.role === 'model' ? (
                   <>
                    <button onClick={() => handleCopy(msg.content, msg.id)} className="absolute top-2 left-2 p-1.5 bg-gray-600/50 rounded-full text-gray-300 hover:bg-gray-500/80 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="نسخ">
                       {copiedMessageId === msg.id ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                       ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                       )}
                    </button>
                    {/* FIX: Use marked.parseSync for synchronous markdown parsing to prevent type errors. */}
                    <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parseSync(msg.content || '...')) }}></div>
                   </>
                 ) : (
                    <p className="whitespace-pre-wrap font-sans text-base">{msg.content || '...'}</p>
                 )}
              </div>
            </div>
          ))}
          {isLoading && (
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
        <div className="flex items-center space-x-reverse space-x-3">
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors" aria-label="تحميل صورة">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
          <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" placeholder="اكتب رسالتك أو حمّل صورة..." rows={1} disabled={isLoading}/>
          <button onClick={handleSendMessage} disabled={isLoading || (!userInput.trim() && !uploadedImage)} className="p-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors" aria-label="إرسال"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
        </div>
      </div>
    </div>
  );
};

export default BotChatPage;
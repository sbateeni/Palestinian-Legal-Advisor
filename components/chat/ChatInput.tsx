import React, { RefObject, useState, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { ActionMode } from '../../types';
import { AGENT_PROMPTS } from '../../constants';
import LegalToolbar from '../LegalToolbar';

const { Link } = ReactRouterDOM;

interface ChatInputProps {
    userInput: string;
    setUserInput: (val: string | ((prev: string) => string)) => void;
    handleSendMessage: (prompt?: string) => void;
    handleStopGenerating: () => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: RefObject<HTMLInputElement | null>;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    isLoading: boolean;
    isProcessingFile: boolean;
    uploadedImages: { dataUrl: string; mimeType: string }[];
    setUploadedImages: (val: { dataUrl: string; mimeType: string }[]) => void;
    processingMessage: string;
    authError: string | null;
    actionMode: ActionMode;
    setActionMode: (mode: ActionMode) => void;
    chatHistoryLength: number;
    isApiKeyReady: boolean | null;
}

const ChatInput: React.FC<ChatInputProps> = ({
    userInput,
    setUserInput,
    handleSendMessage,
    handleStopGenerating,
    handleFileChange,
    fileInputRef,
    textareaRef,
    isLoading,
    isProcessingFile,
    uploadedImages,
    setUploadedImages,
    processingMessage,
    authError,
    actionMode,
    setActionMode,
    chatHistoryLength,
    isApiKeyReady
}) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const baseTextRef = useRef('');

    const isDisabled = isLoading || isProcessingFile || !isApiKeyReady;
    const activePrompts = AGENT_PROMPTS[actionMode] || AGENT_PROMPTS['analysis'] || [];

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recog = new SpeechRecognition();
            recog.continuous = true;
            recog.interimResults = true;
            recog.lang = 'ar-PS';

            recog.onstart = () => {
                setIsListening(true);
                baseTextRef.current = userInput; 
            };

            recog.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                setUserInput((prev) => {
                    const prefix = baseTextRef.current;
                    const separator = (prefix && !prefix.endsWith(' ') && !prefix.endsWith('\n')) ? ' ' : '';
                    return prefix + separator + finalTranscript + interimTranscript;
                });
                
                if (finalTranscript) {
                     const prefix = baseTextRef.current;
                     const separator = (prefix && !prefix.endsWith(' ') && !prefix.endsWith('\n')) ? ' ' : '';
                     baseTextRef.current = prefix + separator + finalTranscript;
                }
            };

            recog.onend = () => setIsListening(false);
            recog.onerror = () => setIsListening(false);
            recognitionRef.current = recog;
        }
    }, []);

    useEffect(() => {
        if (!isListening) baseTextRef.current = userInput;
    }, [userInput, isListening]);

    const toggleListening = () => {
        if (!recognitionRef.current) return alert("متصفحك لا يدعم خاصية الإملاء الصوتي.");
        if (isListening) recognitionRef.current.stop();
        else {
            baseTextRef.current = userInput;
            recognitionRef.current.start();
        }
    };

    const removeImage = (index: number) => {
        setUploadedImages(uploadedImages.filter((_, i) => i !== index));
    };

    return (
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors duration-300">
            {/* API Key Warning */}
            {!isApiKeyReady && (
                <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm flex items-center justify-between">
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2 text-yellow-600 dark:text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>وضع القراءة فقط: يجب إدخال مفتاح API لمتابعة المحادثة.</span>
                    </div>
                    <Link to="/settings" className="bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded transition-colors text-xs font-bold">
                        الإعدادات
                    </Link>
                </div>
            )}

            {/* Legal Action Toolbar */}
            <LegalToolbar
                currentMode={actionMode}
                onModeChange={setActionMode}
                disabled={isDisabled}
            />

            {/* Dynamic Suggested Prompts */}
            {!isDisabled && Array.isArray(activePrompts) && activePrompts.length > 0 && (
                <div className="mb-3 animate-fade-in">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <span className="text-sm text-gray-500 dark:text-slate-400 font-medium whitespace-nowrap flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 me-1 text-amber-500 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                            اقتراحات:
                        </span>
                        {activePrompts.map((prompt, index) => (
                            <button
                                key={`${actionMode}-${index}`}
                                onClick={() => handleSendMessage(prompt)}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-full text-xs font-medium whitespace-nowrap hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 border border-gray-200 dark:border-slate-700 transition-all duration-200"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="flex items-center space-x-reverse space-x-2 relative">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" multiple />
                <button onClick={() => fileInputRef.current?.click()} disabled={isDisabled} className="p-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors" title="إرفاق ملف">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </button>
                
                <button
                    onClick={toggleListening}
                    disabled={isDisabled}
                    className={`p-3 rounded-lg transition-all duration-200 flex-shrink-0 ${
                        isListening 
                        ? 'bg-red-500 text-white shadow-lg scale-110 animate-pulse' 
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>

                <textarea
                    ref={textareaRef}
                    value={userInput}
                    onChange={(e) => {
                        setUserInput(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    className={`flex-grow p-3 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 focus:ring-2 focus:outline-none resize-none transition-all duration-300 disabled:opacity-50 ${
                        actionMode === 'loopholes' ? 'focus:ring-rose-500' :
                        actionMode === 'drafting' ? 'focus:ring-emerald-500' :
                        'focus:ring-blue-500'
                    }`}
                    placeholder="اكتب رسالتك هنا..."
                    rows={1}
                    style={{ maxHeight: '10rem' }}
                    disabled={isDisabled}
                />
                
                {isLoading ? (
                    <button onClick={handleStopGenerating} className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 9a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                ) : (
                    <button
                        onClick={() => handleSendMessage()}
                        disabled={isDisabled || (!userInput.trim() && uploadedImages.length === 0)}
                        className={`p-3 text-white rounded-lg transition-colors ${
                            actionMode === 'loopholes' ? 'bg-rose-600 hover:bg-rose-700' :
                            actionMode === 'drafting' ? 'bg-emerald-600 hover:bg-emerald-700' :
                            'bg-blue-600 hover:bg-blue-700'
                        } disabled:bg-gray-300 dark:disabled:bg-slate-700`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChatInput;
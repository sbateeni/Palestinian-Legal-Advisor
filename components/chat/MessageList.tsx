
import React, { useState, useEffect } from 'react';
import { ChatMessage, CaseType, ActionMode } from '../../types';
import ChatMessageItem from '../ChatMessageItem';

interface MessageListProps {
    messages: ChatMessage[];
    isLoading: boolean;
    pinnedMessages: ChatMessage[];
    onPinMessage: (msg: ChatMessage) => void;
    onConvertCaseType?: (type: CaseType) => void;
    onFollowUpAction?: (mode: ActionMode, prompt: string) => void;
}

interface SuggestedAction {
    label: string;
    mode: ActionMode;
    prompt: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, pinnedMessages, onPinMessage, onConvertCaseType, onFollowUpAction }) => {
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const handleCopy = (content: string, id: string) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopiedMessageId(id);
            setTimeout(() => setCopiedMessageId(null), 2000);
        });
    };

    const handleDownload = (content: string, id: string) => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `legal-advisor-response-${id.slice(0, 6)}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleSpeak = (text: string, id: string) => {
        if (speakingMessageId === id) {
            window.speechSynthesis.cancel();
            setSpeakingMessageId(null);
            return;
        }
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[*#`_]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ar-SA';
        utterance.rate = 1.0;
        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = () => setSpeakingMessageId(null);
        setSpeakingMessageId(id);
        window.speechSynthesis.speak(utterance);
    };

    const parseRedirectMessage = (content: string) => {
        const jsonMatch = content.match(/```json\s*(\{[\s\S]*?"redirect"[\s\S]*?\})\s*```/);
        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[1]);
                if (data.redirect) return data;
            } catch (e) {
                return null;
            }
        }
        return null;
    };

    const parseNextActions = (content: string): { text: string, actions: SuggestedAction[] } => {
        const jsonMatch = content.match(/```json\s*(\{[\s\S]*?"next_steps"[\s\S]*?\})\s*```/);
        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[1]);
                if (data.next_steps && Array.isArray(data.next_steps)) {
                    const cleanText = content.replace(jsonMatch[0], '').trim();
                    return { text: cleanText, actions: data.next_steps };
                }
            } catch (e) { }
        }
        return { text: content, actions: [] };
    };

    if (messages.length === 0 && !isLoading) {
        return (
            <div className="text-center text-gray-400 flex flex-col items-center justify-center h-full p-8">
                <div className="bg-gray-700/30 p-8 rounded-full mb-6 border border-gray-600/50 shadow-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="h-24 w-24 text-amber-500">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
                    </svg>
                </div>
                <h2 className="text-3xl font-bold mb-4 text-gray-100 tracking-wide">المستشار القانوني الفلسطيني</h2>
                <p className="mb-8 max-w-lg text-lg leading-relaxed text-gray-300">
                    مرحباً بك. أنا هنا لمساعدتك في فهم القانون الفلسطيني.
                    <br />
                    أدخل تفاصيل قضيتك وسأقوم بالبحث في المصادر الرسمية (المقتفي، الجريدة الرسمية) لتقديم المشورة.
                </p>
            </div>
        );
    }

    const getModelDisplayName = (modelId?: string): string => {
        if (!modelId) return '';
        if (modelId.includes('gemini')) return 'Gemini AI (Search Enabled)';
        return modelId;
    };

    return (
        <div className="space-y-6 pb-4">
            {messages.map((msg) => {
                const isPinned = pinnedMessages.some(p => p.id === msg.id);
                const hasGrounding = msg.groundingMetadata?.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0;
                
                let redirectData = null;
                let nextActions: SuggestedAction[] = [];
                let displayContent = msg.content;

                if (msg.role === 'model') {
                    redirectData = parseRedirectMessage(msg.content);
                    if (!redirectData) {
                        const parsed = parseNextActions(msg.content);
                        displayContent = parsed.text;
                        nextActions = parsed.actions;
                    }
                }
                
                return (
                    <div key={msg.id} className={`flex flex-col group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-xl lg:max-w-3xl px-5 py-4 rounded-2xl relative shadow-md ${msg.isError ? 'bg-red-500/20 text-red-200 border border-red-500/30' : msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-700 text-gray-200 rounded-bl-sm'}`}>
                            
                            {!redirectData && (
                                <div className="absolute top-2 left-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onPinMessage(msg)} className="p-1.5 bg-black/20 rounded-full text-gray-300 hover:bg-black/40 disabled:opacity-50 disabled:cursor-default transition-colors" title={isPinned ? "تم التثبيت" : "تثبيت الرسالة"} disabled={isPinned}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${isPinned ? 'text-yellow-400' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10.49 2.23a.75.75 0 00-1.02-.04l-7.5 6.25a.75.75 0 00.99 1.18L8 5.44V14a1 1 0 102 0V5.44l5.03 4.18a.75.75 0 00.99-1.18l-7.5-6.25z" clipRule="evenodd" />
                                            <path d="M4 14a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM16 14a1 1 0 011 1v1a1 1 0 011-1z" />
                                        </svg>
                                    </button>
                                    {msg.role === 'model' && (
                                        <>
                                            <button onClick={() => handleSpeak(msg.content, msg.id)} className={`p-1.5 bg-black/20 rounded-full hover:bg-black/40 transition-colors ${speakingMessageId === msg.id ? 'text-green-400 animate-pulse' : 'text-gray-300'}`} aria-label="قراءة صوتية">
                                                {speakingMessageId === msg.id ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button onClick={() => handleCopy(msg.content, msg.id)} className="p-1.5 bg-black/20 rounded-full text-gray-300 hover:bg-black/40 transition-colors" aria-label="نسخ">
                                                {copiedMessageId === msg.id ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                )}
                                            </button>
                                            <button onClick={() => handleDownload(msg.content, msg.id)} className="p-1.5 bg-black/20 rounded-full text-gray-300 hover:bg-black/40 transition-colors" aria-label="تحميل">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" /></svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {msg.images && msg.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {msg.images.map((image, index) => (
                                        <img key={index} src={image.dataUrl} alt={`مرفق ${index + 1}`} className="rounded-lg max-w-xs max-h-64 object-contain bg-black/50 border border-white/10" />
                                    ))}
                                </div>
                            )}

                            {redirectData ? (
                                <div className="bg-red-900/30 border-2 border-red-500/50 p-4 rounded-xl text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 bg-red-900/50 rounded-full text-red-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-red-200">تنبيه اختصاص قضائي</h3>
                                        <p className="text-red-100/90 text-sm leading-relaxed max-w-md">
                                            {redirectData.reason}
                                            <br />
                                            الاختصاص الصحيح هو: <strong>{redirectData.court}</strong>.
                                        </p>
                                        {onConvertCaseType && (
                                            <button 
                                                onClick={() => onConvertCaseType(redirectData.redirect)}
                                                className="mt-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                                            >
                                                <span>نقل القضية فوراً</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <ChatMessageItem content={displayContent || '...'} isModel={msg.role === 'model'} />
                            )}

                            {/* NEXT ACTIONS */}
                            {nextActions.length > 0 && onFollowUpAction && (
                                <div className="mt-4 pt-3 border-t border-gray-600/50">
                                    <p className="text-xs text-gray-400 mb-2 font-medium">خطوات مقترحة:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {nextActions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => onFollowUpAction(action.mode, action.prompt)}
                                                className="px-4 py-2 bg-gray-900/60 hover:bg-blue-600/20 border border-gray-600 hover:border-blue-500/50 rounded-lg text-sm text-blue-200 transition-all flex items-center gap-2"
                                            >
                                                <span>{action.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* GROUNDING SOURCES (Updated Look) */}
                            {hasGrounding && !redirectData && (
                                <div className="mt-6 pt-4 border-t-2 border-gray-600/30 bg-black/20 rounded-lg p-3 -mx-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-bold text-blue-300 flex items-center uppercase tracking-wider">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 me-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                            🔗 المصادر والمراجع (Grounding)
                                        </p>
                                        {msg.groundingMetadata?.webSearchQueries && (
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                {msg.groundingMetadata.webSearchQueries[0]}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {msg.groundingMetadata?.groundingChunks.map((chunk, idx) => (
                                            chunk.web && (
                                                <a
                                                    key={idx}
                                                    href={chunk.web.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center p-2 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500/50 transition-all group/link"
                                                >
                                                    <span className="flex-shrink-0 w-5 h-5 rounded bg-blue-900/50 text-blue-400 flex items-center justify-center text-[10px] me-2 font-mono border border-blue-500/20">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-grow min-w-0">
                                                        <p className="text-xs font-medium text-gray-200 truncate group-hover/link:text-blue-200">
                                                            {chunk.web.title || "مصدر قانوني"}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 truncate font-mono">
                                                            {new URL(chunk.web.uri).hostname}
                                                        </p>
                                                    </div>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-600 ms-2 group-hover/link:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                </a>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
            {isLoading && messages.length > 0 && messages[messages.length - 1].role !== 'model' && (
                <div className="flex justify-start">
                    <div className="max-w-xl px-6 py-4 rounded-2xl bg-gray-700 rounded-bl-none">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageList;

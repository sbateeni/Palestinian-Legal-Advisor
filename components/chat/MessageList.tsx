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
    onEditMessage?: (id: string, newContent: string) => void;
}

interface SuggestedAction {
    label: string;
    mode: ActionMode;
    prompt: string;
}

const MessageList: React.FC<MessageListProps> = ({ 
    messages, 
    isLoading, 
    pinnedMessages, 
    onPinMessage, 
    onConvertCaseType, 
    onFollowUpAction,
    onEditMessage 
}) => {
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
        let jsonMatch = content.match(/```json\s*(\{[\s\S]*?"redirect"[\s\S]*?\})\s*```/);
        if (!jsonMatch) {
             jsonMatch = content.match(/(\{[\s\S]*?"redirect"[\s\S]*?"court"[\s\S]*?\})/);
        }
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
        const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            try {
                const data = JSON.parse(codeBlockMatch[1]);
                if (data.next_steps && Array.isArray(data.next_steps)) {
                    return { 
                        text: content.replace(codeBlockMatch[0], '').trim(), 
                        actions: data.next_steps 
                    };
                }
            } catch (e) { }
        }
        return { text: content, actions: [] };
    };

    if (!Array.isArray(messages) || (messages.length === 0 && !isLoading)) {
        return (
            <div className="text-center text-gray-500 dark:text-slate-200 flex flex-col items-center justify-center h-full p-8 no-print transition-colors">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-full mb-6 border border-gray-200 dark:border-slate-800 shadow-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="h-24 w-24 text-amber-500 dark:text-blue-400">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
                    </svg>
                </div>
                <h2 className="text-3xl font-black mb-4 text-gray-900 dark:text-white tracking-wide">المستشار القانوني الفلسطيني</h2>
                <p className="mb-8 max-w-lg text-lg leading-relaxed text-gray-600 dark:text-slate-200">
                    مرحباً بك. أنا هنا لمساعدتك في فهم القانون الفلسطيني.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-4">
            {messages.map((msg) => {
                if (!msg) return null;
                const isPinned = Array.isArray(pinnedMessages) && pinnedMessages.some(p => p.id === msg.id);
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
                        <div className={`max-w-xl lg:max-w-3xl px-5 py-4 rounded-2xl relative shadow-sm border transition-all duration-300 ${msg.isError ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-100 border-red-200 dark:border-red-800' : msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm border-blue-600 dark:border-blue-700' : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-50 rounded-bl-sm border-gray-200 dark:border-slate-700 shadow-md dark:shadow-slate-950'}`}>
                            
                            {!redirectData && (
                                <div className="absolute top-2 left-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity no-print z-10">
                                    <button onClick={() => onPinMessage(msg)} className="p-1.5 bg-gray-200/50 dark:bg-slate-800/80 hover:bg-gray-300 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-white disabled:opacity-50 transition-colors" title={isPinned ? "تم التثبيت" : "تثبيت الرسالة"} disabled={isPinned}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${isPinned ? 'text-yellow-500' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.49 2.23a.75.75 0 00-1.02-.04l-7.5 6.25a.75.75 0 00.99 1.18L8 5.44V14a1 1 0 102 0V5.44l5.03 4.18a.75.75 0 00.99-1.18l-7.5-6.25z" clipRule="evenodd" /></svg>
                                    </button>
                                    {msg.role === 'model' && (
                                        <>
                                            <button onClick={() => handleSpeak(msg.content, msg.id)} className={`p-1.5 bg-gray-200/50 dark:bg-slate-800/80 rounded-full hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors ${speakingMessageId === msg.id ? 'text-green-600 animate-pulse' : 'text-gray-500 dark:text-slate-200'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                            </button>
                                            <button onClick={() => handleCopy(msg.content, msg.id)} className="p-1.5 bg-gray-200/50 dark:bg-slate-800/80 rounded-full text-gray-500 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {msg.images && msg.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {msg.images.map((image, index) => (
                                        <img key={index} src={image.dataUrl} alt={`مرفق ${index + 1}`} className="rounded-lg max-w-xs max-h-64 object-contain bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm" />
                                    ))}
                                </div>
                            )}

                            {redirectData ? (
                                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-4 rounded-xl text-center shadow-lg">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-full text-red-600 dark:text-red-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        </div>
                                        <h3 className="text-xl font-black text-red-800 dark:text-white">تنبيه اختصاص قضائي</h3>
                                        <p className="text-red-700 dark:text-red-100 text-sm font-medium">{redirectData.reason}</p>
                                        {onConvertCaseType && (
                                            <button onClick={() => onConvertCaseType(redirectData.redirect)} className="mt-2 px-6 py-2.5 bg-red-600 dark:bg-red-700 text-white font-black rounded-lg shadow-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors">نقل القضية فوراً</button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <ChatMessageItem 
                                    content={displayContent || '...'} 
                                    isModel={msg.role === 'model'}
                                    messageId={msg.id}
                                    groundingMetadata={msg.groundingMetadata}
                                    onEdit={onEditMessage} 
                                />
                            )}

                            {nextActions.length > 0 && onFollowUpAction && (
                                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-800 no-print">
                                    <div className="flex flex-wrap gap-2">
                                        {nextActions.map((action, idx) => (
                                            <button key={idx} onClick={() => onFollowUpAction(action.mode, action.prompt)} className="px-4 py-2 bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-800 dark:text-white shadow-sm transition-all font-black">
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {hasGrounding && !redirectData && (
                                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/60 rounded-lg p-3 -mx-2 no-print shadow-inner">
                                    <p className="text-xs font-black text-blue-700 dark:text-blue-400 mb-3 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 me-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                        🔗 المصادر والمراجع المتحقق منها
                                    </p>
                                    <div className="space-y-2">
                                        {msg.groundingMetadata?.groundingChunks?.map((chunk, idx) => (
                                            chunk.web && (
                                                <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center p-2 rounded bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-gray-200 dark:border-slate-700 transition-all group/link shadow-sm">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[10px] me-2 font-mono border border-blue-200 dark:border-blue-700 shadow-inner font-bold">{idx + 1}</span>
                                                    <div className="flex-grow min-w-0">
                                                        <p className="text-xs font-black text-gray-900 dark:text-white truncate group-hover/link:text-blue-700 dark:group-hover/link:text-blue-400">{chunk.web.title || "مصدر قانوني"}</p>
                                                        <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate font-mono">{new URL(chunk.web.uri).hostname}</p>
                                                    </div>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 dark:text-slate-500 ms-2 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
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
                <div className="flex justify-start no-print">
                    <div className="max-w-xl px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-bl-none">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <div className="w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageList;
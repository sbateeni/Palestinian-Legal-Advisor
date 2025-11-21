
import React, { useState } from 'react';
import { ChatMessage } from '../../types';
import ChatMessageItem from '../ChatMessageItem';

interface MessageListProps {
    messages: ChatMessage[];
    isLoading: boolean;
    pinnedMessages: ChatMessage[];
    onPinMessage: (msg: ChatMessage) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, pinnedMessages, onPinMessage }) => {
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    const handleCopy = (content: string, id: string) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopiedMessageId(id);
            setTimeout(() => setCopiedMessageId(null), 2000);
        });
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
                    ابدأ بوصف قضيتك، أو استخدم الأوضاع المتخصصة في الأسفل للحصول على استشارة دقيقة.
                </p>
            </div>
        );
    }

    const getModelDisplayName = (modelId?: string): string => {
        if (!modelId) return '';
        if (modelId.includes('gemini')) return 'Gemini AI';
        return modelId;
    };

    return (
        <div className="space-y-6 pb-4">
            {messages.map((msg) => {
                const isPinned = pinnedMessages.some(p => p.id === msg.id);
                return (
                    <div key={msg.id} className={`flex flex-col group ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-xl lg:max-w-3xl px-5 py-4 rounded-2xl relative shadow-md ${msg.isError ? 'bg-red-500/20 text-red-200 border border-red-500/30' : msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-700 text-gray-200 rounded-bl-sm'}`}>
                            <div className="absolute top-2 left-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onPinMessage(msg)} className="p-1.5 bg-black/20 rounded-full text-gray-300 hover:bg-black/40 disabled:opacity-50 disabled:cursor-default transition-colors" title={isPinned ? "تم التثبيت" : "تثبيت الرسالة"} disabled={isPinned}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${isPinned ? 'text-yellow-400' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10.49 2.23a.75.75 0 00-1.02-.04l-7.5 6.25a.75.75 0 00.99 1.18L8 5.44V14a1 1 0 102 0V5.44l5.03 4.18a.75.75 0 00.99-1.18l-7.5-6.25z" clipRule="evenodd" />
                                        <path d="M4 14a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM16 14a1 1 0 011 1v1a1 1 0 011-1z" />
                                    </svg>
                                </button>
                                {msg.role === 'model' && (
                                    <button onClick={() => handleCopy(msg.content, msg.id)} className="p-1.5 bg-black/20 rounded-full text-gray-300 hover:bg-black/40 transition-colors" aria-label="نسخ">
                                        {copiedMessageId === msg.id ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        )}
                                    </button>
                                )}
                            </div>
                            {msg.images && msg.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {msg.images.map((image, index) => (
                                        <img key={index} src={image.dataUrl} alt={`محتوى مرفق ${index + 1}`} className="rounded-lg max-w-xs max-h-64 object-contain bg-black/50 border border-white/10" />
                                    ))}
                                </div>
                            )}

                            {/* Use the extracted component */}
                            <ChatMessageItem content={msg.content || '...'} isModel={msg.role === 'model'} />

                            {/* Render Grounding Sources if available */}
                            {msg.groundingMetadata?.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-white/10">
                                    <p className="text-[10px] uppercase tracking-wider text-blue-300/80 mb-2 font-bold flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 me-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                                        المصادر والمراجع
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.groundingMetadata.groundingChunks.map((chunk, idx) => (
                                            chunk.web && (
                                                <a
                                                    key={idx}
                                                    href={chunk.web.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-black/20 hover:bg-blue-600/20 text-blue-200 px-2 py-1 rounded border border-white/10 transition-colors flex items-center max-w-[200px] hover:border-blue-400/30"
                                                    title={chunk.web.title}
                                                >
                                                    <span className="truncate">{chunk.web.title || chunk.web.uri}</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ms-1 flex-shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                </a>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {msg.role === 'model' && msg.model && !msg.isError && msg.content && (
                            <div className="px-3 pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{getModelDisplayName(msg.model)}</span>
                            </div>
                        )}
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


import React, { useMemo, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

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

interface ChatMessageItemProps {
    content: string;
    isModel: boolean;
    messageId?: string;
    onEdit?: (id: string, newContent: string) => void;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ content, isModel, messageId, onEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(content);

    const handleSaveEdit = () => {
        if (onEdit && messageId) {
            onEdit(messageId, editText);
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setEditText(content);
        setIsEditing(false);
    };

    // User messages are rendered simply
    if (!isModel) {
        if (isEditing) {
            return (
                <div className="flex flex-col gap-2 w-full">
                    <textarea 
                        value={editText} 
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-sm min-h-[100px]"
                    />
                    <div className="flex gap-2 justify-end">
                        <button onClick={handleCancelEdit} className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-white transition-colors">إلغاء</button>
                        <button onClick={handleSaveEdit} className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 rounded text-white transition-colors">حفظ</button>
                    </div>
                </div>
            );
        }
        return (
            <div className="relative group/edit">
                <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(content, { breaks: true }) as string) }}></div>
                {onEdit && (
                    <button 
                        onClick={() => { setEditText(content); setIsEditing(true); }}
                        className="absolute -top-3 -right-3 p-1 bg-white/20 hover:bg-white/30 rounded-full opacity-0 group-hover/edit:opacity-100 transition-opacity"
                        title="تعديل الرسالة"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                )}
            </div>
        );
    }

    // Model messages need complex parsing for thought blocks and tool codes
    const { toolCode, thought, finalContent } = useMemo(() => {
        let c = content || '';
        let tc: string | null = null;
        let th: string | null = null;

        // 1. Extract tool_code if present at the start
        const toolCodeRegex = /^tool_code\s*\n([\s\S]*?)(?=\n(thought|[\u0600-\u06FF]|$))/;
        const tcMatch = c.match(toolCodeRegex);
        if (tcMatch) {
             tc = tcMatch[1].trim();
             c = c.replace(tcMatch[0], '').trim();
        }

        // 2. Extract thought if present (after tool_code removal)
        const thoughtRegex = /^thought\s*\n([\s\S]*?)(?=\n[\u0600-\u06FF]|$)/;
        const thMatch = c.match(thoughtRegex);
        if (thMatch) {
            th = thMatch[1].trim();
            c = c.replace(thMatch[0], '').trim();
        } else if (c.startsWith('thought')) {
             th = c.replace(/^thought\s*\n/, '').trim();
             c = ''; // Hide content until real answer appears or stream finishes
        }
        
        return { toolCode: tc, thought: th, finalContent: c };
    }, [content]);

    if (isEditing) {
        return (
            <div className="flex flex-col gap-2 w-full">
                <textarea 
                    value={editText} 
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[150px]"
                />
                <div className="flex gap-2 justify-end">
                    <button onClick={handleCancelEdit} className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-800 transition-colors">إلغاء</button>
                    <button onClick={handleSaveEdit} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors">حفظ التعديلات</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-y-2 w-full relative group/edit">
            {onEdit && (
                <button 
                    onClick={() => { setEditText(content); setIsEditing(true); }}
                    className="absolute -top-3 -right-3 p-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full opacity-0 group-hover/edit:opacity-100 transition-opacity z-10 shadow-sm"
                    title="تعديل الرد"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-600" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                </button>
            )}

            {/* Hidden Debug Info - Tool Code */}
            {toolCode && (
                <details className="group bg-black/40 rounded-md border border-gray-800 overflow-hidden">
                    <summary className="px-3 py-1.5 text-xs font-mono text-gray-600 cursor-pointer hover:bg-gray-900/50 hover:text-gray-400 transition-colors flex items-center select-none">
                        <svg className="w-3 h-3 me-2 transition-transform group-open:rotate-90" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
                        <svg className="w-4 h-4 me-2 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        <span className="flex-grow tracking-wide">عملية التفكير والتحليل القانوني (أنقر للعرض)</span>
                        <svg className="w-3 h-3 transition-transform group-open:rotate-90 text-indigo-400/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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

export default ChatMessageItem;

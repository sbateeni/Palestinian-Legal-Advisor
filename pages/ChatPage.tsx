
import React, { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useChatLogic } from '../hooks/useChatLogic';
import ChatHeader from '../components/chat/ChatHeader';
import PinnedPanel from '../components/chat/PinnedPanel';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import TimelineView from '../components/chat/TimelineView';
import { generateTimelineFromChat } from '../pages/geminiService';
import { TimelineEvent } from '../types';

const { Link, useNavigate, useSearchParams } = ReactRouterDOM;

interface ChatPageProps {
    caseId?: string;
}

const ChatPage: React.FC<ChatPageProps> = ({ caseId }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // Timeline State
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);

    const {
        caseData,
        chatHistory,
        userInput,
        setUserInput,
        isLoading,
        isNotFound, 
        isApiKeyReady,
        apiSource,
        thinkingMode,
        setThinkingMode,
        uploadedImages,
        setUploadedImages,
        isProcessingFile,
        processingMessage,
        tokenCount,
        authError,
        actionMode,
        setActionMode,
        pinnedMessages,
        isSummaryLoading,
        isPinnedPanelOpen,
        setIsPinnedPanelOpen,
        chatContainerRef,
        fileInputRef,
        textareaRef,
        handleSendMessage,
        handleStopGenerating,
        handleSummarize,
        handleSelectApiKey,
        handleFileChange,
        handlePinMessage,
        handleUnpinMessage,
        handleConvertCaseType,
        handleFollowUpAction
    } = useChatLogic(caseId, 'chat');

    // Handle Voice Draft Auto-Population
    useEffect(() => {
        const draft = localStorage.getItem('voice_draft_content');
        const mode = searchParams.get('mode');
        const autoSend = searchParams.get('autoSend');

        if (draft) {
            setUserInput(draft);
            localStorage.removeItem('voice_draft_content'); // Clear it
            
            if (mode === 'drafting') {
                setActionMode('drafting');
                // Optional: Auto-send instruction prompt for drafting
                if (autoSend) {
                    setTimeout(() => {
                       handleSendMessage(`قم بصياغة لائحة دعوى قانونية بناءً على الوقائع التالية:\n${draft}`, 'drafting');
                    }, 500);
                }
            }
        }
    }, [searchParams, setUserInput, setActionMode, handleSendMessage]);

    const handleGenerateTimeline = async () => {
        setIsTimelineOpen(true);
        if (timelineEvents.length > 0) return; // Use cached if available
        
        setIsTimelineLoading(true);
        try {
            const events = await generateTimelineFromChat(chatHistory);
            setTimelineEvents(events);
        } catch (error) {
            console.error(error);
        } finally {
            setIsTimelineLoading(false);
        }
    };

    // 1. Loading State
    if (isLoading && !caseData && caseId) {
        return (
            <div className="w-full flex-grow flex items-center justify-center p-8 text-lg">
                <svg className="animate-spin h-6 w-6 text-white me-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>جاري استرجاع بيانات القضية...</span>
            </div>
        );
    }

    // 2. Not Found State
    if (isNotFound) {
        return (
            <div className="w-full flex-grow flex flex-col items-center justify-center text-center p-4">
                <h2 className="text-2xl font-bold mb-4 text-red-400">عذراً، لم يتم العثور على القضية</h2>
                <p className="text-gray-400 mb-6">ربما تم حذفها أو أن الرابط غير صحيح.</p>
                <button onClick={() => navigate('/cases')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    العودة للقضايا
                </button>
            </div>
        );
    }

    // 3. New Case / API Key Check
    const isNewCaseWithoutKey = isApiKeyReady === false && chatHistory.length === 0;

    if (isNewCaseWithoutKey) {
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
        <div className="w-full flex flex-col flex-grow bg-gray-800 overflow-hidden relative">
            <ChatHeader
                caseData={caseData}
                apiSource={apiSource}
                tokenCount={tokenCount}
                isLoading={isLoading}
                isSummaryLoading={isSummaryLoading}
                chatHistoryLength={chatHistory.length}
                thinkingMode={thinkingMode}
                setThinkingMode={setThinkingMode}
                onSummarize={handleSummarize}
            />
            
            {/* Timeline Trigger Button (Floating or Header? Let's put it on top right overlay if history exists) */}
            {chatHistory.length > 2 && (
                <button 
                    onClick={handleGenerateTimeline}
                    className="absolute top-[70px] left-4 z-20 p-2 bg-gray-700/80 hover:bg-blue-600/90 text-white rounded-full shadow-lg border border-gray-600 transition-all group"
                    title="عرض المخطط الزمني للقضية"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 bg-black text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">المخطط الزمني</span>
                </button>
            )}

            {isTimelineOpen && (
                <TimelineView 
                    events={timelineEvents} 
                    isLoading={isTimelineLoading} 
                    onClose={() => setIsTimelineOpen(false)} 
                />
            )}

            <PinnedPanel
                messages={pinnedMessages}
                isOpen={isPinnedPanelOpen}
                setIsOpen={setIsPinnedPanelOpen}
                onUnpin={handleUnpinMessage}
            />

            <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <MessageList
                    messages={chatHistory}
                    isLoading={isLoading}
                    pinnedMessages={pinnedMessages}
                    onPinMessage={handlePinMessage}
                    onConvertCaseType={handleConvertCaseType}
                    onFollowUpAction={handleFollowUpAction}
                />
            </div>

            <ChatInput
                userInput={userInput}
                setUserInput={setUserInput}
                handleSendMessage={handleSendMessage}
                handleStopGenerating={handleStopGenerating}
                handleFileChange={handleFileChange}
                fileInputRef={fileInputRef}
                textareaRef={textareaRef}
                isLoading={isLoading}
                isProcessingFile={isProcessingFile}
                uploadedImages={uploadedImages}
                setUploadedImages={setUploadedImages}
                processingMessage={processingMessage}
                authError={authError}
                actionMode={actionMode}
                setActionMode={setActionMode}
                chatHistoryLength={chatHistory.length}
                isApiKeyReady={isApiKeyReady}
            />
        </div>
    );
};

export default ChatPage;

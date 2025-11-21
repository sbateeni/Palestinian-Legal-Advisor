
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useChatLogic } from '../hooks/useChatLogic';
import ChatHeader from '../components/chat/ChatHeader';
import PinnedPanel from '../components/chat/PinnedPanel';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';

interface ChatPageProps {
    caseId?: string;
}

const ChatPage: React.FC<ChatPageProps> = ({ caseId }) => {
    const navigate = useNavigate();
    const {
        caseData,
        chatHistory,
        userInput,
        setUserInput,
        isLoading,
        isApiKeyReady,
        apiSource,
        thinkingMode,
        setThinkingMode,
        uploadedImage,
        setUploadedImage,
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
        handleUnpinMessage
    } = useChatLogic(caseId);

    // Determine if we are in a "loading" state where we shouldn't show errors yet
    // If it's an existing case (caseId exists) but we haven't loaded data yet, show spinner
    const isCaseLoading = !!caseId && !caseData;

    if (isCaseLoading) {
        return (
            <div className="w-full flex-grow flex items-center justify-center p-8 text-lg">
                <svg className="animate-spin h-6 w-6 text-white me-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>جاري تحميل القضية...</span>
            </div>
        );
    }

    // Only block access if:
    // 1. API Key check has finished (isApiKeyReady is not null)
    // 2. API Key is NOT ready
    // 3. It is a NEW case (no history to show)
    // This allows viewing existing cases even without a key
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
        <div className="w-full flex flex-col flex-grow bg-gray-800 overflow-hidden">
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
                uploadedImage={uploadedImage}
                setUploadedImage={setUploadedImage}
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

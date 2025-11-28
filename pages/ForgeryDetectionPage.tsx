
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForgeryLogic } from '../hooks/useForgeryLogic';
import ChatHeader from '../components/chat/ChatHeader';
import PinnedPanel from '../components/chat/PinnedPanel';
import MessageList from '../components/chat/MessageList';
import ForgeryToolbar from '../components/ForgeryToolbar';

interface ForgeryDetectionPageProps {
    caseId?: string;
}

const ForgeryDetectionPage: React.FC<ForgeryDetectionPageProps> = ({ caseId }) => {
    const navigate = useNavigate();
    const logic = useForgeryLogic(caseId);

    // 1. Loading State
    if (logic.isLoading && !logic.caseData && caseId) {
        return (
            <div className="w-full flex-grow flex items-center justify-center p-8 text-lg">
                <svg className="animate-spin h-6 w-6 text-red-500 me-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>جاري تحميل المختبر الجنائي...</span>
            </div>
        );
    }

    // 2. API Key Check
    const isNewCaseWithoutKey = logic.isApiKeyReady === false && logic.chatHistory.length === 0;

    if (isNewCaseWithoutKey) {
        const isGemini = logic.apiSource === 'gemini';
        return (
            <div className="w-full flex-grow flex flex-col items-center justify-center text-center p-4">
                <h2 className="text-2xl font-bold mb-4 text-red-500">مطلوب تصريح أمني (API Key)</h2>
                <p className="text-gray-400 mb-6 max-w-2xl">للدخول إلى مختبر التحليل الجنائي الرقمي، يرجى تفعيل مفتاح API.</p>
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    {isGemini && window.aistudio && (
                        <button onClick={logic.handleSelectApiKey} className="px-8 py-3 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-800">
                            تحديد مفتاح عبر Google AI
                        </button>
                    )}
                    <button onClick={() => navigate('/settings')} className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">
                        الإعدادات
                    </button>
                </div>
            </div>
        );
    }

    const ForgeryInput = () => (
        <div className="p-4 border-t border-gray-700 bg-gray-900 border-t-4 border-red-900/50">
             {!logic.isApiKeyReady && (
                <div className="mb-3 p-3 bg-yellow-600/20 border border-yellow-500/50 text-yellow-200 rounded-lg text-sm flex items-center justify-between">
                    <span>وضع القراءة فقط: يجب إدخال مفتاح API لمتابعة التحليل.</span>
                    <Link to="/settings" className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors text-xs font-bold">الإعدادات</Link>
                </div>
            )}

            <ForgeryToolbar 
                currentMode={logic.actionMode}
                onModeChange={logic.setActionMode}
                disabled={logic.isLoading || logic.isProcessingFile || !logic.isApiKeyReady}
            />

            {/* Images Preview in Forgery Page */}
            {logic.uploadedImages.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-red-900">
                    {logic.uploadedImages.map((img, i) => (
                        <div key={i} className="relative group">
                            <img src={img.dataUrl} className="h-16 w-16 object-cover rounded border border-red-800 bg-black" alt="Preview" />
                            <button onClick={() => logic.setUploadedImages(logic.uploadedImages.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center space-x-reverse space-x-2">
                <input type="file" ref={logic.fileInputRef} onChange={logic.handleFileChange} accept="image/*,application/pdf" className="hidden" multiple />
                <button 
                    onClick={() => logic.fileInputRef.current?.click()} 
                    disabled={logic.isLoading || !logic.isApiKeyReady} 
                    className="p-3 bg-red-900/30 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-900/50 disabled:opacity-50 transition-colors relative group"
                    title="رفع صور (يدعم التحديد المتعدد للمقارنة)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" /></svg>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                </button>
                <textarea
                    ref={logic.textareaRef}
                    value={logic.userInput}
                    onChange={(e) => { logic.setUserInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); logic.handleSendMessage(); } }}
                    className="flex-grow p-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none disabled:opacity-50 placeholder-gray-500 font-mono text-sm"
                    placeholder={!logic.isApiKeyReady ? "أدخل المفتاح..." : "ارفع الصور للمطابقة، أو صف المستند المشبوه..."}
                    rows={1}
                    style={{ maxHeight: '10rem' }}
                    disabled={logic.isLoading || !logic.isApiKeyReady}
                />
                <button onClick={() => logic.handleSendMessage()} disabled={logic.isLoading || (!logic.userInput.trim() && logic.uploadedImages.length === 0) || !logic.isApiKeyReady} className="p-3 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-800 disabled:bg-gray-600 transition-colors shadow-lg shadow-red-900/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
            </div>
        </div>
    );

    return (
        <div className="w-full flex flex-col flex-grow bg-gray-900 overflow-hidden">
            {/* Custom Header for Forgery Lab */}
            <div className="p-3 border-b border-red-900/50 bg-gray-900/80 flex justify-between items-center flex-wrap gap-2 sticky top-0 z-10 backdrop-blur-md shadow-red-900/10 shadow-lg">
                <div className="flex items-center text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 me-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    <h2 className="text-lg font-bold text-gray-200 truncate tracking-wider">المختبر الجنائي الرقمي: {logic.caseData?.title || 'فحص جديد'}</h2>
                </div>
                <div className="flex items-center gap-x-3">
                     {logic.apiSource === 'gemini' && (
                        <div className="flex items-center space-x-2 space-x-reverse bg-black/40 p-1 rounded-full border border-red-900/30">
                            <label className="text-xs font-medium text-red-400 px-2">تحليل عميق</label>
                            <button onClick={() => logic.setThinkingMode(!logic.thinkingMode)} className={`${logic.thinkingMode ? 'bg-red-600' : 'bg-gray-700'} relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}>
                                <span className={`${logic.thinkingMode ? 'translate-x-4' : 'translate-x-1'} inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform`} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <PinnedPanel
                messages={logic.pinnedMessages}
                isOpen={logic.isPinnedPanelOpen}
                setIsOpen={logic.setIsPinnedPanelOpen}
                onUnpin={logic.handleUnpinMessage}
            />

            <div ref={logic.chatContainerRef} className="flex-grow p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                <MessageList
                    messages={logic.chatHistory}
                    isLoading={logic.isLoading}
                    pinnedMessages={logic.pinnedMessages}
                    onPinMessage={logic.handlePinMessage}
                    onFollowUpAction={logic.handleFollowUpAction}
                />
            </div>

            <ForgeryInput />
        </div>
    );
};

export default ForgeryDetectionPage;

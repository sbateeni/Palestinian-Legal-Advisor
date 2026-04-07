'use client';

import React from 'react';
import Link from 'next/link';
import { useOcrLogic } from '../hooks/useOcrLogic';
import { AnalysisResult } from '../types';
import FileUploadArea from '../components/ocr/FileUploadArea';
import AnalysisConfig from '../components/ocr/AnalysisConfig';
import ControlActions from '../components/ocr/ControlActions';
import CaseSelector from '../components/ocr/CaseSelector';
import ResultsGallery from '../components/ocr/ResultsGallery';

// Add AIStudio interface for Gemini API key handling (Global declaration)
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const OcrPage: React.FC = () => {
    const {
        selectedImages,
        analysisResults,
        analysisProvider,
        setAnalysisProvider,
        openRouterModels,
        openRouterModelForOcr,
        setOpenRouterModelForOcr,
        isGeminiApiKeyReady,
        isOpenRouterApiKeyReady,
        prompt,
        setPrompt,
        analysisType,
        setAnalysisType,
        cases,
        selectedCaseId,
        setSelectedCaseId,
        isSending,
        loadingFiles,
        isProcessingPdf,
        pdfProcessingMessage,
        tagInputs,
        analysisState,
        imagesToAnalyzeQueue,
        currentAnalysisIndex,
        totalToAnalyze,
        fileInputRef,
        handleFileChange,
        removeImage,
        handleStartAnalysis,
        handlePauseAnalysis,
        handleResumeAnalysis,
        handleCancelAnalysis,
        handleTagInputChange,
        handleAddTag,
        handleRemoveTag,
        handleSendToCase,
        handleSelectApiKey
    } = useOcrLogic();
    
    const isUploading = Object.keys(loadingFiles).length > 0 || isProcessingPdf;
    const isAnalyzing = analysisState === 'running' || analysisState === 'paused';
    const hasFilesToAnalyze = selectedImages.length > 0 && selectedImages.some(img => !analysisResults[img.id]?.result && !analysisResults[img.id]?.isLoading);
    const isCurrentProviderApiKeyReady = analysisProvider === 'gemini' ? isGeminiApiKeyReady : isOpenRouterApiKeyReady;

    // Derived state for canSend (needs access to types, so cast might be needed if logic was raw, but here it's typed via hook return mostly)
    const canSend = (Object.values(analysisResults) as AnalysisResult[]).some(r => r.result) && selectedCaseId;
    const imagesToDoCount = selectedImages.filter(img => !analysisResults[img.id]?.result).length;

    if (isCurrentProviderApiKeyReady === null) {
        return <div className="text-center p-8">جاري التحقق من الإعدادات...</div>;
    }
    
    if (!isCurrentProviderApiKeyReady) {
        const isGemini = analysisProvider === 'gemini';
        return (
          <div className="w-full flex-grow flex flex-col items-center justify-center text-center p-4">
              <h2 className="text-2xl font-bold mb-4 text-gray-200">
                {isGemini ? 'مطلوب مفتاح Google AI API' : 'مطلوب مفتاح OpenRouter API'}
              </h2>
               {isGemini ? (
                <p className="text-gray-400 mb-6 max-w-2xl">
                    لاستخدام ميزة تحليل الصور، يرجى تحديد مفتاح Google AI API الخاص بك عبر النافذة المنبثقة، أو إدخاله يدويًا في <Link href="/settings" className="text-blue-400 hover:underline">صفحة الإعدادات</Link>.
                </p>
               ) : (
                <p className="text-gray-400 mb-6 max-w-2xl">
                    لاستخدام OpenRouter، يرجى إدخال مفتاح API الخاص بك في <Link href="/settings" className="text-blue-400 hover:underline">صفحة الإعدادات</Link>.
                </p>
               )}
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                {isGemini && window.aistudio && (
                    <button onClick={handleSelectApiKey} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">تحديد مفتاح عبر Google AI</button>
                )}
                 <Link href="/settings" className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">الانتقال إلى الإعدادات</Link>
              </div>
          </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-3">🖼️ تحليل المستندات والصور</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Input & Controls */}
                <div className="space-y-6">
                    <FileUploadArea 
                        fileInputRef={fileInputRef}
                        handleFileChange={handleFileChange}
                        isUploading={isUploading}
                        isAnalyzing={isAnalyzing}
                        loadingFiles={loadingFiles}
                        isProcessingPdf={isProcessingPdf}
                        pdfProcessingMessage={pdfProcessingMessage}
                    />
                    
                    <AnalysisConfig 
                        analysisProvider={analysisProvider}
                        setAnalysisProvider={setAnalysisProvider}
                        openRouterModels={openRouterModels}
                        openRouterModelForOcr={openRouterModelForOcr}
                        setOpenRouterModelForOcr={setOpenRouterModelForOcr}
                        analysisType={analysisType}
                        setAnalysisType={setAnalysisType}
                        prompt={prompt}
                        setPrompt={setPrompt}
                        isLocked={isUploading || isAnalyzing}
                    />

                    <ControlActions 
                        analysisState={analysisState}
                        hasFilesToAnalyze={hasFilesToAnalyze}
                        selectedImagesCount={selectedImages.length}
                        imagesToDoCount={imagesToDoCount}
                        handleStart={handleStartAnalysis}
                        handlePause={handlePauseAnalysis}
                        handleResume={handleResumeAnalysis}
                        handleCancel={handleCancelAnalysis}
                        isLocked={isUploading}
                        currentProgress={currentAnalysisIndex}
                        totalProgress={totalToAnalyze}
                    />

                    <CaseSelector 
                        cases={cases}
                        selectedCaseId={selectedCaseId}
                        setSelectedCaseId={setSelectedCaseId}
                        handleSendToCase={handleSendToCase}
                        canSend={!!canSend}
                        isSending={isSending}
                        disabled={isUploading || isAnalyzing}
                    />
                </div>

                {/* Right Column: Output */}
                <ResultsGallery 
                    selectedImages={selectedImages}
                    analysisResults={analysisResults}
                    removeImage={removeImage}
                    analysisType={analysisType}
                    tagInputs={tagInputs}
                    handleTagInputChange={handleTagInputChange}
                    handleAddTag={handleAddTag}
                    handleRemoveTag={handleRemoveTag}
                />
            </div>
        </div>
    );
};

export default OcrPage;

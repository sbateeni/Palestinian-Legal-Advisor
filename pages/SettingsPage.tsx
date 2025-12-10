
import React from 'react';
import { useSettingsLogic } from '../hooks/useSettingsLogic';
import ServiceConfig from '../components/settings/ServiceConfig';
import DataManagement from '../components/settings/DataManagement';
import RegionConfig from '../components/settings/RegionConfig';

const SettingsPage: React.FC = () => {
    const {
        apiSource, handleApiSourceChange,
        region, handleRegionChange,
        geminiInputValue, setGeminiInputValue, handleSaveGeminiKey, geminiSaved,
        openRouterInputValue, setOpenRouterInputValue, handleSaveOpenRouterKey, openRouterSaved,
        openRouterModelId, handleModelChange, openRouterModels,
        newModelId, setNewModelId, newModelSupportsImages, setNewModelSupportsImages, handleAddModel, handleDeleteModel,
        casesCount, handleClearCases, handleExport, handleImportClick, handleFileChange, fileInputRef,
        supabaseStatus // Receive status
    } = useSettingsLogic();

    return (
        <div className="w-full max-w-3xl mx-auto p-4">
            <div className="flex flex-col mb-6 border-b border-gray-700 pb-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-100">الإعدادات</h1>
                    
                    {/* Supabase Connection Indicator */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-300 ${
                        supabaseStatus === 'connected' 
                            ? 'bg-green-900/30 border-green-500/50 text-green-400' 
                            : 'bg-red-900/30 border-red-500/50 text-red-400'
                    }`}>
                        <div className="relative flex h-2.5 w-2.5">
                            {supabaseStatus === 'connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${supabaseStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </div>
                        <span className="text-xs font-bold font-mono">
                            {supabaseStatus === 'connected' ? 'Database: ONLINE' : 'Database: OFFLINE'}
                        </span>
                    </div>
                </div>

                {/* Troubleshooting Hint for Offline Status */}
                {supabaseStatus === 'disconnected' && (
                    <div className="mt-4 p-4 bg-gray-800/80 border-s-4 border-red-500 rounded-e-lg text-sm shadow-inner">
                        <h3 className="font-bold text-red-300 flex items-center gap-2 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            إعدادات الاتصال ناقصة
                        </h3>
                        <p className="text-gray-300 mb-2">لكي يتصل الموقع بقاعدة البيانات، يجب إضافة المتغيرات التالية في إعدادات <strong>Vercel</strong> (مع البادئة <code>VITE_</code> حصراً):</p>
                        <div className="bg-black/30 p-2 rounded border border-gray-700 font-mono text-xs text-blue-300 dir-ltr text-left space-y-1">
                            <div>VITE_SUPABASE_URL = https://your-project.supabase.co</div>
                            <div>VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</div>
                        </div>
                        <p className="text-gray-500 text-xs mt-2">ملاحظة: المتغيرات بدون بادئة VITE_ يتم حجبها عن المتصفح لأسباب أمنية.</p>
                    </div>
                )}
            </div>
            
            <RegionConfig 
                region={region}
                handleRegionChange={handleRegionChange}
            />

            <ServiceConfig 
                apiSource={apiSource} handleApiSourceChange={handleApiSourceChange}
                geminiInputValue={geminiInputValue} setGeminiInputValue={setGeminiInputValue} handleSaveGeminiKey={handleSaveGeminiKey} geminiSaved={geminiSaved}
                openRouterInputValue={openRouterInputValue} setOpenRouterInputValue={setOpenRouterInputValue} handleSaveOpenRouterKey={handleSaveOpenRouterKey} openRouterSaved={openRouterSaved}
                openRouterModelId={openRouterModelId} handleModelChange={handleModelChange} openRouterModels={openRouterModels}
                newModelId={newModelId} setNewModelId={setNewModelId} newModelSupportsImages={newModelSupportsImages} setNewModelSupportsImages={setNewModelSupportsImages} handleAddModel={handleAddModel} handleDeleteModel={handleDeleteModel}
            />
            
            <DataManagement 
                casesCount={casesCount}
                handleExport={handleExport}
                handleImportClick={handleImportClick}
                handleClearCases={handleClearCases}
                fileInputRef={fileInputRef}
                handleFileChange={handleFileChange}
            />
        </div>
    );
};

export default SettingsPage;

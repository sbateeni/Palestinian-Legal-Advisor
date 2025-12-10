
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
            <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-3">
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

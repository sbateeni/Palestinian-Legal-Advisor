
import React from 'react';
import { HashRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import Header from './components/Header';
import ChatPage from './pages/ChatPage';
import CasesListPage from './pages/CasesListPage';
import SettingsPage from './pages/SettingsPage';
import OcrPage from './pages/OcrPage';
import ToolsPage from './pages/ToolsPage';
import InheritancePage from './pages/InheritancePage'; // Import
import ShariaPage from './pages/ShariaPage'; // Import

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="h-full flex flex-col bg-gray-900 text-gray-100">
        <Header />
        <main className="flex-grow container mx-auto flex flex-col overflow-y-auto">
          <Routes>
            <Route path="/" element={<ChatPage key="new-case" />} />
            <Route path="/sharia" element={<ShariaPage key="new-sharia" />} />
            {/* New Route for existing Sharia cases */}
            <Route path="/sharia/:caseId" element={<ShariaPageWrapper />} />
            
            <Route path="/case" element={<Navigate to="/" replace />} />
            <Route path="/case/:caseId" element={<ChatPageWrapper />} />
            <Route path="/cases" element={<CasesListPage />} />
            <Route path="/ocr" element={<OcrPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/inheritance" element={<InheritancePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

// Wrapper to pass caseId as a key for Civil Cases
const ChatPageWrapper: React.FC = () => {
    const { caseId } = useParams<{ caseId: string }>();
    return <ChatPage key={caseId} caseId={caseId} />;
};

// Wrapper to pass caseId as a key for Sharia Cases
const ShariaPageWrapper: React.FC = () => {
    const { caseId } = useParams<{ caseId: string }>();
    return <ShariaPage key={caseId} caseId={caseId} />;
};


export default App;

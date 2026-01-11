import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import CasesListPage from './pages/CasesListPage';
import SettingsPage from './pages/SettingsPage';
import OcrPage from './pages/OcrPage';
import ToolsPage from './pages/ToolsPage';
import InheritancePage from './pages/InheritancePage';
import ShariaPage from './pages/ShariaPage';
import CaseTypesPage from './pages/CaseTypesPage';
import ForgeryDetectionPage from './pages/ForgeryDetectionPage';
import ResearchPage from './pages/ResearchPage';

// Wrappers for dynamic routes to handle useParams cleanly
const ChatPageWrapper: React.FC = () => {
    const { caseId } = useParams();
    return <ChatPage key={caseId} caseId={caseId} />;
};

const ShariaPageWrapper: React.FC = () => {
    const { caseId } = useParams();
    return <ShariaPage key={caseId} caseId={caseId} />;
};

const ForgeryPageWrapper: React.FC = () => {
    const { caseId } = useParams();
    return <ForgeryDetectionPage key={caseId} caseId={caseId} />;
};

const App: React.FC = () => {
  // Initial theme setup
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <HashRouter>
      <div className="h-full flex flex-col bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-300">
        <Header />
        <main className="flex-grow container mx-auto flex flex-col overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/types" element={<CaseTypesPage />} />
            <Route path="/civil" element={<ChatPage key="new-case" />} />
            <Route path="/sharia" element={<ShariaPage key="new-sharia" />} />
            <Route path="/sharia/:caseId" element={<ShariaPageWrapper />} />
            <Route path="/forgery" element={<ForgeryDetectionPage key="new-forgery" />} />
            <Route path="/forgery/:caseId" element={<ForgeryPageWrapper />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/case" element={<Navigate to="/civil" replace />} />
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

export default App;
import React from 'react';
import { HashRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import Header from './components/Header';
import ChatPage from './pages/ChatPage';
import CasesListPage from './pages/CasesListPage';
import SettingsPage from './pages/SettingsPage';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="h-full flex flex-col bg-gray-900 text-gray-100">
        <Header />
        <main className="flex-grow container mx-auto flex flex-col overflow-y-auto">
          <Routes>
            <Route path="/" element={<ChatPage key="new-case" />} />
            <Route path="/case" element={<Navigate to="/" replace />} />
            <Route path="/case/:caseId" element={<ChatPageWrapper />} />
            <Route path="/cases" element={<CasesListPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

// Wrapper to pass caseId as a key, forcing re-mount when navigating between cases
const ChatPageWrapper: React.FC = () => {
    const { caseId } = useParams<{ caseId: string }>();
    return <ChatPage key={caseId} caseId={caseId} />;
};


export default App;
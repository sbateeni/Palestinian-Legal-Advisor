'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import ChatPage from '@/views/ChatPage';
import ClientPageFallback from '@/components/ClientPageFallback';

function ChatByCaseId() {
    const params = useParams();
    const caseId = params.caseId as string;
    return <ChatPage key={caseId} caseId={caseId} />;
}

export default function Page() {
    return (
        <Suspense fallback={<ClientPageFallback />}>
            <ChatByCaseId />
        </Suspense>
    );
}

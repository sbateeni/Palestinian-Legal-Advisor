'use client';

import { Suspense } from 'react';
import ChatPage from '@/views/ChatPage';
import ClientPageFallback from '@/components/ClientPageFallback';

export default function Page() {
    return (
        <Suspense fallback={<ClientPageFallback />}>
            <ChatPage key="new-case" />
        </Suspense>
    );
}

'use client';

import { Suspense } from 'react';
import InheritancePage from '@/views/InheritancePage';
import ClientPageFallback from '@/components/ClientPageFallback';

export default function Page() {
    return (
        <Suspense fallback={<ClientPageFallback />}>
            <InheritancePage />
        </Suspense>
    );
}

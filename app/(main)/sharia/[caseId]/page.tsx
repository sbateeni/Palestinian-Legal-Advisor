'use client';

import { useParams } from 'next/navigation';
import ShariaPage from '@/views/ShariaPage';

export default function Page() {
    const params = useParams();
    const caseId = params.caseId as string;
    return <ShariaPage key={caseId} caseId={caseId} />;
}

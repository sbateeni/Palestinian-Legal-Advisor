'use client';

import { useParams } from 'next/navigation';
import ForgeryDetectionPage from '@/views/ForgeryDetectionPage';

export default function Page() {
    const params = useParams();
    const caseId = params.caseId as string;
    return <ForgeryDetectionPage key={caseId} caseId={caseId} />;
}

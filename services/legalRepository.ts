
import { LegalRegion, LegalArticle } from '../types';

// This service is deprecated/disabled as per user request.
// Returning empty results to satisfy interface.

export async function getLegalContext(query: string, region: LegalRegion): Promise<string> {
    return "";
}

export async function harvestLegalKnowledge(fullResponse: string, region: LegalRegion) {
    // No-op
    return;
}

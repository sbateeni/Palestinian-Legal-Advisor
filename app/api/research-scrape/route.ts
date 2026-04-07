import { NextRequest, NextResponse } from 'next/server';
import { scrapeOfficialResearchPage } from '@/server/researchPageScrape';

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as Record<string, unknown>;
        const url = String(body.url ?? '').trim();
        const out = await scrapeOfficialResearchPage(url);
        return NextResponse.json(out);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}

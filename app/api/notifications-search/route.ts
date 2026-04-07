import { NextRequest, NextResponse } from 'next/server';
import { searchNotifications } from '@/server/courtsNotificationsScraper';

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
        const query = String(body.query ?? body.q ?? '');
        const page = Math.max(1, parseInt(String(body.page ?? '1'), 10) || 1);
        const sessionCookie =
            body.sessionCookie != null && body.sessionCookie !== ''
                ? String(body.sessionCookie)
                : null;

        const out = await searchNotifications({ query, page, sessionCookie });
        return NextResponse.json(out);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}

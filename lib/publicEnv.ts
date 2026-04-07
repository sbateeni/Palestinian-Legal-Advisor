/**
 * مفاتيح Gemini المعرّضة للمتصفح (فقط بادئة NEXT_PUBLIC_ في Next.js).
 * للتوافق مع Vercel: عيّن NEXT_PUBLIC_GEMINI_API_KEY في لوحة التحكم.
 */
export function readClientGeminiKeyFromEnv(): string {
    if (typeof process === 'undefined' || !process.env) return '';
    const k =
        process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        process.env.NEXT_PUBLIC_API_KEY ||
        '';
    return String(k).trim();
}

export function hasClientGeminiKeyFromEnv(): boolean {
    const envKey = readClientGeminiKeyFromEnv();
    return (
        !!envKey &&
        envKey !== 'undefined' &&
        envKey !== 'MISSING_KEY_PLACEHOLDER' &&
        envKey !== 'null'
    );
}

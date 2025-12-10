
import { createClient } from '@supabase/supabase-js';

// Declare globals for TS (these are replaced by Vite at build time)
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_KEY__: string;

// Helper to safely get env vars without crashing
const getSafeEnv = () => {
    let url = '';
    let key = '';

    // 1. Try accessing the global constants safely using typeof
    // If Vite replaced them, typeof will be 'string'. If not, it will be 'undefined'.
    // Direct access like `const x = __SUPABASE_URL__` throws ReferenceError if not replaced.
    try {
        if (typeof __SUPABASE_URL__ !== 'undefined') {
            url = __SUPABASE_URL__;
        }
        if (typeof __SUPABASE_KEY__ !== 'undefined') {
            key = __SUPABASE_KEY__;
        }
    } catch (e) {
        // Ignore reference errors
    }

    // 2. Fallback to import.meta.env if available (and safe)
    if (!url || !key) {
        try {
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env) {
                // @ts-ignore
                url = url || import.meta.env.VITE_SUPABASE_URL;
                // @ts-ignore
                key = key || import.meta.env.VITE_SUPABASE_ANON_KEY;
            }
        } catch (e) {}
    }

    return { url, key };
};

const { url: supabaseUrl, key: supabaseAnonKey } = getSafeEnv();

export const getSupabase = () => {
    // Only connect if the variables are successfully defined and valid
    if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
        return createClient(supabaseUrl, supabaseAnonKey);
    }
    
    // If we are missing the URL specifically (common issue), we return null
    // The UI will show the troubleshooting message
    return null;
};

export const checkConnection = async (): Promise<boolean> => {
    const supabase = getSupabase();
    if (!supabase) return false;
    try {
        // Try a lightweight HEAD request to check connectivity
        const { error } = await supabase.from('legal_articles').select('id', { count: 'exact', head: true });
        // Error code PGRST116 means JSON object returned was empty (no rows), which implies connection worked but no data found.
        // Real connection errors usually have no status or 5xx.
        // Even if table doesn't exist (404/42P01), it means we connected to DB.
        return !error || error.code === 'PGRST116' || error.code === '42P01'; 
    } catch (e) {
        return false;
    }
};

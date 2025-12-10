
import { createClient } from '@supabase/supabase-js';

// Access variables injected via vite.config.ts define
// Because of the vite config fix, these will be empty strings if missing, not undefined properties
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const getSupabase = () => {
    // Only connect if the variables are successfully defined and not empty
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

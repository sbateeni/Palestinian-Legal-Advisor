
import { createClient } from '@supabase/supabase-js';

// Get Environment Variables provided by Vercel
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export const getSupabase = () => {
    // Only connect if the environment variables are configured in Vercel
    if (supabaseUrl && supabaseAnonKey) {
        return createClient(supabaseUrl, supabaseAnonKey);
    }
    
    // If no Env Vars are set, we return null. 
    // We do NOT allow users to input their own keys in the UI anymore to keep the DB central.
    return null;
};

export const checkConnection = async (): Promise<boolean> => {
    const supabase = getSupabase();
    if (!supabase) return false;
    try {
        // Try a lightweight HEAD request to check connectivity
        const { error } = await supabase.from('legal_articles').select('id', { count: 'exact', head: true });
        return !error;
    } catch (e) {
        return false;
    }
};

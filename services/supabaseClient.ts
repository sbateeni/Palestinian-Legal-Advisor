
import { createClient } from '@supabase/supabase-js';

// NOTE: These should be in your .env file in a real production environment
// For this demo, we will try to read them from localStorage settings if not in env
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const getSupabase = () => {
    // If env vars are set, use them
    if (supabaseUrl && supabaseAnonKey) {
        return createClient(supabaseUrl, supabaseAnonKey);
    }
    
    // Otherwise, try to fallback to localStorage (user entered in settings) - Logic handled in repository
    const storedUrl = localStorage.getItem('supabaseUrl');
    const storedKey = localStorage.getItem('supabaseKey');
    
    if (storedUrl && storedKey) {
        try {
            const parsedUrl = JSON.parse(storedUrl);
            const parsedKey = JSON.parse(storedKey);
            if (parsedUrl && parsedKey) {
                return createClient(parsedUrl, parsedKey);
            }
        } catch (e) {
            console.error("Error parsing stored Supabase credentials", e);
        }
    }

    return null;
};

export const checkConnection = async (): Promise<boolean> => {
    const supabase = getSupabase();
    if (!supabase) return false;
    try {
        // Try a lightweight HEAD request to check connectivity
        // We query 'legal_articles' since that's our main table.
        const { error } = await supabase.from('legal_articles').select('id', { count: 'exact', head: true });
        
        // If we get a response (even if table is empty), we are connected.
        // If we get a network error or invalid key error, 'error' will be populated in a specific way.
        // For simplicity: No error = Connected.
        return !error;
    } catch (e) {
        return false;
    }
};

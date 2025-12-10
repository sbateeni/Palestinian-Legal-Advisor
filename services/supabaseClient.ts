
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
        return createClient(JSON.parse(storedUrl), JSON.parse(storedKey));
    }

    return null;
};

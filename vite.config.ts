
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Helper to ensure we don't pass undefined to JSON.stringify
  // If a variable is missing, we default to empty string so replacement still happens (avoiding runtime crash)
  const sbUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';

  return {
    plugins: [react()],
    define: {
      // Map Vercel/Next.js style variables to Vite style variables
      // Always stringify a string, never undefined
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(sbKey),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(sbUrl),
    }
  };
});

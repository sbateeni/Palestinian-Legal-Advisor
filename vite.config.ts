
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext'
  },
  define: {
    // Correctly map process.env.API_KEY so it's available in the browser context
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});

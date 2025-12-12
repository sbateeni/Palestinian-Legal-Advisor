
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext'
  },
  define: {
    // Polyfill process.env to prevent crashes in browser if code accesses it directly
    'process.env': {} 
  }
});
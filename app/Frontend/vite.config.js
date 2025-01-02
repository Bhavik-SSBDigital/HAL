import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window', // Polyfill global as window in the browser
  },
  server: {
    port: 3000, // Change this to the desired port number
  },
});

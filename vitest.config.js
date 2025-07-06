/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js', // We'll create this file next
    css: true, // If you have CSS imports in your components
    reporters: ['default', 'html'],
    outputFile: {
      html: './html/index.html' // HTML report output directory
    }
  },
});

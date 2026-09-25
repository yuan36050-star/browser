import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// Relative base so the build works on any GitHub Pages sub-path
// (https://<user>.github.io/<repo>/) and on a custom domain alike.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          markdown: ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex', 'rehype-highlight', 'katex'],
          sdk: ['@anthropic-ai/sdk', '@modelcontextprotocol/sdk/client/index.js'],
        },
      },
    },
  },
  server: { host: true, port: 5173 },
});

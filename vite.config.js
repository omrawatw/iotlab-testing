import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Relative base so the built asset URLs work regardless of subpath depth
  // — GitHub Pages serves project sites from /repo-name/, Cloudflare/Vercel
  // serve from /. This one setting works correctly on both without needing
  // to hardcode a repo name anywhere.
  base: './',
});

import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works on GitHub Pages, itch.io or inside a Capacitor app.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
});

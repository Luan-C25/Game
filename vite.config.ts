import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the same build works from a web host and from the
  // file:// origin a Capacitor Android shell serves it under.
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 4096,
  },
  server: {
    host: true,
    port: 5173,
  },
});

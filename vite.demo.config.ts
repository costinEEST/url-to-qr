import { defineConfig } from 'vite'

/** `npm run dev` — the panel on a plain page, for fast iteration. */
export default defineConfig({
  root: 'demo',
  server: { open: true },
  build: { outDir: '../dist/demo', emptyOutDir: true },
})

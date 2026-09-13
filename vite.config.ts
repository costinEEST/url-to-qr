import { defineConfig } from 'vite'

/**
 * Extension build.
 * Root is the extension folder so `popup.html` is the entry and
 * `public/` (manifest + icons) is copied verbatim into the output.
 */
export default defineConfig({
  root: 'src/extension',
  publicDir: 'public',
  base: './',
  build: {
    outDir: '../../dist/extension',
    emptyOutDir: true,
    target: 'esnext',
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: { popup: 'popup.html' },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
})

/**
 * Builds the bookmarklet.
 *
 *   src/bookmarklet/entry.ts
 *     -> single minified IIFE (uqr inlined, no network at runtime)
 *     -> percent-encoded `javascript:` URL
 *     -> dist/bookmarklet/qrick.js
 *     -> tracked, ready-to-use files in bookmarklet/
 *
 *   node scripts/build-bookmarklet.mjs
 */
import { build } from 'vite'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const outDir = resolve(root, 'dist/bookmarklet')
const releaseDir = resolve(root, 'bookmarklet')

await build({
  configFile: false,
  root,
  logLevel: 'warn',
  build: {
    outDir,
    emptyOutDir: true,
    target: 'esnext',
    minify: true,
    cssMinify: true,
    lib: {
      entry: resolve(root, 'src/bookmarklet/entry.ts'),
      formats: ['iife'],
      // No exports, so the name is only used for the wrapper vite insists on.
      name: 'qrick',
      fileName: () => 'qrick.js',
    },
  },
})

const bundlePath = resolve(outDir, 'qrick.js')
const bundle = readFileSync(bundlePath, 'utf8')
  .replace(/\/\/# sourceMappingURL=.*$/m, '')
  .trim()
  .replace(/;$/, '')

// `void 0` keeps the browser from navigating away if the IIFE ever returns
// something truthy.
const source = `(()=>{${bundle}})();void 0`

/**
 * `encodeURIComponent` would escape most of the bundle and add ~45% to its
 * size. Only four classes of character actually break a `javascript:` URL:
 *   %  starts an escape sequence
 *   #  starts the fragment, truncating everything after it
 *   "  ends the href attribute when the snippet is pasted into HTML
 *   whitespace, which some browsers strip when saving a bookmark
 */
const escape = (text) =>
  text.replace(
    /[%#"\s]/g,
    (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}`,
  )

const href = `javascript:${escape(source)}`

mkdirSync(releaseDir, { recursive: true })
writeFileSync(resolve(outDir, 'qrick.bookmarklet.txt'), href)
writeFileSync(resolve(releaseDir, 'qrick.bookmarklet.txt'), href)

const installPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QRick bookmarklet</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0 auto;
        padding: 48px 24px;
        max-width: 34rem;
        font: 400 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      }
      h1 { font-size: 1.4rem; letter-spacing: -0.01em; }
      p { color: #4b5563; }
      @media (prefers-color-scheme: dark) { p { color: #9ba3b2; } }
      .grab {
        display: inline-block;
        margin: 24px 0;
        padding: 10px 18px;
        border-radius: 10px;
        background: #1f3fd8;
        color: #fff;
        font-weight: 600;
        text-decoration: none;
        cursor: grab;
      }
    </style>
  </head>
  <body>
    <h1>QRick bookmarklet</h1>
    <p>Drag the button onto your bookmarks bar. Press it on any page to get a QR code for that page.</p>
    <a class="grab" href="${href.replace(/&/g, '&amp;').replace(/</g, '&lt;')}">QRick</a>
    <p>Clicking it here does nothing useful — it needs to live in the bookmarks bar. On mobile, save any page as a bookmark, then edit the bookmark and replace its address with the snippet from the README.</p>
  </body>
</html>
`
writeFileSync(resolve(outDir, 'install.html'), installPage)
writeFileSync(resolve(releaseDir, 'install.html'), installPage)

console.log(
  `bookmarklet  ${(bundle.length / 1024).toFixed(1)} KB minified  ->  ${(href.length / 1024).toFixed(1)} KB encoded`,
)

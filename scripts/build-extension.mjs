/**
 * Builds the extension once, then writes the per-browser variants.
 *
 * Chrome, Edge, Brave, Opera, Arc and Safari all load `dist/extension`.
 * Firefox needs an add-on id, so it gets its own copy with
 * `browser_specific_settings` added and Chrome-only keys removed.
 *
 *   node scripts/build-extension.mjs [--zip]
 */
import { build } from 'vite'
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const chromeDir = resolve(root, 'dist/extension')
const firefoxDir = resolve(root, 'dist/extension-firefox')

await build({ configFile: resolve(root, 'vite.config.ts') })

rmSync(firefoxDir, { recursive: true, force: true })
cpSync(chromeDir, firefoxDir, { recursive: true })

const manifest = JSON.parse(readFileSync(resolve(chromeDir, 'manifest.json'), 'utf8'))
delete manifest.minimum_chrome_version
manifest.browser_specific_settings = {
  gecko: { id: 'qrick@costineest.dev', strict_min_version: '155.0' },
}
writeFileSync(resolve(firefoxDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`extension  ${chromeDir}`)
console.log(`extension  ${firefoxDir}`)

if (process.argv.includes('--zip')) {
  for (const [dir, name] of [
    [chromeDir, 'qrick-chrome.zip'],
    [firefoxDir, 'qrick-firefox.zip'],
  ]) {
    const target = resolve(root, 'dist', name)
    rmSync(target, { force: true })
    try {
      execFileSync('zip', ['-qr', target, '.'], { cwd: dir })
      console.log(`zip        dist/${name}`)
    } catch {
      console.warn(
        `zip        skipped for ${name} — no \`zip\` on PATH. ` +
          'On Windows: Compress-Archive -Path dist/extension/* -DestinationPath dist/' +
          name,
      )
    }
  }
}

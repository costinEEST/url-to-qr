/**
 * Builds the extension once, then writes the per-browser variants.
 *
 * Chromium browsers load `dist/extension`. Firefox and Safari each receive a
 * variant with browser-specific metadata and Chrome-only keys removed.
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
const safariDir = resolve(root, 'dist/extension-safari')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const version = packageJson.version

if (!process.argv.includes('--no-build')) {
  await build({ configFile: resolve(root, 'vite.config.ts') })
}

rmSync(firefoxDir, { recursive: true, force: true })
cpSync(chromeDir, firefoxDir, { recursive: true })

const manifest = JSON.parse(readFileSync(resolve(chromeDir, 'manifest.json'), 'utf8'))
delete manifest.minimum_chrome_version
manifest.browser_specific_settings = {
  gecko: {
    id: 'qrick@costineest.dev',
    strict_min_version: '155.0',
    data_collection_permissions: { required: ['none'] },
  },
}
writeFileSync(resolve(firefoxDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

rmSync(safariDir, { recursive: true, force: true })
cpSync(chromeDir, safariDir, { recursive: true })
const safariManifest = JSON.parse(readFileSync(resolve(chromeDir, 'manifest.json'), 'utf8'))
delete safariManifest.minimum_chrome_version
safariManifest.browser_specific_settings = { safari: { strict_min_version: '26.6' } }
writeFileSync(resolve(safariDir, 'manifest.json'), `${JSON.stringify(safariManifest, null, 2)}\n`)

console.log(`extension  ${chromeDir}`)
console.log(`extension  ${firefoxDir}`)
console.log(`extension  ${safariDir}`)

if (process.argv.includes('--zip')) {
  for (const [dir, name] of [
    [chromeDir, `qrick-chrome-v${version}.zip`],
    [firefoxDir, `qrick-firefox-v${version}.zip`],
    [safariDir, `qrick-safari-v${version}.zip`],
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

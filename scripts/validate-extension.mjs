import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const chromeDir = resolve(root, 'dist/extension')
const firefoxDir = resolve(root, 'dist/extension-firefox')
const safariDir = resolve(root, 'dist/extension-safari')
const chrome = JSON.parse(readFileSync(resolve(chromeDir, 'manifest.json'), 'utf8'))
const firefox = JSON.parse(readFileSync(resolve(firefoxDir, 'manifest.json'), 'utf8'))
const safari = JSON.parse(readFileSync(resolve(safariDir, 'manifest.json'), 'utf8'))

const errors = []
const check = (condition, message) => {
  if (!condition) errors.push(message)
}

check(chrome.manifest_version === 3, 'Chrome package must use Manifest V3')
check(chrome.version === packageJson.version, 'Chrome and package versions must match')
check(firefox.version === packageJson.version, 'Firefox and package versions must match')
check(
  JSON.stringify(chrome.permissions) === JSON.stringify(['activeTab']),
  'Chrome package must request only activeTab',
)
check(
  JSON.stringify(firefox.browser_specific_settings?.gecko?.data_collection_permissions) ===
    JSON.stringify({ required: ['none'] }),
  'Firefox package must declare that it collects no data',
)
check(Boolean(firefox.browser_specific_settings?.gecko?.id), 'Firefox package needs a stable ID')
check(
  firefox.browser_specific_settings?.gecko_android?.strict_min_version === '155.0',
  'Firefox package must declare its supported Firefox for Android version',
)
check(!('minimum_chrome_version' in firefox), 'Firefox package must omit minimum_chrome_version')
check(safari.version === packageJson.version, 'Safari and package versions must match')
check(!('minimum_chrome_version' in safari), 'Safari package must omit minimum_chrome_version')
check(
  safari.browser_specific_settings?.safari?.strict_min_version === '26.6',
  'Safari package must declare its supported Safari version',
)

for (const directory of [chromeDir, firefoxDir, safariDir]) {
  const files = readdirSync(directory, { recursive: true })
  check(!files.some((file) => String(file).endsWith('.map')), `${directory} contains a source map`)
  const popup = readFileSync(resolve(directory, 'popup.html'), 'utf8')
  check(
    /<meta\s+name=["']viewport["']\s+content=["']width=device-width,\s*initial-scale=1["']\s*\/?>/i.test(
      popup,
    ),
    `${directory} must configure the mobile viewport`,
  )
  check(!/<script(?![^>]*\bsrc=)/i.test(popup), `${directory} contains an inline script`)
  const bundle = readFileSync(resolve(directory, 'popup.js'), 'utf8')
  check(!/\beval\s*\(/.test(bundle), `${directory} contains eval()`)
}

if (errors.length > 0) {
  for (const error of errors) console.error(`error       ${error}`)
  process.exit(1)
}

console.log('validation  extension packages satisfy release invariants')

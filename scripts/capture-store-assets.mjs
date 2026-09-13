import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { platform } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = resolve(root, 'store-assets/shared')
const output = resolve(outputDir, 'screenshot-popup-1280x800.png')

const candidates = {
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  linux: ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'],
  win32: [
    resolve(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Google/Chrome/Application/chrome.exe'),
  ],
}[platform()] ?? []

const chrome = process.env.CHROME_PATH ?? candidates[0]
if (!chrome) {
  console.error('Set CHROME_PATH to a current Chrome executable.')
  process.exit(1)
}

mkdirSync(outputDir, { recursive: true })
const server = await createServer({
  configFile: resolve(root, 'vite.demo.config.ts'),
  server: { host: '127.0.0.1', port: 0 },
})

try {
  await server.listen()
  const url = `${server.resolvedUrls?.local[0]}?store-shot=1`
  await new Promise((resolvePromise, reject) => {
    const child = spawn(
      chrome,
      [
        '--headless=new',
        '--disable-background-networking',
        '--disable-component-update',
        '--hide-scrollbars',
        '--no-first-run',
        '--force-device-scale-factor=1',
        '--window-size=1280,800',
        `--screenshot=${output}`,
        url,
      ],
      { stdio: 'inherit' },
    )
    child.once('error', reject)
    child.once('exit', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`Chrome exited with status ${code}`)),
    )
  })
  console.log(`screenshot  ${output}`)
} finally {
  await server.close()
}

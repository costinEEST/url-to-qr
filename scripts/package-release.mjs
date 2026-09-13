import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

execFileSync(process.execPath, [resolve(root, 'scripts/version.mjs'), '--check'], { stdio: 'inherit' })
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' })
execFileSync(process.execPath, [resolve(root, 'scripts/build-extension.mjs'), '--zip', '--no-build'], {
  stdio: 'inherit',
})

const sourceName = `qrick-source-v${version}.zip`
const sourcePath = resolve(dist, sourceName)
rmSync(sourcePath, { force: true })
const sourceFiles = [
  '.editorconfig',
  '.nvmrc',
  'CHANGELOG.md',
  'LICENSE',
  'PRIVACY.md',
  'README.md',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'vite.demo.config.ts',
  'vitest.config.ts',
  'bookmarklet',
  'demo',
  'scripts',
  'src',
  'tests',
]
execFileSync('zip', ['-qr', sourcePath, ...sourceFiles], { cwd: root })
console.log(`source     dist/${sourceName}`)

const names = [
  `qrick-chrome-v${version}.zip`,
  `qrick-firefox-v${version}.zip`,
  `qrick-safari-v${version}.zip`,
  sourceName,
]
const checksums = names.map((name) => {
  const digest = createHash('sha256').update(readFileSync(resolve(dist, name))).digest('hex')
  return `${digest}  ${name}`
})
writeFileSync(resolve(dist, 'SHA256SUMS.txt'), `${checksums.join('\n')}\n`)
console.log('checksums  dist/SHA256SUMS.txt')

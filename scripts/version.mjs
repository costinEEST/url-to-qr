import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagePath = resolve(root, 'package.json')
const lockPath = resolve(root, 'package-lock.json')
const manifestPath = resolve(root, 'src/extension/public/manifest.json')

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

const packageJson = readJson(packagePath)
const packageLock = readJson(lockPath)
const manifest = readJson(manifestPath)

function versions() {
  return {
    'package.json': packageJson.version,
    'package-lock.json': packageLock.version,
    'package-lock.json root': packageLock.packages?.['']?.version,
    'manifest.json': manifest.version,
  }
}

function check() {
  const entries = Object.entries(versions())
  const unique = new Set(entries.map(([, value]) => value))
  if (unique.size !== 1) {
    console.error('Version mismatch:')
    for (const [file, version] of entries) console.error(`  ${file}: ${version}`)
    process.exit(1)
  }
  console.log(`version     ${packageJson.version} (all files agree)`)
}

const setIndex = process.argv.indexOf('--set')
if (setIndex !== -1) {
  const next = process.argv[setIndex + 1]
  if (!next || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(next)) {
    console.error('Usage: npm run version:set -- 1.2.3')
    process.exit(1)
  }
  packageJson.version = next
  packageLock.version = next
  packageLock.packages[''].version = next
  manifest.version = next
  writeJson(packagePath, packageJson)
  writeJson(lockPath, packageLock)
  writeJson(manifestPath, manifest)
  console.log(`version     updated all version files to ${next}`)
}

check()

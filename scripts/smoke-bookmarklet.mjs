/**
 * Runs the *built* bookmarklet — the exact string you paste into a bookmark —
 * inside a jsdom page and checks a QR code comes out.
 *
 * The unit tests cover the source. This covers the artifact: minification,
 * percent-encoding and the `javascript:` wrapper all get a chance to go wrong
 * between the two.
 *
 *   node scripts/smoke-bookmarklet.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const here = dirname(fileURLToPath(import.meta.url))
const href = readFileSync(resolve(here, '../dist/bookmarklet/qrick.bookmarklet.txt'), 'utf8')

const checks = []
const check = (label, condition) => {
  checks.push({ label, ok: Boolean(condition) })
}

check('starts with the javascript: scheme', href.startsWith('javascript:'))
check('has no raw whitespace a browser could strip', !/\s/.test(href))
check('has no # that would truncate it', !href.includes('#'))

const code = decodeURIComponent(href.slice('javascript:'.length))
check('decodes to parseable JavaScript', (() => {
  try {
    new Function(code)
    return true
  } catch {
    return false
  }
})())

const dom = new JSDOM('<!doctype html><title>host page</title><p>hello</p>', {
  url: 'https://example.com/some/page?utm_source=test',
  runScripts: 'outside-only',
})
dom.window.eval(code)

const host = dom.window.document.querySelector('[data-qrick-root="qrick-bookmarklet-v1"]')
check('mounts its host element', host)
check('keeps everything inside a shadow root', host?.shadowRoot)
check('leaves the host page DOM untouched', dom.window.document.querySelector('.qrick') === null)

const shadow = host?.shadowRoot
const input = shadow?.querySelector('textarea')
check('opens with the current URL filled in', input?.value === dom.window.location.href)
check('draws a code straight away', shadow?.querySelector('.qrick__plate svg'))
check('ships its own styles', (shadow?.adoptedStyleSheets?.length ?? 0) > 0 || shadow?.querySelector('style')?.textContent?.includes('.qrick'))

dom.window.eval(code)
check(
  'second press closes it',
  dom.window.document.querySelector('[data-qrick-root="qrick-bookmarklet-v1"]') === null,
)

for (const { label, ok } of checks) console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}`)

const failed = checks.filter(({ ok }) => !ok).length
console.log(
  failed === 0
    ? `\nbookmarklet smoke test passed (${(href.length / 1024).toFixed(1)} KB)`
    : `\n${failed} check(s) failed`,
)
process.exit(failed === 0 ? 0 : 1)

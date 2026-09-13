/**
 * Bookmarklet entry point.
 *
 * Constraints this file exists to satisfy:
 *  - No network requests. Everything, uqr included, is inlined into the
 *    `javascript:` URL, so it works offline and on pages whose CSP forbids
 *    loading or injecting scripts.
 *  - No HTML-injection sinks, so Trusted Types pages don't throw.
 *  - Shadow DOM, so the host page's CSS can't touch the panel and vice versa.
 */
import { createPanel } from '../core/panel'
import { dialogCss, panelCss } from '../core/styles'

const HOST_MARKER = 'qrick-bookmarklet-v1'
const CLOSE_EVENT = 'qrick:close'
const HOST_SELECTOR = `[data-qrick-root="${HOST_MARKER}"]`

function adoptStyles(root: ShadowRoot, css: string) {
  if (
    'adoptedStyleSheets' in root &&
    typeof CSSStyleSheet !== 'undefined' &&
    'replaceSync' in CSSStyleSheet.prototype
  ) {
    try {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(css)
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
      return
    } catch {
      /* fall through to a <style> element */
    }
  }
  const style = document.createElement('style')
  // textContent, not innerHTML: not an injection sink.
  style.append(document.createTextNode(css))
  root.append(style)
}

function open(): void {
  const existing = document.querySelector<HTMLElement>(HOST_SELECTOR)
  if (existing) {
    // Pressing the bookmarklet again closes it.
    existing.dispatchEvent(new Event(CLOSE_EVENT))
    return
  }

  const host = document.createElement('div')
  host.dataset.qrickRoot = HOST_MARKER
  host.style.setProperty('all', 'initial')
  host.style.setProperty('position', 'fixed')
  host.style.setProperty('z-index', '2147483647')

  const shadow = host.attachShadow({ mode: 'open' })
  adoptStyles(shadow, `${panelCss}\n${dialogCss}`)

  const dialog = document.createElement('dialog')
  dialog.className = 'qrick-dialog'
  dialog.setAttribute('aria-label', 'QRick')

  let torndown = false
  const teardown = () => {
    if (torndown) return
    torndown = true
    panel.destroy()
    host.remove()
    document.removeEventListener('keydown', onKeydown, true)
  }

  /**
   * Browsers without `showModal` generally lack `close()` too, so closing
   * cannot go through the dialog. Native closes (the browser's own Escape
   * handling on a modal dialog) still arrive as a `close` event.
   */
  const close = () => {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close()
    else teardown()
  }

  const panel = createPanel({
    value: location.href,
    title: 'Scan to open on your phone',
    onClose: close,
  })
  host.addEventListener(CLOSE_EVENT, teardown, { once: true })

  dialog.append(panel.root)
  dialog.addEventListener('close', teardown)
  // Click outside the panel closes, the way every other modal on the web does.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close()
  })

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close()
    }
  }
  // Some pages swallow Escape. Capture it before they can.
  document.addEventListener('keydown', onKeydown, true)

  shadow.append(dialog)
  document.body.append(host)

  if (typeof dialog.showModal === 'function') {
    dialog.showModal()
  } else {
    dialog.setAttribute('open', '')
  }

  panel.focus()
}

open()

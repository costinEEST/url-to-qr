/**
 * The panel. Both surfaces mount this exact component, so the extension popup
 * and the bookmarklet dialog behave identically — the only difference is what
 * wraps it.
 *
 * Built entirely with `createElement`; no template strings reach the DOM.
 */
import {
  ECC_LEVELS,
  QrTooLongError,
  createQrSvg,
  encodeLink,
  suggestFilename,
  toPngBlob,
  toSvgString,
  type Ecc,
} from './qr'
import { isLoopback, resolveLink, type ResolvedLink } from './link'

export interface PanelOptions {
  /** Pre-filled value. The whole point: never open on an empty field. */
  value?: string
  title?: string
  /** Shown under the field when there is nothing to encode. */
  emptyNote?: string
  /** Renders the close button. The bookmarklet dialog needs one; the popup doesn't. */
  onClose?: () => void
}

export interface Panel {
  root: HTMLElement
  setValue(value: string, options?: { select?: boolean }): void
  focus(): void
  destroy(): void
}

type El = HTMLElement

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
  node.append(...children)
  return node
}

const DEBOUNCE_MS = 110

export function createPanel(options: PanelOptions = {}): Panel {
  const {
    title = 'Scan to open on your phone',
    value: initialValue = '',
    emptyNote = 'Paste a link to make a QR code.',
    onClose,
  } = options

  let ecc: Ecc = 'M'
  let clean = false
  let current: ResolvedLink = { value: '', kind: 'empty', removed: [] }
  let timer: ReturnType<typeof setTimeout> | undefined
  let resetCopyLabel: ReturnType<typeof setTimeout> | undefined
  const objectUrls: string[] = []

  // --- structure -----------------------------------------------------------

  const heading = el('h1', { class: 'qrick__title' }, [title])
  const bar = el('div', { class: 'qrick__bar' }, [heading])

  if (onClose) {
    const close = el('button', { type: 'button', class: 'qrick__close', 'aria-label': 'Close' }, [
      '\u2715',
    ])
    close.addEventListener('click', () => onClose())
    bar.append(close)
  }

  const input = el('textarea', {
    class: 'qrick__input',
    rows: '2',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocorrect: 'off',
    'aria-label': 'Link to encode',
    placeholder: 'https://',
  })

  const status = el('p', { class: 'qrick__status', role: 'status', 'aria-live': 'polite' })

  const plate = el('div', { class: 'qrick__plate' })
  const frame = el('div', { class: 'qrick__frame' }, [plate])
  for (const corner of ['tl', 'tr', 'bl', 'br']) {
    frame.append(el('i', { class: 'qrick__corner', 'data-corner': corner, 'aria-hidden': 'true' }))
  }
  const stage = el('figure', { class: 'qrick__stage' }, [frame])

  const copyButton = el('button', { type: 'button', class: 'qrick__btn qrick__btn--primary' }, [
    'Copy image',
  ])
  const pngButton = el('button', { type: 'button', class: 'qrick__btn' }, ['Save PNG'])
  const svgButton = el('button', { type: 'button', class: 'qrick__btn' }, ['Save SVG'])

  const canCopyImage =
    typeof ClipboardItem !== 'undefined' && typeof navigator?.clipboard?.write === 'function'
  const actions = el(
    'div',
    { class: 'qrick__actions' },
    canCopyImage ? [copyButton, pngButton, svgButton] : [pngButton, svgButton],
  )

  // --- options -------------------------------------------------------------

  const segment = el('div', { class: 'qrick__seg', role: 'radiogroup', 'aria-label': 'Error correction' })
  const eccName = `qrick-ecc-${Math.random().toString(36).slice(2, 8)}`
  for (const level of ECC_LEVELS) {
    const radio = el('input', { type: 'radio', name: eccName, value: level })
    if (level === ecc) radio.checked = true
    radio.addEventListener('change', () => {
      ecc = level
      render()
    })
    segment.append(el('label', { title: eccLabel(level) }, [radio, level]))
  }

  const cleanToggle = el('input', { type: 'checkbox' })
  cleanToggle.addEventListener('change', () => {
    clean = cleanToggle.checked
    render()
  })

  const optionsBlock = el('details', { class: 'qrick__options' }, [
    el('summary', {}, ['Options']),
    el('div', { class: 'qrick__row' }, [el('span', {}, ['Error correction']), segment]),
    el('div', { class: 'qrick__row' }, [
      el('label', { class: 'qrick__switch' }, [cleanToggle, 'Remove tracking parameters']),
    ]),
    el('p', { class: 'qrick__hint' }, [
      'Higher correction survives a scuffed screen; it also makes the code denser.',
    ]),
  ])

  const root: El = el('div', { class: 'qrick' }, [bar, input, status, stage, actions, optionsBlock])

  // --- behaviour -----------------------------------------------------------

  function eccLabel(level: Ecc): string {
    return { L: 'Low — 7%', M: 'Medium — 15%', Q: 'Quartile — 25%', H: 'High — 30%' }[level]
  }

  function setStatus(text: string, tone?: 'warn' | 'signal') {
    status.textContent = text
    if (tone) status.setAttribute('data-tone', tone)
    else status.removeAttribute('data-tone')
  }

  function setButtonsEnabled(enabled: boolean) {
    for (const button of [copyButton, pngButton, svgButton]) button.disabled = !enabled
  }

  function showEmpty(message: string) {
    current = { value: '', kind: 'empty', removed: [] }
    plate.replaceChildren(message)
    plate.setAttribute('data-empty', 'true')
    stage.setAttribute('data-empty', 'true')
    setButtonsEnabled(false)
  }

  function render() {
    const resolved = resolveLink(input.value, clean)
    current = resolved

    if (resolved.kind === 'empty') {
      showEmpty(emptyNote)
      setStatus('')
      return
    }

    let result
    try {
      result = encodeLink(resolved.value, ecc)
    } catch (error) {
      showEmpty('Too much data')
      setStatus(
        error instanceof QrTooLongError
          ? 'Too long for a QR code. Shorten the link, or drop error correction to L.'
          : 'Could not build a QR code from this.',
        'warn',
      )
      return
    }

    const svg = createQrSvg(result)
    svg.setAttribute('aria-label', `QR code for ${resolved.value}`)
    plate.replaceChildren(svg)
    plate.removeAttribute('data-empty')
    stage.removeAttribute('data-empty')
    setButtonsEnabled(true)

    if (isLoopback(resolved.value)) {
      setStatus('Your phone cannot reach localhost. Use your machine\u2019s network address.', 'warn')
    } else if (resolved.removed.length > 0) {
      const count = resolved.removed.length
      setStatus(`Removed ${count} tracking parameter${count === 1 ? '' : 's'}.`, 'signal')
    } else if (resolved.kind === 'coerced') {
      setStatus(`Encoding ${resolved.value}`)
    } else if (resolved.kind === 'text') {
      setStatus('Not a link. Encoding it as plain text.', 'warn')
    } else {
      setStatus(`Version ${result.version} \u00b7 ${resolved.value.length} characters`)
    }
  }

  function scheduleRender() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(render, DEBOUNCE_MS)
  }

  input.addEventListener('input', scheduleRender)
  // Pasting is the main way in: skip the debounce so the code appears at once.
  input.addEventListener('paste', () => setTimeout(render, 0))

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    objectUrls.push(url)
    const anchor = el('a', { href: url, download: filename })
    anchor.style.display = 'none'
    root.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 20_000)
  }

  copyButton.addEventListener('click', async () => {
    if (!current.value) return
    try {
      const png = encodeLink(current.value, ecc)
      // Safari needs the ClipboardItem constructed inside the gesture, so the
      // blob is handed over as a promise rather than awaited first.
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': toPngBlob(png) }),
      ])
      flashCopyLabel('Copied')
    } catch {
      flashCopyLabel('Copy blocked')
    }
  })

  function flashCopyLabel(text: string) {
    copyButton.textContent = text
    if (resetCopyLabel) clearTimeout(resetCopyLabel)
    resetCopyLabel = setTimeout(() => (copyButton.textContent = 'Copy image'), 1600)
  }

  pngButton.addEventListener('click', async () => {
    if (!current.value) return
    try {
      const blob = await toPngBlob(encodeLink(current.value, ecc))
      download(blob, suggestFilename(current.value, 'png'))
    } catch {
      setStatus('Could not save the PNG image.', 'warn')
    }
  })

  svgButton.addEventListener('click', () => {
    if (!current.value) return
    try {
      const blob = new Blob([toSvgString(current.value, ecc)], { type: 'image/svg+xml' })
      download(blob, suggestFilename(current.value, 'svg'))
    } catch {
      setStatus('Could not save the SVG image.', 'warn')
    }
  })

  // --- api -----------------------------------------------------------------

  function setValue(next: string, { select = false } = {}) {
    input.value = next
    render()
    if (select) input.select()
  }

  setValue(initialValue)

  return {
    root,
    setValue,
    focus() {
      input.focus()
      // Select-all means a paste replaces instead of appending, which is what
      // someone reaching for this field almost always wants.
      input.select()
    },
    destroy() {
      if (timer) clearTimeout(timer)
      if (resetCopyLabel) clearTimeout(resetCopyLabel)
      for (const url of objectUrls) URL.revokeObjectURL(url)
      root.remove()
    },
  }
}

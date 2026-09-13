import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPanel } from '../src/core/panel'

function mount(options = {}) {
  const panel = createPanel(options)
  document.body.append(panel.root)
  const input = panel.root.querySelector('textarea')!
  const status = panel.root.querySelector('.qrick__status')!
  const plate = panel.root.querySelector('.qrick__plate')!
  return { panel, input, status, plate }
}

function type(input: HTMLTextAreaElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

beforeEach(() => {
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe('panel', () => {
  it('opens with a code already drawn when given a value', () => {
    const { plate } = mount({ value: 'https://example.com' })
    expect(plate.querySelector('svg')).not.toBeNull()
    expect(plate.hasAttribute('data-empty')).toBe(false)
  })

  it('invites action when it opens empty', () => {
    const { plate } = mount({ emptyNote: 'Paste a link to make a QR code.' })
    expect(plate.getAttribute('data-empty')).toBe('true')
    expect(plate.textContent).toBe('Paste a link to make a QR code.')
  })

  it('regenerates as the user types, without a submit button', async () => {
    vi.useFakeTimers()
    const { input, plate } = mount({ value: 'https://example.com' })
    const before = plate.querySelector('path')!.getAttribute('d')
    type(input, 'https://example.com/a-much-longer-path-than-before')
    await vi.advanceTimersByTimeAsync(200)
    expect(plate.querySelector('path')!.getAttribute('d')).not.toBe(before)
  })

  it('redraws immediately on paste rather than waiting out the debounce', async () => {
    vi.useFakeTimers()
    const { input, plate } = mount()
    input.value = 'https://example.com'
    input.dispatchEvent(new Event('paste'))
    await vi.advanceTimersByTimeAsync(0)
    expect(plate.querySelector('svg')).not.toBeNull()
  })

  it('says when it had to add a scheme', () => {
    const { status } = mount({ value: 'example.com' })
    expect(status.textContent).toBe('Encoding https://example.com')
  })

  it('warns but still encodes free text', () => {
    const { status, plate } = mount({ value: 'not a link at all' })
    expect(status.getAttribute('data-tone')).toBe('warn')
    expect(plate.querySelector('svg')).not.toBeNull()
  })

  it('explains itself when the data will not fit', () => {
    const { status, plate } = mount({ value: 'x'.repeat(5000) })
    expect(status.textContent).toMatch(/Too long/)
    expect(plate.querySelector('svg')).toBeNull()
  })

  it('disables the save buttons when there is nothing to save', () => {
    const { panel } = mount()
    const buttons = [...panel.root.querySelectorAll<HTMLButtonElement>('.qrick__btn')]
    expect(buttons.every((button) => button.disabled)).toBe(true)
  })

  it('only shows the close affordance when the host asks for one', () => {
    expect(mount().panel.root.querySelector('.qrick__close')).toBeNull()
    document.body.replaceChildren()
    const onClose = vi.fn()
    const { panel } = mount({ onClose })
    panel.root.querySelector<HTMLButtonElement>('.qrick__close')!.click()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('cleans tracking parameters when the option is switched on', () => {
    const { panel, status, input } = mount({ value: 'https://example.com/?utm_source=x' })
    const toggle = panel.root.querySelector<HTMLInputElement>('.qrick__switch input')!
    toggle.checked = true
    toggle.dispatchEvent(new Event('change'))
    expect(status.textContent).toBe('Removed 1 tracking parameter.')
    expect(input.value).toBe('https://example.com/?utm_source=x')
  })

  it('lets the error-correction level change the code', () => {
    const { panel, plate } = mount({ value: 'https://example.com' })
    const before = plate.querySelector('path')!.getAttribute('d')
    const high = panel.root.querySelector<HTMLInputElement>('input[value="H"]')!
    high.checked = true
    high.dispatchEvent(new Event('change'))
    expect(plate.querySelector('path')!.getAttribute('d')).not.toBe(before)
  })

  it('cleans up after itself', () => {
    const { panel } = mount({ value: 'https://example.com' })
    panel.destroy()
    expect(document.body.contains(panel.root)).toBe(false)
  })
})

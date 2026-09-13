import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Fresh module each time, since the entry mounts itself on import. */
async function run() {
  vi.resetModules()
  await import('../src/bookmarklet/entry')
  return document.querySelector<HTMLElement>('[data-qrick-root="qrick-bookmarklet-v1"]')
}

function shadowPanel(host: HTMLElement | null) {
  return host?.shadowRoot?.querySelector('.qrick') ?? null
}

beforeEach(() => {
  document.body.replaceChildren()
  document.head.replaceChildren()
})

describe('bookmarklet entry', () => {
  it('mounts a dialog inside a shadow root, not the page', async () => {
    const host = await run()
    expect(host).not.toBeNull()
    expect(host!.shadowRoot).not.toBeNull()
    // Nothing leaks into the page itself.
    expect(document.querySelector('.qrick')).toBeNull()
    expect(shadowPanel(host)).not.toBeNull()
  })

  it('opens with the current page already encoded', async () => {
    const host = await run()
    const input = host!.shadowRoot!.querySelector('textarea')!
    expect(input.value).toBe(location.href)
    expect(host!.shadowRoot!.querySelector('.qrick__plate svg')).not.toBeNull()
  })

  it('carries its own styles instead of borrowing the page stylesheet', async () => {
    const host = await run()
    const root = host!.shadowRoot!
    const adopted = root.adoptedStyleSheets ?? []
    const inlined = root.querySelector('style')?.textContent ?? ''
    expect(adopted.length > 0 || inlined.includes('.qrick')).toBe(true)
    expect(document.head.querySelector('style')).toBeNull()
  })

  it('sits above everything on the page', async () => {
    const host = await run()
    expect(host!.style.position).toBe('fixed')
    expect(host!.style.zIndex).toBe('2147483647')
  })

  it('closes on Escape and removes itself completely', async () => {
    const host = await run()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    // `close` is dispatched as a queued task, not synchronously.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(document.querySelector('[data-qrick-root="qrick-bookmarklet-v1"]')).toBeNull()
  })

  it('closes when pressed a second time', async () => {
    await run()
    await run()
    expect(document.querySelector('[data-qrick-root="qrick-bookmarklet-v1"]')).toBeNull()
  })

  it('does not remove a host-page element with a similar id', async () => {
    const pageElement = document.createElement('div')
    pageElement.id = '__qrick_bookmarklet_host__'
    document.body.append(pageElement)

    await run()

    expect(document.body.contains(pageElement)).toBe(true)
    expect(shadowPanel(document.querySelector('[data-qrick-root="qrick-bookmarklet-v1"]'))).not.toBeNull()
  })

  it('runs full teardown when a second press closes it', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    await run()
    await run()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)
  })
})

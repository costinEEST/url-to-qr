/**
 * Popup entry point.
 *
 * The extension asks for `activeTab` only. Clicking the toolbar button grants
 * it for the current tab, which is enough to read that tab's URL — no host
 * permissions, no "can read all your data on every website" warning.
 */
import { createPanel } from '../core/panel'
import { panelCss } from '../core/styles'
import { isInternalPage } from '../core/link'

/** Firefox and Safari expose `browser`; Chrome and Edge expose `chrome`. */
interface TabsApi {
  tabs: {
    query(info: { active: boolean; currentWindow: boolean }): Promise<{ url?: string }[]>
  }
}
const api = ((globalThis as unknown as { browser?: TabsApi; chrome?: TabsApi }).browser ??
  (globalThis as unknown as { chrome?: TabsApi }).chrome) as TabsApi | undefined

function injectStyles() {
  const style = document.createElement('style')
  style.append(document.createTextNode(panelCss))
  document.head.append(style)
}

async function activeTabUrl(): Promise<string | undefined> {
  try {
    const [tab] = (await api?.tabs.query({ active: true, currentWindow: true })) ?? []
    return tab?.url
  } catch {
    return undefined
  }
}

async function main() {
  injectStyles()
  const mount = document.getElementById('mount')
  if (!mount) return

  const url = await activeTabUrl()
  const internal = isInternalPage(url)

  const panel = createPanel({
    value: internal ? '' : (url ?? ''),
    title: 'Scan to open on your phone',
    emptyNote: internal
      ? 'This browser page has no link to share. Paste one instead.'
      : 'Paste a link to make a QR code.',
  })

  mount.append(panel.root)
  panel.focus()
}

void main()

import { createPanel } from '../src/core/panel'
import { panelCss } from '../src/core/styles'

const style = document.createElement('style')
style.append(document.createTextNode(panelCss))
document.head.append(style)

const storeShot = new URLSearchParams(location.search).has('store-shot')
if (storeShot) document.body.classList.add('store-shot')

const panel = createPanel({
  value: storeShot
    ? 'https://example.com/articles/share-this-page?utm_source=newsletter'
    : location.href,
})
document.getElementById('mount')!.append(panel.root)

document.getElementById('open-dialog')!.addEventListener('click', () => {
  void import(/* @vite-ignore */ `../src/bookmarklet/entry?t=${Date.now()}`)
})

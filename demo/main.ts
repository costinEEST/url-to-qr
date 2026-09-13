import { createPanel } from '../src/core/panel'
import { panelCss } from '../src/core/styles'

const style = document.createElement('style')
style.append(document.createTextNode(panelCss))
document.head.append(style)

const panel = createPanel({ value: location.href })
document.getElementById('mount')!.append(panel.root)

document.getElementById('open-dialog')!.addEventListener('click', () => {
  void import(/* @vite-ignore */ `../src/bookmarklet/entry?t=${Date.now()}`)
})

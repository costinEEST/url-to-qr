/**
 * One stylesheet, three hosts: the extension popup, the in-page dialog the
 * bookmarklet opens, and the demo page.
 *
 * The CSS lives in real `.css` files so editors and linters understand it, and
 * is imported `?inline` so the bookmarklet — which has no way to load a
 * stylesheet — can carry the minified text inside its own bundle.
 */
export { default as panelCss } from './panel.css?inline'
export { default as dialogCss } from './dialog.css?inline'

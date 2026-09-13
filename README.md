# QRick

Turn the current page into a QR code and open it on another device. QRick is available as a browser extension and as a self-contained bookmarklet. Everything runs locally.

## Table of contents

- [Functionality](#functionality)
- [Install the bookmarklet](#install-the-bookmarklet)
- [Install the extension](#install-the-extension)
- [Local development](#local-development)
- [Implementation](#implementation)
- [Browser and toolchain targets](#browser-and-toolchain-targets)
- [Limitations](#limitations)
- [Privacy and permissions](#privacy-and-permissions)
- [License](#license)

## Functionality

Both surfaces open with the current URL selected and its QR code already rendered. You can replace the value with another URL or plain text and the QR code updates as you type.

- Copy the QR code as a PNG image when the browser permits clipboard image writes.
- Download an approximately 1024 px PNG or a scalable SVG.
- Select the exact QR error-correction level: L, M, Q, or H.
- Optionally remove common tracking parameters such as `utm_*`, `fbclid`, and `gclid`.
- Add `https://` to bare domain names and `http://` to bare IP addresses and localhost.
- Warn when a loopback address will not be reachable from a phone.
- Follow light or dark browser appearance while always rendering the QR plate black on white.
- Work with keyboard navigation and reduced-motion preferences.

## Install the bookmarklet

The bookmarklet includes QRick and `uqr` in one `javascript:` URL. It makes no network request at runtime and works on pages with restrictive Content Security Policy settings.

Choose either installation method:

1. Open [bookmarklet/install.html](bookmarklet/install.html) in a browser and drag the **QRick** button to the bookmarks bar.
2. Open [bookmarklet/qrick.bookmarklet.txt](bookmarklet/qrick.bookmarklet.txt), copy the entire line, create a bookmark, and paste the line into its URL/address field.

Press the saved bookmark on any normal web page. Press it again, click outside the panel, press Escape, or use the close button to dismiss it.

On mobile, create any bookmark and then replace its address with the contents of `qrick.bookmarklet.txt`. Bookmark synchronization from a desktop browser is often easier.

## Install the extension

Build the extension first:

```bash
npm ci
npm run build
```

### Chrome and Chromium browsers

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `dist/extension`.

The same build is intended for current Chrome, Edge, Brave, Arc, Opera, Vivaldi, and other current Chromium browsers.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Choose `dist/extension-firefox/manifest.json`.

Temporary extensions disappear after Firefox restarts. Run `npm run package` to create `dist/qrick-firefox.zip` for signing or store submission.

### Safari

Safari Web Extensions must be wrapped in an app:

```bash
xcrun safari-web-extension-converter dist/extension
```

Open the generated Xcode project, run its app, and enable QRick in Safari’s extension settings.

## Local development

QRick uses Node.js 26.8.2. With `nvm` installed:

```bash
nvm use
npm ci
npm run dev
```

Vite prints the localhost address, normally `http://localhost:5173`. The development page shows the shared panel inline and provides a button that opens the bookmarklet-style modal.

Useful commands:

```bash
npm run typecheck       # TypeScript without emitting files
npm test                # all unit and DOM tests once
npm run test:watch      # tests in watch mode
npm run build           # icons, extension variants, and bookmarklet
npm run smoke           # execute the built bookmarklet in jsdom
npm run verify          # typecheck, tests, build, and smoke test
npm run package         # create Chrome and Firefox zip archives
```

## Implementation

QRick uses ESM, TypeScript, native HTML/CSS/DOM APIs, Vite, and Vitest. [`uqr`](https://github.com/unjs/uqr) is the only runtime dependency.

```text
bookmarklet/
  install.html              generated drag-and-drop installer
  qrick.bookmarklet.txt     generated copy-and-paste bookmarklet
demo/                       localhost development page
scripts/                    build, packaging, icon, and smoke-test scripts
src/
  bookmarklet/              in-page dialog entry point
  core/                     shared QR, URL, panel, and style modules
  extension/                extension popup and manifest
tests/                      Vitest unit and DOM tests
```

The extension and bookmarklet use the same `createPanel()` implementation. The extension supplies the active tab URL; the bookmarklet supplies `location.href` and mounts the panel in a shadow root and native `<dialog>`.

The bookmarklet avoids `innerHTML` and other HTML-injection sinks. Its SVG uses `createElementNS`, while its styles use constructable stylesheets with a `<style>` fallback. This keeps it compatible with pages that enforce Trusted Types and isolates it from page CSS.

Generated build output lives in ignored `dist/`. The two files in `bookmarklet/` are tracked release artifacts and are regenerated by `npm run build:bookmarklet`.

## Browser and toolchain targets

The project intentionally targets only current stable desktop browsers as checked on September 13, 2026:

| Platform | Target |
| --- | --- |
| Chrome and Chromium | Chrome 153-equivalent or newer |
| Firefox | Firefox 155 or newer |
| Safari | Safari 26.6 or newer |
| Node.js | Node.js 26.8.2 or newer |
| TypeScript | 7.0.2 |

Source and builds use ESM and an `esnext` compilation target. Older browser versions are outside the supported scope.

## Limitations

- Bookmarklets cannot run on browser-owned pages such as `chrome://` and `about:` pages, extension stores, or pages where the browser disables JavaScript bookmark URLs.
- Extensions cannot expose a useful shareable URL for browser-owned pages or local `file:` URLs, so the popup opens with an empty editable field there.
- A phone cannot resolve `localhost`, `127.0.0.1`, or `[::1]` on the computer. Use the computer’s LAN address, such as `192.168.1.20:5173`, and ensure the development server listens on the network.
- QR codes have finite capacity. Long input can require a lower correction level or a shorter URL.
- Clipboard image writing depends on browser support, a secure context, and user permission. PNG and SVG downloads remain available when copying is unavailable.
- Firefox temporary add-ons must be reloaded after restarting Firefox.
- Safari packaging requires macOS and Xcode.
- Browser vendors may impose bookmark URL-length limits; the drag-and-drop installer is generally more reliable than pasting into an address bar.

## Privacy and permissions

QRick performs QR generation entirely on the device. It sends no URL or text to a server, stores no history, and includes no analytics.

The extension requests only `activeTab`. That temporary permission lets it read the active page URL after the user invokes the extension. It has no host permissions, background service worker, or content script.

## License

[Zero-Clause BSD](LICENSE), a permissive license with no attribution condition.

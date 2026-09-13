# Firefox Add-ons fields

Use the common copy in [shared.md](shared.md).

- Distribution: On addons.mozilla.org (listed)
- Platforms: Firefox for desktop
- Experimental: No
- Requires payment, non-free services, or extra hardware: No
- Data collection: None; the manifest declares `required: ["none"]`
- License: Zero-Clause BSD
- Category: Productivity
- Source code required: Yes, because the submitted bundle is minified
- Add-on package: `dist/qrick-firefox-vX.Y.Z.zip`
- Source package: `dist/qrick-source-vX.Y.Z.zip`
- Source build command: `nvm use && npm ci && npm run build:extension`
- Reviewer notes: use the shared reviewer instructions and mention that `dist/extension-firefox` is the matching build output

Keep the extension ID `qrick@costineest.dev` unchanged after the first release so updates remain associated with the same add-on.

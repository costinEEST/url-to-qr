# Test QRick on Firefox for Android

This guide uses Android Debug Bridge (`adb`) and Mozilla's `web-ext` to install the unpacked Firefox build temporarily on a physical Android phone. The temporary add-on is removed when `web-ext` stops.

## Prerequisites

On the Mac, install Android Platform Tools so `adb` is available, and use the project's Node version:

```bash
adb version
nvm use
npm ci
npm run build:extension
```

On the phone:

1. Install Firefox, Firefox Beta, or Firefox Nightly. Nightly is convenient for development.
2. Enable **Developer options** and **USB debugging** in Android settings.
3. In Firefox, enable **Settings → Advanced → Remote debugging via USB**.
4. Connect the unlocked phone with a data-capable USB cable.
5. Set the USB mode to **Transferring files / Android Auto**.
6. Accept **Allow USB debugging?** on the phone. Selecting **Always allow from this computer** avoids repeated prompts.

## Find and authorize the phone

List connected devices:

```bash
adb devices
```

The status must be `device`:

```text
List of devices attached
RZCWC12GM1T    device
```

`unauthorized` means the phone has not approved this computer. Keep it unlocked and accept the prompt. If no prompt appears, revoke USB debugging authorizations in Developer options, toggle USB debugging, reconnect the cable, and restart ADB:

```bash
adb kill-server
adb start-server
adb devices
```

## Identify the installed Firefox edition

List Mozilla packages in the primary Android profile:

```bash
adb -s YOUR_DEVICE_ID shell pm list packages --user 0 | grep -Ei 'mozilla|fenix|firefox'
```

Common official package names are:

| Firefox edition | Android package |
| --- | --- |
| Firefox | `org.mozilla.firefox` |
| Firefox Beta | `org.mozilla.firefox_beta` |
| Firefox Nightly | `org.mozilla.fenix` |

Some phones have a work profile or Secure Folder. A trailing `SecurityException` mentioning another user does not invalidate package results already printed for the accessible profile. Specifying `--user 0` limits discovery to the phone owner's primary profile.

Read the installed version name and build number:

```bash
adb -s YOUR_DEVICE_ID shell dumpsys package org.mozilla.fenix | grep -E 'versionName|versionCode'
```

Replace `org.mozilla.fenix` with the package found above. QRick's manifest requires Firefox 155.0 or newer on both desktop and Android. You can also see the release version in Firefox under **Settings → About Firefox**.

## Install and run QRick

For Firefox Nightly:

```bash
npx --yes web-ext@latest run \
  --source-dir dist/extension-firefox \
  --target firefox-android \
  --android-device YOUR_DEVICE_ID \
  --firefox-apk org.mozilla.fenix
```

Use `org.mozilla.firefox` or `org.mozilla.firefox_beta` for the other editions. A successful run reports that `qrick-VERSION.xpi` was installed as a temporary add-on.

Keep the command running. Press `R` to reload the extension after rebuilding, or `Ctrl+C` to stop and remove the temporary installation.

## Exercise the Android interface

Open a normal HTTPS page on the phone, then open Firefox's menu, choose **Extensions**, and select **QRick**. Check that:

- the current URL and QR code appear at a readable mobile scale;
- no content is clipped or requires horizontal scrolling;
- all controls have comfortable touch targets;
- changing the URL, correction level, and tracking-removal option updates the code;
- Copy image, Save PNG, and Save SVG either complete or present a useful browser response;
- browser-owned pages show the empty editable state;
- QR generation continues to work while offline;
- Android's Back action returns cleanly to the page.

## Useful diagnostics

Confirm that the Firefox package exists for the primary user:

```bash
adb -s YOUR_DEVICE_ID shell pm path --user 0 org.mozilla.fenix
```

Show connected-device details:

```bash
adb -s YOUR_DEVICE_ID shell getprop ro.product.model
adb -s YOUR_DEVICE_ID shell getprop ro.build.version.release
adb -s YOUR_DEVICE_ID shell getprop ro.build.version.sdk
```

Run Mozilla's static compatibility checks against the generated build:

```bash
npm run lint:firefox
```

For interactive debugging, connect desktop Firefox to the phone through `about:debugging`, select the USB device, and inspect Firefox's main process. Mozilla notes that action-popup markup on Firefox for Android cannot always be inspected like an ordinary desktop popup; opening the popup document in a tab is a useful temporary debugging workaround.

Mozilla maintains the authoritative [Firefox for Android extension development guide](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/) and [`web-ext` command reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/).

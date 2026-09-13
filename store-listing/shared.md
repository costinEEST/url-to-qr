# Shared QRick store listing

## Name

QRick

## Short description

Turn the current page into a QR code and open it on another device.

## Full description

QRick turns the page you are viewing into a QR code with one click. Open the toolbar popup, scan the code with a phone or tablet, and continue on the other device.

The current URL and QR code appear immediately. You can edit the value, paste another URL or plain text, remove common tracking parameters, and choose the exact QR error-correction level. The result can be copied as an image or downloaded as PNG or SVG.

QRick works entirely on your device. It has no analytics, accounts, advertising, remote code, network requests, or browsing-history storage. Its only browser permission is `activeTab`, used after you click the extension to read the current tab URL.

## Category

Productivity

## Search terms

QR code, URL, share page, send to phone, scan, productivity

## Support URL

https://github.com/costinEEST/url-to-qr/issues

## Homepage URL

https://github.com/costinEEST/url-to-qr

## Privacy policy URL

https://github.com/costinEEST/url-to-qr/blob/main/PRIVACY.md

## Single-purpose statement

QRick generates a QR code from the active tab URL so the page can be opened on another device.

## Permission justification

`activeTab` is used only after the user opens QRick. It allows the extension to read the active tab URL and generate its QR code locally. QRick does not monitor tabs in the background.

## Remote-code declaration

QRick does not use remote code. All JavaScript and the `uqr` QR-generation library are included in the submitted package.

## Data-use declaration

QRick does not collect or transmit user data. The active URL and any edited text are processed temporarily and locally to generate a QR code, then discarded when the popup closes.

## Reviewer instructions

1. Open any ordinary HTTPS page.
2. Click the QRick toolbar icon.
3. Confirm that a QR code for the active tab URL appears immediately.
4. Edit the value and confirm that the QR code updates.
5. Open Options to test tracking-parameter removal and error-correction levels.
6. No account, network service, region, payment, or test credentials are required.

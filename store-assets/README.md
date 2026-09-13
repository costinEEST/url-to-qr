# Store artwork

- `chrome/promo-small-440x280.png`: required Chrome promotional tile; also accepted as an optional Edge tile.
- `shared/screenshot-popup-1280x800.png`: generated from the real shared QRick panel by `npm run assets:store`.
- `source/promo-small-generated.png`: high-resolution generation source for the promotional tile.

Regenerate the screenshot with current Chrome and the local app:

```bash
npm run assets:store
```

Before uploading, inspect every image at full size. Confirm that it shows the current release UI, contains no personal URL or browser-profile information, has no transparent border, and remains legible in a thumbnail.

The promotional tile was created with OpenAI's built-in image-generation tool using this prompt:

> Create a clean polished minimal vector-like 440:280 browser-extension promotional illustration for QRick: cobalt-blue gradient backdrop, a white browser card with a bold black-and-white QR symbol on the left, a modern smartphone receiving/scanning it on the right, and a subtle motion bridge. Use strong shapes that remain clear when small. No text, letters, logos, trademarks, labels, borders, or watermark.

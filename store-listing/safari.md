# Safari App Store fields

Use the common copy in [shared.md](shared.md), adapted to the App Store character limits.

- Platform: macOS first; add iOS/iPadOS only after device testing
- Price: Free
- Category: Utilities or Productivity
- Privacy: No data collected
- Tracking: No
- App privacy policy URL: use the shared public policy URL
- Support and marketing URLs: use the shared URLs
- Age rating: answer No/None to content questions unless the containing app adds content
- Build input: `dist/qrick-safari-vX.Y.Z.zip` or `dist/extension-safari`
- TestFlight: test the packaged containing app before App Review

The Safari extension must be packaged through App Store Connect's Safari Web Extension Packager or converted into a containing app with `xcrun safari-web-extension-converter` and signed through an Apple Developer Program account.

# Pace Pets Extension

This is the source folder for the Pace Pets Chrome extension. Public installs
can use the Chrome Web Store listing:
https://chromewebstore.google.com/detail/pace-pets/dgemeohjkjclceamjacmfneodafbcbdk

Source installs can load this folder as an unpacked extension. The extension
reads the ChatGPT/Codex web usage endpoint with your existing signed-in browser
session, normalizes supported usage windows, and stores only safe usage history
in `chrome.storage.local`.

Stored samples contain only normalized local fields. See
`../../docs/reference/storage-schema.md` for the generated storage shape,
runtime constants, supported usage windows, and forbidden data list.

## Source Install

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click Load unpacked.
4. Select this folder: `collector/extension`.

The extension refreshes every five minutes. Click the extension toolbar icon to
open the Pace Pets page. Right-click the toolbar icon to choose whether the
badge normally shows the 7d or 5h view. A `Brake hard!` window temporarily takes
over the badge with its `7d` or `5h` label until the critical pace clears.

If the toolbar badge shows `!`, confirm that Chrome is signed in to ChatGPT.
When the dashboard shows a missing sign-in, failed check, stale check,
first-run waiting state, or a reset window nearing its end, a small refresh
control appears beside the status dot so you can check again without waiting
for the next five-minute refresh. Manual checks are cooldown-limited.

## Custom icons

Replace the PNGs under `themes/default/` to customize the local extension
artwork. Keep the existing filenames for a no-code swap, then reload the
unpacked extension from `chrome://extensions`.

## Chart.js asset

The dashboard loads Chart.js from `vendor/chart.umd.min.js` inside the extension.
After changing the pinned `chart.js` package version, run:

```sh
npm run vendor:chart
```

## Notes

- Cookies and browser session state remain in Chrome.
- The extension may read a ChatGPT session token in memory during refresh so it
  can call the usage endpoint as the signed-in browser session.
- The session token is not persisted, logged, or stored in local history.
- No extension code is injected into ChatGPT pages; refreshes happen from the
  extension background worker.
- The rare Singularity dashboard transition uses generated in-memory canvas
  fragments and does not capture, persist, log, or upload screenshots.
- This uses an undocumented ChatGPT web endpoint, so the collector may need
  updates if that endpoint or response shape changes.

# Local Extension Runtime And Distribution Model

Status: reference.

## Summary

Pace Pets is a local-only Chrome extension: collection, storage, and rendering happen inside the user's own Chrome profile. Users can install the [approved Chrome Web Store listing](https://chromewebstore.google.com/detail/pace-pets/dgemeohjkjclceamjacmfneodafbcbdk) or clone/download this repository and load `collector/extension/` as an unpacked extension.

There is no shared backend, central database, hosted account connection, or project-owned auth service in the current product model.

## User Flow

Chrome Web Store install:

1. User installs Pace Pets from the Chrome Web Store listing.
2. User signs into ChatGPT/Codex in the same Chrome profile.
3. The extension background worker refreshes usage from the browser-visible ChatGPT usage endpoint.
4. The extension dashboard reads the user's local extension storage and renders pace, reset timing, and history.

Unpacked source install:

1. User clones or downloads the repository.
2. User opens Chrome's Extensions page and enables Developer Mode.
3. User loads `collector/extension/` as an unpacked extension.
4. User signs into ChatGPT/Codex in the same Chrome profile.
5. The extension background worker refreshes usage from the browser-visible ChatGPT usage endpoint.
6. The extension dashboard reads the user's local extension storage and renders pace, reset timing, and history.

## Data Boundaries

- Each installed extension instance works only with the current user's own Chrome profile and signed-in browser session.
- The extension may read a ChatGPT session token in memory only to call the upstream usage endpoint as the signed-in user.
- The extension must not persist cookies, auth headers, access tokens, raw upstream responses, raw HTML, raw page text, screenshots, or account identifiers.
- The extension does not inject code into ChatGPT pages or read ChatGPT chats or page contents.
- The Singularity visual transition uses generated in-memory canvas fragments and does not capture screenshots.
- The extension does not request `activeTab`, `tabs`, `scripting`, `tabCapture`, or `desktopCapture`.
- Durable history stays in `chrome.storage.local` for that user's local extension install.
- Persisted history is limited to normalized safe usage fields: timestamps, supported window keys, remaining/used percentages, reset timestamps, window duration, and source/version markers.

## What Users Are Not Connecting To

Users do not connect to the maintainer's machine, browser session, storage, database, API server, or account.

The repo does not provide a multi-user service. Installing from the Chrome Web
Store or loading the unpacked extension creates an independent local copy of the
collector and dashboard for that user's Chrome profile.

## Updates

Chrome Web Store installs update through Chrome's normal extension update path.
Unpacked source installs update by pulling or downloading the latest repository
contents and reloading the unpacked extension in Chrome.

Because the extension depends on browser-visible ChatGPT/Codex endpoints, upstream changes may require repository updates. This is expected fragility for an unofficial local utility, not a hosted compatibility contract.

## Maintainer Guardrails

- Keep the extension-first local model as the canonical path.
- Do not add a shared backend, remote sync, account linking, telemetry, or cross-device history without an explicit product decision.
- Do not add environment-variable controls for product behavior.
- Do not broaden host permissions unless the runtime code actually calls the added origin.
- Prefer one current upstream origin and one storage path over compatibility scaffolding.

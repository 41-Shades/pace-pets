# Local Extension Distribution Model

Status: internal guide.

## Summary

Pace Pets is distributed as a local-only Chrome extension source tree. Users clone or download this repository, load `collector/extension/` as an unpacked extension in their own Chrome profile, and use their own signed-in ChatGPT browser session to collect usage data.

There is no shared backend, central database, hosted account connection, or project-owned auth service in the current product model.

## User Flow

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
- Durable history stays in `chrome.storage.local` for that user's local extension install.
- Persisted history is limited to normalized safe usage fields: timestamps, supported window keys, remaining/used percentages, reset timestamps, window duration, and source/version markers.

## What Users Are Not Connecting To

Users do not connect to the maintainer's machine, browser session, storage, database, API server, or account.

The repo does not provide a multi-user service. Loading the unpacked extension creates an independent local copy of the collector and dashboard for that user's Chrome profile.

## Updates

If the extension changes, users update by pulling or downloading the latest repository contents and reloading the unpacked extension in Chrome.

Because the extension depends on browser-visible ChatGPT/Codex endpoints, upstream changes may require repository updates. This is expected fragility for an unofficial local utility, not a hosted compatibility contract.

## Maintainer Guardrails

- Keep the extension-first local model as the canonical path.
- Do not add a shared backend, remote sync, account linking, telemetry, or cross-device history without an explicit product decision.
- Do not add environment-variable controls for product behavior.
- Do not broaden host permissions unless the runtime code actually calls the added origin.
- Prefer one current upstream origin and one storage path over compatibility scaffolding.

# Extension Architecture

Status: reference.

Pace Pets is a Manifest V3 Chrome extension. The extension page is the canonical product surface; there is no local server, hosted backend, shared database, content script, or remote sync path.

## Runtime Pieces

- `collector/extension/manifest.json` declares the extension, the background service worker, toolbar action, storage permission, alarms permission, context-menu permission, and current upstream host permission.
- `collector/extension/runtime-manifest.js` owns extension runtime script order for the background worker and dashboard page so shared modules have one script-loading contract.
- `collector/extension/dashboard-loader.js` loads the dashboard runtime scripts from `runtime-manifest.js` in dependency order and continues past optional dashboard asset failures declared by the runtime manifest.
- `collector/extension/product-metadata.js` owns shared runtime product labels, dashboard path, dashboard description, context-menu title, and badge titles.
- `collector/extension/integration-config.js` owns the current ChatGPT origin, usage endpoint, auth-session endpoints, required host permission, and source markers shared by runtime code and static checks.
- `collector/extension/usage-integration-adapters.js` owns upstream usage adapter metadata, including ChatGPT WHAM raw window paths, path-matched candidate patterns, and supported field aliases.
- `collector/extension/background.js` owns scheduled collection, toolbar action behavior, toolbar badge-view menu behavior, status state, badge updates, and writes to local history.
- `collector/extension/usage-windows.js` owns supported usage-window keys, durations, labels, preference storage key, and window-key helpers shared by collection, storage, badge, and dashboard code.
- `collector/extension/usage-values.js` owns shared primitive usage value normalization, date parsing, reset-window time math, and stored-window normalization.
- `collector/extension/refresh-status.js` owns refresh-status construction, normalization, storage key, and safe observable failure messages.
- `collector/extension/refresh-control.js` owns the dashboard-to-background manual refresh message contract and manual refresh cooldown constant.
- `collector/extension/preview-control.js` owns pace-state preview ratios, preview timing, toolbar badge preview expiry state, and the dashboard-to-background toolbar badge preview message contract.
- `collector/extension/storage-adapter.js` owns Promise-based `chrome.storage.local` reads/writes, shared Chrome `lastError` callback wrapping, and local-storage change helpers shared by history, background, and dashboard code.
- `collector/extension/usage.js` owns raw-to-safe usage normalization through the default WHAM adapter into supported usage windows.
- `collector/extension/history-store.js` owns sample normalization, dedupe, retention, and sample caps.
- `collector/extension/themes/default/asset-manifest.js` owns the packaged theme asset manifest for app icons and pace icons shared by runtime code and asset checks.
- `collector/extension/themes/default/` contains the default replaceable extension artwork.
- `collector/extension/pace-logic.js` owns shared pace math, pace-state thresholds, badge colors, dashboard copy, inline icon geometry, and legend metadata.
- `collector/extension/perfect-zero-space-scene.js` owns the main-dashboard `PERFECT ZERO` canvas background animation.
- `collector/extension/dashboard.html`, `dashboard.css`, and `dashboard.js` own the extension dashboard UI. Dashboard HTML bootstraps the runtime manifest and loader; full dashboard renders read extension-local storage and pace legend previews, while the minute status tick reuses cached dashboard state for time-sensitive values without messaging the background worker. Pace legend previews update the dashboard card, browser tab, and temporary toolbar badge presentation; the background worker restores the badge through a stored expiry and Chrome alarm.
- `collector/extension/vendor/chart.umd.min.js` is the optional vendored Chart.js runtime used by the dashboard chart; the rest of the dashboard still renders if the chart asset cannot load.

## Collection Flow

1. Chrome starts or installs the extension.
2. `background.js` bootstraps shared scripts from `runtime-manifest.js` and schedules the `refresh-codex-weekly-usage` alarm.
3. On each alarm, `background.js` skips duplicate same-worker refresh work if a prior refresh is still in flight, then attempts to read a ChatGPT session token in memory from the signed-in browser session.
4. `background.js` calls the shared `CodexIntegrationConfig.CHATGPT_USAGE_ENDPOINT` on `chatgpt.com`.
5. `usage.js` normalizes the WHAM response through `usage-integration-adapters.js`, mapping adapter-declared weekly and five-hour paths first, then bounded path-matched candidates when the live WHAM shape is nested under adapter-recognized usage containers. It does not accept unrelated exact-duration quota-shaped objects as supported windows.
6. `history-store.js` appends a safe normalized sample to `chrome.storage.local`.
7. `background.js` updates the selected toolbar badge view, toolbar badge, and refresh status through `refresh-status.js`.
8. `dashboard.js` renders summaries, reset timing, pace state, and charts from extension-local storage, then reuses cached state for minute-by-minute countdown and pace updates until storage or view preferences change.

The dashboard can also request a user-initiated refresh when the visible status is actionable, such as a missing ChatGPT sign-in, failed check, stale refresh, or first-run waiting state. Manual requests use the same guarded background refresh path as the alarm and are cooldown-limited in the dashboard and background worker.

## Boundaries

- No extension code is injected into ChatGPT pages.
- No chat content, page content, or screenshot collection path exists.
- The manifest does not request `tabs`, `activeTab`, `scripting`, `tabCapture`, or `desktopCapture`.
- No cookies, auth headers, access tokens, raw upstream responses, raw HTML, raw page text, screenshots, or account identifiers are persisted.
- Runtime host permissions should only include origins the extension actually fetches.
- Durable product behavior should use code constants, not environment-variable overrides.

## Static Validation

- `scripts/extension-check.mjs` verifies the manifest shape, required extension assets, the current host permission set, and the absence of obsolete localhost/content-script/popup assumptions.
- `scripts/vendor-asset-check.mjs` verifies vendored Chart.js output and default theme icon assets.
- `scripts/release-artifact-check.mjs` verifies version alignment, tracked-text release-safety patterns, release-facing source/documentation boundaries, and the public artifact export-ignore policy for internal-only paths.
- `scripts/smoke-check.mjs` verifies static dashboard/sample-data expectations.
- `npm run preflight` runs formatting, linting, extension validation, smoke checks, tests, and dependency audits.

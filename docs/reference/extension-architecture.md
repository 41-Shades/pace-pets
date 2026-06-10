# Extension Architecture

Status: reference.

Pace Pets is a Manifest V3 Chrome extension. The extension page is the canonical product surface; there is no local server, hosted backend, shared database, content script, or remote sync path.

## Runtime Pieces

- `collector/extension/manifest.json` declares the extension, the background service worker, toolbar action, storage permission, alarms permission, context-menu permission, and current upstream host permission.
- `collector/extension/runtime-manifest.js` owns the shared runtime script prefix plus background-only and dashboard-only script tails, deriving both target script orders from one script-loading contract.
- `collector/extension/dashboard-loader.js` loads the dashboard runtime scripts from `runtime-manifest.js` in dependency order and continues past optional dashboard asset failures declared by the runtime manifest.
- `collector/extension/product-metadata.js` owns shared runtime product labels, dashboard path, dashboard description, context-menu title, and badge titles.
- `collector/extension/integration-config.js` owns the current ChatGPT origin, usage endpoint, auth-session endpoints, required host permission, and source markers shared by runtime code and static checks.
- `collector/extension/usage-integration-adapters.js` owns upstream usage adapter metadata, including ChatGPT WHAM raw window paths, path-matched candidate patterns, and supported field aliases.
- `collector/extension/usage-providers.js` owns the usage provider registry that ties the current ChatGPT WHAM provider to its host permission, auth-session probes, usage endpoint, parser adapter, source markers, request headers, and retry/auth-failure status policy.
- `collector/extension/background.js` owns scheduled collection, toolbar action behavior, toolbar badge-view menu behavior, status state, badge updates, and writes to local history.
- `collector/extension/usage-windows.js` owns supported usage-window keys, durations, labels, the badge preference storage key, and window-key helpers shared by collection, storage, badge, and dashboard code.
- `collector/extension/usage-values.js` owns shared primitive usage value normalization, date parsing, reset-window time math, and stored-window normalization.
- `collector/extension/refresh-status.js` owns refresh-status construction, normalization, storage key, and safe observable failure messages.
- `collector/extension/refresh-control.js` owns the dashboard-to-background manual refresh message contract and manual refresh cooldown constant.
- `collector/extension/preview-control.js` owns synthetic pace-state ratios and preview timing used by local developer state overrides.
- `collector/extension/storage-adapter.js` owns Promise-based `chrome.storage.local` reads/writes, shared Chrome `lastError` callback wrapping, and local-storage change helpers shared by history, background, and dashboard code.
- `collector/extension/usage.js` owns raw-to-safe usage normalization through the default WHAM adapter into supported usage windows.
- `collector/extension/history-store.js` owns sample normalization, dedupe, retention, and sample caps.
- `collector/extension/themes/default/asset-manifest.js` owns the packaged theme asset manifest for app icons and pace icons shared by runtime code and asset checks.
- `collector/extension/themes/default/` contains the default replaceable extension artwork.
- `collector/extension/developer-options.js` owns local developer state-override normalization and projects forceable state groups from the pace-state catalog. `collector/extension/dev-flags.html` is unpacked-extension tooling only and is excluded from Chrome Web Store release packages.
- `collector/extension/pace-logic.js` owns shared pace math, pace-state thresholds, badge colors, dashboard copy, pace-state group metadata, inline icon geometry, legend metadata, controlled Perfect Sync/Perfect Zero presentation, and stale-reset guards. Dashboard pace helpers own the dashboard-only Singularity promotion when valid Perfect Zero also reaches the reset-countdown display-zero band.
- `collector/extension/perfect-zero-space-scene.js` owns the `PERFECT ZERO` canvas scene, including icon and full-bleed profiles, reduced-motion handling, page-visibility pause/resume behavior, and scene teardown. `collector/extension/dashboard-eclipse-icon.js` owns the smaller Perfect Zero theme-control canvas, which uses canvas for organic corona plumes, wispy shimmer, and sparse rim glints where CSS gradients proved too uniform.
- `collector/extension/dashboard.html`, ordered `dashboard*.css` stylesheets, dashboard helper scripts, and `dashboard.js` own the extension dashboard UI. Dashboard HTML bootstraps the runtime manifest and loader; full dashboard renders read extension-local storage and the tab-scoped dashboard window selection, while the 60-second status tick reuses cached dashboard state for time-sensitive values without messaging the background worker. Because that tick reapplies the current pace summary, `collector/extension/dashboard-pace-icon-methods.js` preserves same-state long-running icon effects that own live canvas state instead of tearing them down and recreating them. Perfect Zero activates a full-page canvas background profile and anchors a featured planet to the status icon aperture; dashboard Singularity extends Perfect Zero when `Usage`, `Resets In`, and `Time` all display round zero before the reset window ends.
- `collector/extension/vendor/chart.umd.min.js` is the optional vendored Chart.js runtime used by the dashboard chart; the rest of the dashboard still renders if the chart asset cannot load.

## Collection Flow

1. Chrome starts or installs the extension.
2. `background.js` bootstraps shared scripts from `runtime-manifest.js` and schedules the `refresh-codex-weekly-usage` alarm.
3. On each alarm, `background.js` skips duplicate same-worker refresh work if a prior refresh is still in flight, then probes the configured ChatGPT auth-session endpoints with browser credentials to read a session token in memory from the signed-in browser session.
4. `background.js` calls the default `usage-providers.js` usage endpoint on `chatgpt.com` with browser credentials, JSON accept headers, the current Chrome UI language as `oai-language`, and a bearer authorization header only when a session token was found. Provider-declared auth-failure responses are retried once only when the first usage request used a token.
5. `usage.js` normalizes the WHAM response through the default provider's adapter from `usage-integration-adapters.js`, mapping adapter-declared weekly and five-hour paths first, then bounded path-matched candidates when the live WHAM shape is nested under adapter-recognized usage containers. It does not accept unrelated exact-duration quota-shaped objects as supported windows.
6. `history-store.js` appends a safe normalized sample to `chrome.storage.local`.
7. `background.js` updates the selected toolbar badge view, applies the critical-window badge attention override when needed, and writes refresh status through `refresh-status.js`.
8. `dashboard.js` renders summaries, reset timing, and pace state from extension-local storage plus the page-local dashboard window selection, delegates chart rendering to the dashboard chart helper, then reuses cached state for minute-by-minute countdown and pace updates until storage changes or the page window selection changes.

The dashboard can also request a user-initiated refresh when the visible status is actionable, such as a missing ChatGPT sign-in, failed check, stale refresh, or first-run waiting state, and near the end of a supported reset window. Manual requests use the same guarded background refresh path as the alarm and are cooldown-limited in the dashboard and background worker.

## Developer Controls

The unpacked extension includes `collector/extension/dev-flags.html` as a
local-only developer control surface. Open it from the installed unpacked
extension origin, for example
`chrome-extension://<local-extension-id>/dev-flags.html`.

The page controls only display state and feature-preview overrides. It does not
gate shipped product features. The state choices are derived from the
pace-state catalog and grouped as Pace Levels, Perfect States, and Imperfect
States. Choosing a state stores
`forcedPaceState` under `pacePetsDeveloperOptions` in
`chrome.storage.local`; enabling the brake-hard badge preview stores
`criticalBadgeWindow`; enabling the refresh-link preview stores
`manualRefreshLeadWindow`; enabling the max-pool-fill preview stores
`maxPoolFill`. Returning to live data removes those overrides.

Forced states reuse the preview-control synthetic ratios and percent pairs so
the dashboard card, usage/time bars, tab title, and toolbar badge match
synthetic forced-state behavior until the override is cleared. This setting is
profile-local for development and is excluded from Chrome Web Store release
packages.

## Boundaries

- No extension code is injected into ChatGPT pages.
- No chat content, page content, or screenshot collection path exists.
- The manifest does not request `tabs`, `activeTab`, `scripting`, `tabCapture`, or `desktopCapture`.
- No cookies, auth headers, access tokens, raw upstream responses, raw HTML, raw page text, screenshots, or account identifiers are persisted.
- Runtime host permissions should only include origins the extension actually fetches.
- Durable product behavior should use code constants, not environment-variable overrides.

## Static Validation

- `scripts/extension-check.mjs` verifies the manifest shape, derives required extension assets from the manifest, runtime script manifest, dashboard HTML, and theme asset manifest, verifies the current host permission set, and checks the absence of obsolete localhost/content-script/popup assumptions.
- `scripts/vendor-asset-check.mjs` verifies vendored Chart.js output and default theme icon assets.
- `scripts/release-artifact-check.mjs` verifies version alignment, tracked-text release-safety patterns, release-facing source/documentation boundaries, and the public artifact export-ignore policy for internal-only paths.
- `scripts/smoke-check.mjs` verifies static dashboard/sample-data expectations.
- `npm run preflight` runs formatting, linting, extension validation, smoke checks, tests, and dependency audits.

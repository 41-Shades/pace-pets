# Extension Architecture

Status: reference.

Pace Pets is a Manifest V3 Chrome extension. The extension page is the canonical product surface; there is no local server, hosted backend, shared database, content script, or remote sync path.

## Runtime Pieces

- `collector/extension/manifest.json` declares the extension, the background service worker, toolbar action, storage permission, alarms permission, context-menu permission, and current upstream host permission.
- `collector/extension/runtime-manifest.js` owns the shared runtime script prefix, background-only, dashboard-only, and dev-controls-only script tails, and dependency-edge assertions, deriving target script orders and target load-order checks from one script-loading contract.
- `collector/extension/dashboard-loader.js` loads the dashboard runtime scripts from `runtime-manifest.js` in dependency order and continues past optional dashboard asset failures declared by the runtime manifest.
- `collector/extension/product-metadata.js` owns shared runtime product labels, dashboard path, dashboard description, context-menu titles, and badge titles.
- `collector/extension/integration-config.js` owns the current ChatGPT origin, usage endpoint, auth-session endpoints, required host permission, and source markers shared by runtime code and static checks.
- `collector/extension/usage-integration-adapters.js` owns upstream usage adapter metadata, including ChatGPT WHAM raw window paths, path-matched candidate patterns, and supported field aliases.
- `collector/extension/usage-providers.js` owns the usage provider registry that ties the current ChatGPT WHAM provider to its host permission, auth-session probes, usage endpoint, parser adapter, source markers, request headers, and retry/auth-failure status policy.
- `collector/extension/background.js` bootstraps the background runtime from
  the runtime manifest, schedules collection and badge-presentation alarms,
  coordinates manual refreshes, opens the dashboard from the toolbar action,
  listens for storage changes, and writes refresh status plus history updates.
- `collector/extension/background-logic.js` owns background-safe helper logic
  for badge-window selection, attention-badge prioritization, session-token
  extraction, usage headers, and usage auth-failure retry predicates.
- `collector/extension/background-usage-source.js` owns the credentials-included
  auth-session probes and WHAM usage fetch for the current provider.
- `collector/extension/background-context-menu.js` owns the toolbar action
  context-menu items for opening the dashboard, requesting a cooldown-limited
  usage check, and selecting the stored badge usage window.
- `collector/extension/usage-windows.js` owns supported usage-window keys, durations, labels, the badge preference storage key, and window-key helpers shared by collection, storage, badge, and dashboard code.
- `collector/extension/usage-values.js` owns shared primitive usage value normalization, date parsing, reset-window time math, and stored-window normalization.
- `collector/extension/persisted-text.js` owns safe persisted text normalization, length caps, and secret redaction shared by history and refresh-status storage boundaries.
- `collector/extension/refresh-status.js` owns refresh-status construction, normalization, storage key, and safe observable failure messages.
- `collector/extension/refresh-control.js` owns the dashboard-to-background manual refresh message contract, response builders, cooldown math, and failure predicates.
- `collector/extension/dashboard-preferences.js` owns dashboard-local preference keys, scopes, supported values, and read/write helpers for tab-scoped usage-window selection, extension-page theme selection, and extension-page motion selection.
- `collector/extension/preview-control.js` owns synthetic pace-state ratios and preview timing used by local developer state overrides.
- `collector/extension/storage-adapter.js` owns Promise-based `chrome.storage.local` reads/writes, shared Chrome `lastError` callback wrapping, and local-storage change helpers shared by history, background, and dashboard code.
- `collector/extension/usage.js` owns raw-to-safe usage normalization through the default WHAM adapter into supported usage windows.
- `collector/extension/history-store.js` owns sample normalization, dedupe, retention, and sample caps.
- `collector/extension/themes/default/asset-manifest.js` owns the packaged theme asset manifest for app icons, pace icons, icon variants, and the pace-state exceptions that intentionally do not ship themed PNG art.
- `collector/extension/themes/default/` contains the default replaceable extension artwork.
- `collector/extension/developer-options.js` owns local developer state-override normalization and projects forceable state groups from the pace-state catalog. `collector/extension/dev-flags.html` and `collector/extension/dev-flags-loader.js` are unpacked-extension tooling only, load shared scripts through the runtime manifest's dev-controls target, and are excluded from Chrome Web Store release packages.
- `collector/extension/pace-logic.js` owns shared pace math, pace-state thresholds, badge colors, dashboard copy, pace-state group metadata, inline icon geometry, legend metadata, controlled Perfect Sync/Perfect Zero presentation, and stale-reset guards. Dashboard pace helpers own the dashboard-only Singularity promotion when valid Perfect Zero also reaches the reset-countdown display-zero band.
- `collector/extension/perfect-zero-space-scene.js` owns the `PERFECT ZERO` canvas scene, including icon and full-bleed profiles, reduced-motion handling, page-visibility pause/resume behavior, and scene teardown. `collector/extension/dashboard-eclipse-icon.js` owns the smaller Perfect Zero theme-control canvas, which uses canvas for organic corona plumes, wispy shimmer, and sparse rim glints where CSS gradients proved too uniform.
- `collector/extension/dashboard.html`, ordered `dashboard*.css` stylesheets, dashboard helper scripts, and `dashboard.js` own the extension dashboard UI. `collector/extension/dashboard-dom-contract.js` owns the dashboard selector map, required element IDs, and element collection helper shared by dashboard bootstrap and static smoke checks. Dashboard HTML bootstraps the runtime manifest and loader; full dashboard renders read extension-local storage and the tab-scoped dashboard window selection, while the 60-second status tick reuses cached dashboard state for time-sensitive values without messaging the background worker. Because that tick reapplies the current pace summary, `collector/extension/dashboard-pace-icon-methods.js` preserves same-state long-running icon effects that own live canvas state instead of tearing them down and recreating them. Perfect Zero activates a full-page canvas background profile and anchors a featured planet to the status icon aperture; Singularity reuses the full-page space backdrop without that icon-anchored planet when `Usage`, `Resets In`, and `Time` all display round zero before the reset window ends.
- `collector/extension/dashboard-singularity-transition-renderer.js` owns the
  rare Singularity transition. It fades into the shared space backdrop, fades
  dashboard chrome back in, starts the WebGL black-hole scene behind the intact
  dashboard chrome, then starts the chrome-collapse phase around the glint
  suction timing. The black-hole shader now uses a progress-driven violence
  ramp for disk turbulence, photon-ring flares, shock ripples, jet flicker, and
  glint acceleration. Chrome collapse is implemented by
  `collector/extension/dashboard-singularity-chrome-collapse-fragments.js`,
  `collector/extension/dashboard-singularity-chrome-collapse-motion.js`, and
  `collector/extension/dashboard-singularity-chrome-collapse-scene.js`: real
  main-panel containers, state-rail items, and owned inner fragments split,
  travel on circular inward paths, recede through CSS perspective, rotate with
  pull-direction 3D torque, stretch, and shrink into the horizon as DOM
  elements. When the black-hole approach completes, the same WebGL scene keeps
  advancing behind the still-collapsing chrome, keeps the horizon attached to
  the existing black-hole center, expands into the viewport, crosses into a
  cone/funnel descent, and holds on a singularity point with unclaimed
  replacement dashboard chrome hidden until Singularity exits. The transition
  does not request Chrome tab screenshots.
- `collector/extension/vendor/chart.umd.min.js` is the optional vendored Chart.js runtime used by the dashboard chart; the rest of the dashboard still renders if the chart asset cannot load.

## Collection Flow

1. Chrome starts or installs the extension.
2. `background.js` bootstraps shared scripts from `runtime-manifest.js` and schedules the `refresh-codex-weekly-usage` alarm plus the presentation-only `refresh-pace-badge-presentation` alarm.
3. On each usage collection alarm, `background.js` skips duplicate same-worker refresh work if a prior refresh is still in flight, then probes the configured ChatGPT auth-session endpoints with browser credentials to read a session token in memory from the signed-in browser session.
4. `background.js` calls the default `usage-providers.js` usage endpoint on `chatgpt.com` with browser credentials, JSON accept headers, the current Chrome UI language as `oai-language`, and a bearer authorization header only when a session token was found. Provider-declared auth-failure responses are retried once only when the first usage request used a token.
5. `usage.js` normalizes the WHAM response through the default provider's adapter from `usage-integration-adapters.js`, mapping adapter-declared weekly and five-hour paths first, then bounded path-matched candidates when the live WHAM shape is nested under adapter-recognized usage containers. It does not accept unrelated exact-duration quota-shaped objects as supported windows.
6. `history-store.js` appends a safe normalized sample to `chrome.storage.local`.
7. `background.js` updates the selected toolbar badge view, applies the critical-window badge attention override when needed, and writes refresh status through `refresh-status.js`.
8. Between usage polls, `background.js` refreshes only the toolbar badge presentation from stored history once per minute so time-derived pace ratios stay current without calling the usage endpoint. It skips that presentation refresh while a network refresh is in flight or after a same-worker refresh failure so the failure badge remains visible.
9. `dashboard.js` renders summaries, reset timing, and pace state from extension-local storage plus the page-local dashboard window selection, delegates chart rendering to the dashboard chart helper, then reuses cached state for minute-by-minute countdown and pace updates until storage changes or the page window selection changes.

The dashboard can also request a user-initiated refresh when the visible status is actionable, such as a missing ChatGPT sign-in, failed check, stale refresh, or first-run waiting state, and near the end of a supported reset window. The toolbar action context menu exposes the same background refresh as an always-available `Check usage now` action outside the dashboard surface. Manual requests use the shared `refresh-control.js` message/response contract where a caller needs a response, then the same guarded background refresh path as the alarm. The background worker stores only the manual-refresh cooldown-until timestamp in `chrome.storage.local`, so the dashboard and toolbar entry point remain cooldown-limited across Manifest V3 worker restarts.

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
`maxPoolFill`; enabling the reset exhaustion preview stores
`resetExhaustedPreview`. Choosing a Sprint faster intensity preview stores
`forcedPaceState` as `wellAhead` plus `sprintIntensityPreview` as an exact
ratio string from `1.55` through `7.00`. Returning to live data removes those
overrides. The Singularity `Preview entry` preview and monk escape feature
preview are one-shot dev actions: they send runtime messages to dashboard pages
and do not store developer option state.

Forced states reuse the preview-control synthetic ratios and percent pairs so
the dashboard card, usage/time bars, tab title, and toolbar badge match
synthetic forced-state behavior until the override is cleared. This setting is
profile-local for development and is excluded from Chrome Web Store release
packages.

## Boundaries

- No extension code is injected into ChatGPT pages.
- No chat content, arbitrary page content, or screenshot collection path exists.
- The manifest does not request `activeTab`, `tabs`, `scripting`, `tabCapture`, or `desktopCapture`.
- No cookies, auth headers, access tokens, raw upstream responses, raw HTML, raw page text, screenshots, or account identifiers are persisted.
- Runtime host permissions should only include origins the extension actually fetches.
- Durable product behavior should use code constants, not environment-variable overrides.

## Static Validation

- `scripts/extension-check.mjs` verifies the manifest shape, derives required extension assets from the manifest, runtime script manifest, dashboard HTML, and theme asset manifest, verifies theme pace-icon eligibility against the pace-state catalog, verifies the runtime manifest's dependency-edge contract, verifies the current host permission set, and checks the absence of obsolete localhost/content-script/popup assumptions.
- `scripts/vendor-asset-check.mjs` verifies vendored Chart.js output and default theme icon assets.
- `scripts/release-artifact-check.mjs` verifies version alignment, tracked-text release-safety patterns, release-facing source/documentation boundaries, and the public artifact export-ignore policy for internal-only paths.
- `scripts/smoke-check.mjs` verifies static dashboard/sample-data expectations.
- `npm run preflight` runs formatting, linting, extension validation, smoke checks, tests, and dependency audits.

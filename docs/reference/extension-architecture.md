# Extension Architecture

Status: reference.

Pace Pets is a Manifest V3 Chrome extension. The extension page is the canonical product surface; there is no local server, hosted backend, shared database, content script, or remote sync path.

## Runtime Pieces

- `collector/extension/manifest.json` declares the extension, the background service worker, toolbar action, storage permission, alarms permission, context-menu permission, and current optional upstream host permission.
- `collector/extension/runtime-manifest.js` owns the shared runtime script prefix plus the background-only, dashboard-only, and dev-controls-only script tails. `scripts/runtime-dependency-contract.mjs` owns static dependency-edge assertions derived against those shipped script orders, keeping check-only metadata out of extension startup.
- `collector/extension/dashboard-loader.js` loads the dashboard runtime scripts from `runtime-manifest.js` in dependency order and continues past optional dashboard asset failures declared by the runtime manifest.
- `collector/extension/product-metadata.js` owns shared runtime product labels, dashboard path, dashboard description, context-menu titles, and badge titles.
- `collector/extension/integration-config.js` owns the current ChatGPT origin, usage endpoint, auth-session endpoints, optional host permission, and source markers shared by runtime code and static checks.
- `collector/extension/usage-permissions.js` owns the optional ChatGPT host-permission request and presence checks shared by the dashboard and background worker.
- `collector/extension/usage-integration-adapters.js` owns upstream usage adapter metadata, including ChatGPT WHAM raw window paths, path-matched candidate patterns, and supported field aliases.
- `collector/extension/usage-providers.js` owns the usage provider registry that ties the current ChatGPT WHAM provider to its host permission, auth-session probes, usage endpoint, parser adapter, source markers, request headers, and retry/auth-failure status policy.
- `collector/extension/background.js` bootstraps the background runtime from
  the runtime manifest, schedules collection and badge-presentation alarms,
  routes refresh and clear-data messages, opens the dashboard from the toolbar
  action, and listens for storage changes.
- `collector/extension/background-refresh-runner.js` deduplicates refreshes,
  invalidates pre-clear fetch generations, commits history, status, and badge
  presentation inside the usage-data transaction, and resets local usage state.
- `collector/extension/background-logic.js` owns background-safe helper logic
  for badge-window selection, attention-badge prioritization, session-token
  extraction, usage headers, and usage auth-failure retry predicates.
- `collector/extension/background-transition-refresh.js` owns the adaptive
  transition-refresh decision that promotes the presentation-only minute alarm
  into a usage fetch while a supported window is at `2%` usage remaining or
  less.
- `collector/extension/background-usage-source.js` owns the credentials-included
  auth-session probes and WHAM usage fetch for the current provider.
- `collector/extension/background-context-menu.js` owns the toolbar action
  context-menu items for opening the dashboard, requesting a cooldown-limited
  usage check, and selecting the stored badge usage window.
- `collector/extension/usage-windows.js` owns supported usage-window keys, durations, labels, the badge preference storage key, and window-key helpers shared by collection, storage, badge, and dashboard code.
- `collector/extension/usage-values.js` owns shared primitive usage value normalization, date parsing, reset-window time math, and stored-window normalization.
- `collector/extension/persisted-text.js` owns safe persisted text normalization, length caps, and secret redaction shared by history and refresh-status storage boundaries.
- `collector/extension/refresh-status.js` owns refresh-status construction, normalization, storage key, and safe observable failure messages.
- `collector/extension/refresh-control.js` owns the dashboard-to-background manual-refresh and clear-data message contracts, response builders, cooldown math, and failure predicates.
- `collector/extension/dashboard-preferences.js` owns dashboard-local preference keys, scopes, supported values, and read/write helpers for tab-scoped usage-window selection, extension-page theme selection, and extension-page motion selection.
- `collector/extension/preview-control.js` owns synthetic pace-state ratios and preview timing used by local developer state overrides; `collector/extension/brake-intensity.js` and `collector/extension/sprint-intensity.js` own exact Brake hard and Sprint faster intensity preview ladders.
- `collector/extension/storage-adapter.js` owns Promise-based `chrome.storage.local` reads/writes, shared Chrome `lastError` callback wrapping, local-storage change helpers, and the cross-context Web Lock used to serialize usage-data mutations across dashboard pages and the background worker.
- `collector/extension/audio-preferences.js` owns the persisted dashboard audio
  enablement and default-volume preference stored in `chrome.storage.local`.
  `collector/extension/audio-clips.js` owns the packaged audio clip registry,
  and `collector/extension/dashboard-audio-manager.js` owns the dashboard Web
  Audio graph, readiness statuses, clip loading, scheduling, fades, and group
  cleanup. `collector/extension/dashboard-audio-control.js` owns the dashboard
  sound icon state, tooltip text, and explicit enable/unmute flow. Audio
  enablement and volume are persisted and storage changes update every open
  dashboard page, but Web Audio readiness is live per page: dashboard startup
  attempts to restore readiness when sound is enabled, and Chrome can still
  require a fresh user gesture before playback. Ordinary dashboard rendering
  does not wait for that startup work; only the first Big Bang or Singularity
  trigger waits for the stored preference read and any ready-audio preload to
  settle. The startup resume attempt has a 250 ms code-owned bound so Chromium
  autoplay blocking cannot hold that visual gate indefinitely. A muted or
  gesture-blocked page runs that visual once without sound and does not replay
  it after a later gesture. An audio-preparation failure emits only a stable
  warning, releases the visual gate, and suppresses audio for that first special
  transition. That frozen startup outcome belongs only to a transition queued
  behind the gate or entered by the initial dashboard presentation. A
  superseded read cannot close that window; the first latest-wins history
  presentation closes it only after transition evaluation. If that presentation
  has no special-state trigger, a transition first triggered after preparation
  uses the page's live audio state; a trigger while preparation is still pending
  remains bound to the queued startup outcome. Audio readiness and dashboard
  state readiness are separate gates: audio settlement cannot launch a queued
  transition from load start until a latest committed or fallback presentation
  becomes authoritative, and a dashboard-only wait does not consume or suppress
  live audio.
  `collector/extension/dashboard-big-bang-audio-timeline.js` owns the packaged
  Big Bang two-clip music timeline, including the 0.5s crossfade and 2.5s final
  fade timing.
  `collector/extension/dashboard-transition-audio.js` owns the declarative
  transition-audio adapter that maps named transition timelines to audio manager
  clip preloading, clock-anchored scheduling, and idempotent group
  cancellation.
- `collector/extension/usage.js` owns raw-to-safe usage normalization through the default WHAM adapter into supported usage windows.
- `collector/extension/history-store.js` owns the exclusive usage-data transaction, sample normalization, dedupe, durable read/write retention repair, plateau compaction, and sample caps.
- `collector/extension/themes/default/asset-manifest.js` owns the packaged theme asset manifest for app icons, pace icons, icon variants, effect assets, cart-spill grocery icons, push-tank ocean icons, and the pace-state exceptions that intentionally do not ship themed PNG art.
- `collector/extension/themes/default/` contains the default replaceable extension artwork.
- `collector/extension/developer-options.js` owns local developer state-override normalization and projects forceable state groups from the pace-state catalog. `collector/extension/dev-flags.html` and `collector/extension/dev-flags-loader.js` are unpacked-extension tooling only, load shared scripts through the runtime manifest's dev-controls target, and are excluded from Chrome Web Store release packages.
- `collector/extension/pace-logic.js` owns shared pace math, percent and ratio display formatting, two-decimal threshold mapping, badge colors, dashboard copy, pace-state group metadata, inline icon geometry, legend metadata, and stale-reset guards. `collector/extension/pace-presentation.js` builds the one immutable active-reading model consumed by toolbar and dashboard state selection, including Big Bang, Perfect Sync, Perfect Zero, Singularity, displayed-zero Splat, raw ratio, and controlled display ratio. `collector/extension/pace-window-history.js` extends that shared model with reset-window sample bounds and perfect-zero eligibility history. `collector/extension/held-zero-state.js` owns normalized per-window semantic zero-state holds keyed by reset identity. Dashboard pace helpers own dashboard-only special transitions for Big Bang and Singularity, and special-transition methods request optional named audio timelines without constructing Web Audio nodes directly.
- `collector/extension/perfect-zero-space-scene.js` owns the `PERFECT ZERO` canvas scene, including icon and full-bleed profiles, reduced-motion handling, page-visibility pause/resume behavior, and scene teardown. `collector/extension/dashboard-eclipse-icon.js` owns the smaller Perfect Zero theme-control canvas, which uses canvas for organic corona plumes, wispy shimmer, and sparse rim glints where CSS gradients proved too uniform.
- `collector/extension/dashboard.html`, ordered `dashboard*.css` stylesheets, dashboard helper scripts, and `dashboard.js` own the extension dashboard UI. `collector/extension/dashboard-dom-contract.js` owns the dashboard selector map, required element IDs, and element collection helper shared by dashboard bootstrap and static smoke checks. Dashboard HTML bootstraps the runtime manifest and loader; full dashboard renders read extension-local storage and the tab-scoped dashboard window selection. `collector/extension/dashboard-refresh-scheduler.js` reuses that cached state without messaging the background worker, wakes at the next visible time-percent, countdown, pace-state, stale-window, or manual-refresh boundary, and caps quiet periods at 60 seconds. `collector/extension/dashboard-history-timing-methods.js` captures one live timestamp for all active time-derived dashboard values and evolves the page's semantic zero-state holds across an exact reset boundary; persisted reset-matched holds restore the same state after reload. Because scheduled refreshes reapply the current pace summary, `collector/extension/dashboard-pace-icon-methods.js` preserves same-state long-running icon effects that own live canvas state instead of tearing them down and recreating them. Perfect Zero activates a full-page canvas background profile and anchors a featured planet to the status icon aperture; Big Bang and Singularity reuse the full-page space backdrop without that icon-anchored planet.
- `collector/extension/dashboard-state-loader.js` gives asynchronous full-dashboard reads a latest-request-wins generation and exposes whether that latest generation is still loading. User actions and destructive state commits invalidate older generations before they can render stale history or restore an older window selection. Only a successful latest commit releases pending special-transition playback; stale and failed loads do not.
- `collector/extension/dashboard-big-bang-origin.js`,
  `collector/extension/dashboard-big-bang-scene-factory.js`,
  `collector/extension/dashboard-big-bang-ejecta-draw.js`,
  `collector/extension/dashboard-big-bang-particle-draw.js`,
  `collector/extension/dashboard-big-bang-recede-draw.js`,
  `collector/extension/dashboard-big-bang-plume-draw.js`,
  `collector/extension/dashboard-big-bang-webgl-shaders.js`,
  `collector/extension/dashboard-big-bang-webgl-renderer.js`,
  `collector/extension/dashboard-big-bang-scene-draw.js`,
  `collector/extension/dashboard-big-bang-scene.js`, and
  `collector/extension/dashboard-big-bang-transition-renderer.js` own the
  dashboard-only Big Bang transition. The renderer hides dashboard chrome,
  plays a generated full-viewport Canvas opening cover with a dark pre-hold,
  seed sparkle, first ignition, plumes, and sparks, overlays the WebGL flagship
  ray/bloom expansion, fades the shared space backdrop in under the temporary
  canvases, then fades dashboard chrome back after the space scene has appeared.
  It does not capture screenshots or request page content. See
  `docs/reference/big-bang-transition.md` for the detailed sequence contract,
  timing, and animation lessons learned.
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
  pieces. Each collapse run uses a fresh seed for geometry and owned-fragment
  selection while preserving fixed timing. When the black-hole approach
  completes, the same WebGL scene keeps
  advancing behind the still-collapsing chrome, keeps the horizon attached to
  the existing black-hole center, expands into the viewport, crosses into a
  cone/funnel descent, falls through the singularity point into whiteout, and
  plays the shared dashboard checkerboard reveal over the current dashboard
  state. The transition does not request Chrome tab screenshots.
- `collector/extension/dashboard-checkerboard-reveal.js` and
  `collector/extension/dashboard-checkerboard-reveal.css` own the reusable
  full-page whiteout-to-dashboard checkerboard reveal. Singularity uses it for
  terminal whiteout recovery, and unpacked dev controls can request the same
  one-shot reveal over the live or forced dashboard state.
- `collector/extension/vendor/chart.umd.min.js` is the optional vendored Chart.js runtime used by the dashboard chart; the rest of the dashboard still renders if the chart asset cannot load.

## Collection Flow

1. Chrome starts or installs the extension.
2. `background.js` bootstraps shared scripts from `runtime-manifest.js` and schedules the usage-refresh alarm plus the presentation-only badge-refresh alarm from `refresh-schedule.js`.
3. On each usage collection alarm, `background.js` skips duplicate same-worker refresh work if a prior refresh is still in flight, then skips the network fetch until optional ChatGPT host access has been granted.
4. Once host access exists, `background.js` probes the configured ChatGPT auth-session endpoints with browser credentials to read a session token in memory from the signed-in browser session.
5. `background.js` calls the default `usage-providers.js` provider through the provider-aware `background-usage-source.js` fetch path. The provider owns the usage endpoint, auth-session endpoints, display name, source markers, retry policy, and parser adapter. Requests use browser credentials, JSON accept headers, the current Chrome UI language as `oai-language`, and a bearer authorization header only when a session token was found. Provider-declared auth-failure responses are retried once only when the first usage request used a token. One 20-second code deadline covers auth probing, usage requests, retries, and response parsing so the worker can persist a stable timeout failure before Chrome's fetch lifetime limit. Auth-probe failures log only a code-owned warning, and a successful response whose usage JSON cannot be parsed becomes one stable safe failure; native parse messages and response excerpts do not cross the fetch boundary into logs or refresh status.
6. `usage.js` normalizes the response through the selected provider's adapter from `usage-integration-adapters.js`, discovering adapter-declared paths first and then bounded path-matched candidates when the live usage shape is nested under adapter-recognized usage containers. Each recognized quota object is classified by its declared duration rather than its upstream `primary`, `secondary`, weekly, or five-hour path label: 300 minutes maps to the five-hour window and 10,080 minutes maps to the weekly window. Durationless and unsupported-duration objects are rejected instead of guessed, and unrelated exact-duration quota-shaped objects are not accepted as supported windows. Positive relative reset estimates round up to deterministic minute boundaries so equivalent polls compact without moving a reset earlier than its full offset; absolute upstream reset timestamps retain their supplied precision.
7. `history-store.js` appends a safe normalized sample to `chrome.storage.local` inside one cross-context usage-data transaction. Reads apply the same normalization and durably repair only changed stored values, so retention remains enforced without redundant storage writes even when collection later stops.
8. `background.js` updates the selected toolbar badge view, applies the critical-window badge attention override when needed, and writes refresh status through `refresh-status.js`.
9. Between normal usage polls, `background.js` refreshes only the toolbar badge presentation from stored history at the presentation interval defined by `refresh-schedule.js` so time-derived pace ratios stay current without calling the usage endpoint. The same pass evaluates every real supported window and evolves reset-keyed semantic Splat, Perfect Zero, or Singularity holds in refresh status; developer badge previews never enter that persisted map, and refresh failures preserve it. When stored history shows any supported window at `2%` usage remaining or less, displayed `0%` time remaining, or an already-ended reset window, `background-transition-refresh.js` can promote that minute wakeup into a guarded usage fetch. It skips presentation refresh while a network refresh is in flight or after a same-worker refresh failure so the failure badge remains visible.
10. `dashboard.js` renders summaries, reset timing, and pace state from extension-local storage plus the page-scoped dashboard window selection, delegates chart rendering to the dashboard chart helper, then reuses cached state for boundary-aware countdown and pace updates until storage changes or the page window selection changes. One owned timeout wakes at the earliest visible presentation change, never waits more than 60 seconds, and is cleared while the page is hidden. Each active render uses one live timestamp across its time-derived values, immutable pace presentation, and synthetic chart endpoint. Cached refreshes replace only that chart endpoint and its derived bounds/dataset in the existing Chart instance. Stale windows consume only a matching reset-keyed semantic hold, never a reconstructed historical timestamp. New dashboard pages seed from the stored badge window, but dashboard toggles stay in that page's `sessionStorage` and do not update the toolbar badge preference.

`refresh-schedule.js` is the single owner for alarm names, initial delays,
periods, transition-refresh thresholds, and dashboard automatic-check copy.
After optional ChatGPT access is granted, normal usage collection runs every
five minutes; transition watch can check every minute while stored data is at
`2%` usage remaining or less, displayed `0%` time remaining, or an already-ended
reset window, and the last refresh status is healthy. The dashboard can also
request a user-initiated refresh when the visible status is actionable, such as
a missing ChatGPT sign-in, failed check, stale refresh, or
first-run waiting state, and near the end of a supported reset window. The
dashboard requests optional ChatGPT host access before sending the
manual-refresh message to the background worker. The toolbar action context
menu exposes the same permission-gated background refresh as a `Check usage now`
action outside the dashboard surface and opens the dashboard when ChatGPT access
has not been granted. Manual requests use the shared `refresh-control.js`
message/response contract where a caller needs a response, then the same
guarded background refresh path as the alarm. The background worker stores only
the manual-refresh cooldown-until timestamp in `chrome.storage.local`, so the
dashboard and toolbar entry point remain cooldown-limited across Manifest V3
worker restarts.

The dashboard routes `Clear data` through the background worker. Starting a
clear invalidates older in-flight fetch generations, then the exclusive
usage-data transaction removes history and refresh status and resets the badge;
an older refresh cannot commit either key afterward. Web Locks are required in
the extension runtime so dashboard and worker contexts share that exclusion.
While a clear response is pending, the prior dashboard presentation is not
authoritative for special-transition playback, and cached time-sensitive or
storage renders cannot release it during that mutation roundtrip. A successful
clear releases only after its normalized committed render. A failed clear first
re-reads authoritative local state; only if that recovery read itself fails does
it restore the prior presentation, and only when that presentation was
authoritative and no newer dashboard load owns the boundary.

## Developer Controls

The unpacked extension includes `collector/extension/dev-flags.html` as a
local-only developer control surface. Open it from the installed unpacked
extension origin, for example
`chrome-extension://<local-extension-id>/dev-flags.html`.
`collector/extension/dev-flags-dom-contract.js` owns the dev-control selector
map, required element IDs, and state-group element collection used by the
dev-controls bootstrap.

The page controls only display state and feature-preview overrides. It does not
gate shipped product features. The state choices are derived from the
pace-state catalog and grouped as Pace Levels, Perfect States, and Imperfect
States. Choosing a state stores
`forcedPaceState` under `pacePetsDeveloperOptions` in
`chrome.storage.local`; enabling the extension-badge preview stores
`criticalBadgeWindow`; enabling the refresh-link preview stores
`manualRefreshLeadWindow`; enabling the max-pool-fill preview stores
`maxPoolFill`; enabling the Exhausted man preview stores
`resetExhaustedPreview`; enabling the checkerboard polarity preview stores
`checkerboardRevealWhiteTransparent`. Choosing a Splat timing preview stores
`forcedPaceState` as `splat` plus `splatTimeRemainingPreview` as `over50` or
`under50`. Choosing a Brake hard intensity preview stores `forcedPaceState` as
`criticalBehind` plus `brakeIntensityPreview` as an exact ratio string from
`0.55` through `0.00`. Choosing a Sprint faster intensity preview stores
`forcedPaceState` as `wellAhead` plus `sprintIntensityPreview` as an exact ratio
string from `1.55` through `7.00`. Returning to live data removes those
overrides. The separate Video Capture section contains Big Bang replay for
deterministic capture rehearsals.
`collector/extension/dev-preview-action-registry.js` owns the one-shot dev
action catalog, broker envelopes, button labels, requested-status copy, and
fallback error copy for Big Bang replay, Brake hard max debris burst, Rare
burst (5%), monk escape previews, Pace card transition preview, and the shared
checkerboard reveal replay. Response-required actions use request IDs and a
background-owned dashboard-port broker. The broker ranks open dashboards,
dispatches to one owner at a time, and tries another owner only after an
explicit no-effect response; a timeout or disconnect never redispatches work
that may already have run. One-shot actions do not store developer option
state; the individual preview control modules remain thin adapters around the
shared registry.
The Max debris preview owns its timers and layers as one cancellable lifecycle,
clearing them on repeat, completion, motion stop, visibility pause, or leaving
Brake hard.

Forced states reuse the preview-control synthetic ratios and percent pairs so
the dashboard card, usage/time bars, tab title, and toolbar badge match
synthetic forced-state behavior until the override is cleared. This setting is
profile-local for development and is excluded from Chrome Web Store release
packages.

## Boundaries

- No extension code is injected into ChatGPT pages.
- No chat content, arbitrary page content, or screenshot collection path exists.
- The manifest does not request `activeTab`, `tabs`, `scripting`, `tabCapture`, or `desktopCapture`.
- The manifest does not request install-time host permissions; the optional `chatgpt.com` host permission is used only for background session and usage endpoint requests.
- No cookies, auth headers, access tokens, raw upstream responses, raw HTML, raw page text, screenshots, or account identifiers are persisted.
- Runtime host permissions should only include origins the extension actually fetches.
- Durable product behavior should use code constants, not environment-variable overrides.

## Static Validation

- `scripts/extension-check.mjs` verifies the manifest shape, derives the exact release allowlist from the manifest, background/dashboard runtime scripts, dashboard HTML, theme assets, and configured audio clips, verifies theme pace-icon eligibility against the pace-state catalog, verifies the separate runtime dependency-edge contract, verifies the current optional host permission set, and checks the absence of obsolete localhost/content-script/popup assumptions. `scripts/package-extension.mjs` packages only that allowlist, so unpacked developer controls, inactive source artwork, and ignored files are excluded by construction.
- `scripts/vendor-asset-check.mjs` verifies vendored Chart.js output and default theme icon assets.
- `scripts/release-artifact-check.mjs` verifies version alignment, tracked-text release-safety patterns, release-facing source/documentation boundaries, and the public artifact export-ignore policy for internal-only paths.
- `scripts/smoke-check.mjs` verifies static dashboard/sample-data expectations.
- `npm run preflight` runs formatting, linting, extension validation, smoke checks, tests, and dependency audits.

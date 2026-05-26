# Repository Guidelines

## Project Posture

- This is an unofficial local-only Chrome extension for displaying sanitized Codex usage, pace, and reset timing.
- Keep the implementation small, inspectable, and dependency-light. The extension page is the canonical product surface.
- Prefer one canonical path over compatibility shims or duplicate collectors. Remove obsolete paths when replacing behavior.
- Treat any public source release as an inspectable release artifact, not an open community-contribution project. Do not add contributor workflows, issue templates, governance docs, or community process unless explicitly requested.

## Structure

- `collector/extension/` contains the unpacked Chrome extension, extension page, background refresh worker, local history store, vendored Chart.js asset, icons, and pace art.
- `data/usage.sample.json` is safe sample data. Do not commit `data/usage.json`.
- `docs/` contains static project documentation and dev plans.
- `scripts/` contains narrow static validation and asset maintenance helpers.

## Safety Boundaries

- Do not store or log cookies, auth headers, access tokens, raw HTML, raw page text, screenshots, raw network responses, or account identifiers.
- The extension may read a ChatGPT session token in memory only to call the usage endpoint as the signed-in browser session.
- Persist only normalized safe usage fields in `chrome.storage.local`: timestamps, supported window keys, remaining/used percent, reset timestamps, window duration, and source/version markers.
- Keep history bounded with code constants. Do not add env-variable controls for product behavior.

## Verification

- Testing process and philosophy are documented in `docs/guides/testing.md`; keep this file aligned when changing test layers or scope.
- Do not run broad checks, tests, builds, or preflight sweeps unless the user explicitly requests them in the current thread.
- For files you directly modify, use the smallest relevant check available.
- Keep Vitest coverage light and Node-only; do not add browser mode, DOM environments, or extension-runtime harnesses without an explicit product decision.
- Current narrow static validation:
  - `python3 -m json.tool data/usage.sample.json >/dev/null`
  - `python3 -m json.tool collector/extension/manifest.json >/dev/null`
  - `python3 -m json.tool package.json >/dev/null`
  - `node --check <changed-js-file>` for changed JavaScript
  - `node scripts/extension-check.mjs` for manifest and packaged extension asset shape
  - `node scripts/vendor-asset-check.mjs` for vendored Chart.js and icon asset consistency
  - `node scripts/release-artifact-check.mjs` for release-facing metadata and artifact guardrails
  - `node scripts/smoke-check.mjs` for static dashboard and sample-data assertions
  - `npm run test` for Node-only Vitest coverage of pure extension logic

## Browser Tool Hygiene

- Use Codex Browser / `@browser` for local visual checks of `collector/extension/dashboard.html` through a simple local fixture only when needed.
- Prefer file inspection, extension/background logs, storage snapshots, targeted console evidence, and narrow syntax checks before heavier browser automation.

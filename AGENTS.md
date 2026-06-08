# Agent Notes

Scope: whole repo.

- If `.maintainer/agent-notes.md` exists, read it first. It is ignored and may
  contain local maintainer preferences.
- Pace Pets is a local-only Chrome extension. Keep
  `collector/extension/dashboard.html` as the canonical app surface.
- Keep one canonical path. Remove obsolete paths when replacing behavior.
- Keep source shape small: one public concept per file, split by
  behavior/domain concept, not generic helper buckets. Prefer 150-250 lines per
  file, 30-70 lines per function, and cyclomatic complexity at or below 8;
  hard gates are 400 lines per file, 100 lines per function, complexity 10, and
  5 parameters.
- Do not add contributor/community process unless explicitly requested.
- Do not commit private/generated artifacts: `data/usage.json`,
  `.maintainer/`, Chrome Web Store working assets, local reports, logs, or
  screenshots.
- Do not store or log cookies, auth headers, access tokens, raw HTML, raw page
  text, raw network responses, screenshots, or account identifiers.
- Persist only normalized safe usage fields in `chrome.storage.local`; see
  `docs/reference/storage-schema.md`.
- Use code constants for product behavior. Do not add environment-variable
  controls for product behavior.
- Keep branches/PRs scoped to one clear concept. Use `codex/` branches by
  default.
- Do not bump extension version for docs, ignore rules, release guardrails, or
  ignored local files. Align `package.json`, `package-lock.json`, and
  `collector/extension/manifest.json` when the packaged extension changes.
- Follow `docs/guides/testing.md`. Use `npm run shape` for targeted source
  shape validation while developing; run broad checks/preflight only when
  explicitly requested in the current thread.
- Use browser verification only when diagnosing or debugging a specific issue,
  or when a code change directly affects browser-rendered behavior that needs
  investigation. Do not use browser confirmation as routine verification for
  ordinary code changes.
- Prefer runtime logs, extension storage evidence, and static checks over
  screenshot-only verification.

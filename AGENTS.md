# Agent Notes

Scope: whole repo.

- If `.maintainer/agent-notes.md` exists, read it first. It is ignored and may
  contain local maintainer preferences.
- Pace Pets is a local-only Chrome extension. Keep
  `collector/extension/dashboard.html` as the canonical app surface.
- Keep one canonical path. Remove obsolete paths when replacing behavior.
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
- Follow `docs/guides/testing.md`. Use targeted checks while developing; run
  broad checks/preflight only when explicitly requested in the current thread.
- Prefer runtime logs, extension storage evidence, and static checks over
  screenshot-only verification.

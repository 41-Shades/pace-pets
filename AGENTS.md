# Agent Notes

Scope: whole repo.

## Subagents

- Proactively use up to 10 subagents for independent work that can improve speed or quality.
- Keep ownership distinct; the root agent integrates and verifies.

- If `.maintainer/agent-notes.md` exists, read it first. It is ignored and may
  contain local maintainer preferences.
- Pace Pets is a local-only Chrome extension. Keep
  `collector/extension/dashboard.html` as the canonical app surface.
- Keep one public concept per file; split by behavior/domain, not generic helpers. Prefer 150-250 lines/file, 30-70 lines/function, and complexity ≤8; hard limits are 400, 100, 10, and 5 parameters.
- Do not add contributor/community process unless explicitly requested.
- Do not commit private/generated artifacts: `data/usage.json`,
  `.maintainer/`, Chrome Web Store working assets, local reports, logs, or
  screenshots.
- Do not store or log cookies, auth headers, access tokens, raw HTML, raw page
  text, raw network responses, screenshots, or account identifiers.
- Persist only normalized safe usage fields in `chrome.storage.local`; see
  `docs/reference/storage-schema.md`.
- Keep branches/PRs scoped to one clear concept. Use `codex/` branches by
  default.
- Do not bump extension version for docs, ignore rules, release guardrails, or
  ignored local files. Align `package.json`, `package-lock.json`, and
  `collector/extension/manifest.json` when the packaged extension changes.
- Keep version tags and GitHub Releases in sync. Every pushed `v<version>` tag
  for a packaged release must have a matching GitHub Release, and the newest
  shipped version must be marked Latest.
- Follow `docs/guides/testing.md`. The targeted source-shape command is
  `npm run shape`; full validation is `./scripts/chks`.
- Treat ignored `docs/plans/` files as temporary working records. After all work is resolved,
  promote current durable facts to the appropriate guide or reference, repair inbound links, and
  delete the completed plan; preserve plans that still contain active work or genuine blockers.

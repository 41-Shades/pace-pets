# Security

Pace Pets is an unofficial local-only Chrome extension. Security
reports should focus on the extension source, packaged assets, static
validation scripts, and documentation claims in this repository.

## Sensitive Data Boundaries

Do not include cookies, auth headers, access tokens, raw upstream responses,
raw HTML, raw page text, screenshots, account identifiers, or real usage
history in reports.

If a security issue appears to require sensitive evidence, first request a
private maintainer channel from the place where you received the extension.

## Supported Surface

The supported security posture is:

- Manifest V3 Chrome extension loaded from `collector/extension/`
- no hosted backend, telemetry, cloud sync, or account linking
- one current ChatGPT host permission matching runtime fetches
- local storage of normalized safe usage fields only
- no content scripts injected into ChatGPT pages

## Dependency And Upstream Notes

Chart.js is pinned in `package.json` and vendored into the extension runtime.
The collector also depends on undocumented browser-visible ChatGPT/Codex
endpoints, so endpoint changes may require source updates.

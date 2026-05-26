# Privacy

Pace Pets is an unofficial local-only Chrome extension. It has no
hosted backend, telemetry service, maintainer-controlled database, cloud sync,
or account-linking service.

## What The Extension Reads

- The extension uses the signed-in ChatGPT browser session in the current
  Chrome profile to request browser-visible ChatGPT/Codex usage status.
- During refresh, the extension may read a ChatGPT session token in memory so
  it can call the usage endpoint as the signed-in browser session.
- The extension does not inject code into ChatGPT pages.
- The extension does not read ChatGPT chats or page contents, and it does not
  capture screenshots.
- The extension does not request `tabs`, `activeTab`, `scripting`, or
  capture-related permissions such as `tabCapture` or `desktopCapture`.

## What The Extension Stores

Usage history is stored only in `chrome.storage.local` for the local extension
install. Stored samples are bounded by code constants and contain only:

- collection timestamps
- source and extension version markers
- supported usage-window keys
- remaining and used percentages
- reset timestamps
- window duration

The selected badge/dashboard usage window is also stored in
`chrome.storage.local`. The dashboard theme preference is stored in the
extension page's `localStorage`.

## What The Extension Does Not Store

The extension must not store cookies, auth headers, access tokens, raw upstream
responses, raw HTML, raw page text, screenshots, account identifiers, or
maintainer-visible copies of your usage history.

## Data Sharing

The extension sends requests only to the configured ChatGPT origin needed for
collection. It does not send usage history or preferences to the maintainer or
to a project-owned service.

## Upstream Fragility

The collector depends on undocumented ChatGPT/Codex web usage endpoints. If
those endpoints or response shapes change, the extension may require an update.

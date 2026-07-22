# Chrome Web Store Listing Copy

Status: operations reference.

This document mirrors the approved public copy in the Chrome Web Store
Developer Dashboard. Treat the dashboard as the operational source of truth
for store-facing product copy and keep this public mirror aligned before a
release. When the maintainer intentionally edits the dashboard, update this
document through the normal public docs workflow without bumping the extension
version.

Keep this copy aligned with `collector/extension/manifest.json`, `README.md`,
`PRIVACY.md`, `SECURITY.md`, and the dashboard info panel. Store-console-only
drafts, screenshots, and working assets stay out of git under
`data/chrome-web-store-assets/`.

Canonical listing URL:
[https://chromewebstore.google.com/detail/pace-pets/dgemeohjkjclceamjacmfneodafbcbdk](https://chromewebstore.google.com/detail/pace-pets/dgemeohjkjclceamjacmfneodafbcbdk)

Store item ID: `dgemeohjkjclceamjacmfneodafbcbdk`.

## Short Description

Tracks sanitized Codex usage history locally in your browser.

## Overview

Pace Pets helps manage Codex usage, with fun, animations, and utility.

See remaining usage, pace status, reset timing, and an extension toolbar badge
at a glance, with a little personality.

Your usage history stays local to your browser. Pace Pets has no server, no
telemetry, no account sync, and does not read your chats, page contents,
screenshots, or screen capture.

Pace Pets is an independent 41 Shades utility. It is not an OpenAI product and
is not affiliated with OpenAI. It relies on browser-visible ChatGPT/Codex usage
endpoints that may change.

## Alignment Notes

The short description should match the extension manifest description unless a
store field limit requires a shorter variant.

The privacy posture must remain backed by implementation and docs evidence
before it is changed in the store:

- `README.md` documents the local data boundary and stored fields.
- `PRIVACY.md` documents the public privacy posture.
- `docs/reference/storage-schema.md` documents normalized storage fields.
- `collector/extension/dashboard-info-template.js` owns the compact
  in-extension version of the local, source, and affiliation language.

Do not bump the extension version for listing-copy-only changes. Align
`package.json`, `package-lock.json`, and `collector/extension/manifest.json`
only when packaged extension behavior, assets, permissions, or release contents
change.

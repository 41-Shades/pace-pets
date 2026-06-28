# Chrome Web Store Listing Copy

Status: operations reference.

This document stores the preferred public Chrome Web Store listing copy for
Pace Pets. Treat this as the canonical source for store-facing product copy,
privacy posture, affiliation language, and source-risk wording.

Keep this copy aligned with `collector/extension/manifest.json`, `README.md`,
`PRIVACY.md`, `SECURITY.md`, and the dashboard info panel. Store-console-only
drafts, screenshots, and working assets stay out of git under
`data/chrome-web-store-assets/`.

Canonical listing URL:
[https://chromewebstore.google.com/detail/pace-pets/dgemeohjkjclceamjacmfneodafbcbdk](https://chromewebstore.google.com/detail/pace-pets/dgemeohjkjclceamjacmfneodafbcbdk)

Store item ID: `dgemeohjkjclceamjacmfneodafbcbdk`.

## Short Description

A playful Codex pace companion for usage, reset timing, and toolbar status.

## Overview

Pace Pets is a playful Chrome extension for keeping an eye on your Codex usage
while you work.

See remaining usage, pace status, reset timing, and a toolbar badge at a glance,
with a little animation and personality built in.

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

# Testing Guide

Status: internal guide.

## Summary

Testing in this repo is intentionally light, fast, and layered. The extension is
small enough that pure logic tests and static extension checks should carry most
of the confidence without adding browser, DOM, or extension-runtime automation.

These notes are maintainer and agent guidance. Public source, if published, is
an inspectable release artifact rather than an invitation to run a broad
community-contribution workflow.

## Check Layers

- `npm run lint:js` runs ESLint safety, style, and complexity guardrails for
  JavaScript source and repo scripts.
- `npm run test` runs Node-only Vitest tests for pure extension logic.
- `npm run smoke` runs lightweight static and sample-data assertions.
- `npm run lint:extension` validates manifest shape, packaged assets, CSP, local
  resource loading, and forbidden artifact patterns.
- `npm run lint:assets` validates vendored Chart.js output, app icon
  dimensions, and transparent default pace icon assets.
- `npm run lint:release` validates release-facing source metadata and public
  docs for private paths, sensitive artifacts, and version drift.
- `npm run check` runs format check, lint, extension checks, smoke checks, and
  Vitest tests.
- `npm run preflight` is the full local release gate and adds dependency audits.

## Vitest Scope

Vitest tests should stay focused on deterministic logic that can run in Node:

- usage payload normalization
- supported window selection
- history normalization, retention, dedupe, and compaction
- refresh status normalization
- small pure helpers extracted from extension scripts

Do not add browser mode, DOM environments, or extension-runtime test harnesses by
default. If a workflow genuinely needs browser coverage, make that a separate
explicit decision instead of growing the default test layer.

## Extension Safety Checks

Package and policy safety belong in scripts when the assertion is about the
extension bundle rather than a function result. Keep checks like these in
`scripts/extension-check.mjs` or similarly narrow scripts:

- Manifest V3 shape and permissions
- extension-page CSP
- no remote dashboard scripts or styles
- packaged asset presence
- forbidden raw usage, auth, screenshot, log, database, or dump artifacts
- vendored runtime assets matching pinned dependency output
- default theme asset presence and icon shape
- package, lockfile, and manifest version consistency
- public-facing docs staying free of internal planning links and local paths
- public artifact export-ignore rules for internal-only planning/report files

## Fixture Rules

Fixtures must be safe to publish. Do not add cookies, auth headers, access
tokens, raw upstream responses, raw HTML, raw page text, screenshots, account
identifiers, or local `data/usage.json` contents to tests or docs.

Prefer small inline fixtures that exercise one behavior clearly. If shared
fixtures become necessary, keep them sanitized and close to the tests that use
them.

# Testing Guide

Status: development reference.

## Summary

Testing in this repo is intentionally light, fast, and layered. The extension is
small enough that pure logic tests and static extension checks should carry most
of the confidence without adding browser, DOM, or extension-runtime automation.

These notes document the check layers used to keep the public source
inspectable without adding browser, DOM, or extension-runtime automation by
default.

## Check Layers

- `npm run lint:js` runs ESLint safety, style, and hard source-shape
  guardrails for JavaScript source and repo scripts.
- `npm run lint:css` runs Stylelint checks for CSS source.
- `npm run test` runs Node-only Vitest tests for pure extension logic.
- `npm run smoke` runs lightweight static and sample-data assertions.
- `npm run lint:extension` validates manifest shape, packaged assets, CSP, local
  resource loading, and forbidden artifact patterns.
- `npm run lint:assets` validates vendored Chart.js output, app icon
  dimensions, and transparent default pace icon assets.
- `npm run lint:release` validates release-facing source metadata and public
  docs for private paths, sensitive artifacts, and version drift.
- `npm run shape` blocks hard source-shape drift by running JavaScript
  complexity, function-length, parameter-count, and file-length gates, plus the
  maintained-source 400-line file-length scan.
- `npm run check` runs format check, the shape gate, static extension and
  release linting, smoke checks, and Vitest tests.
- `npm run preflight` is the full local release gate and adds dependency audits.

## Source Shape

Keep extension code sized for focused agent edits and human review. The
preferred range is 150-250 lines per file, 30-70 lines per function, and
cyclomatic complexity at or below 8. The hard gate blocks files over 400 lines,
functions over 100 lines, complexity over 10, and functions with more than 5
parameters. Generated outputs, vendored assets, dependency folders, and local
runtime artifacts stay out of the maintained-source scan.

## Generated Docs

`docs/reference/storage-schema.md` has a generated section sourced from the
safe sample fixture and runtime storage contracts. After changing storage
constants, supported usage windows, refresh status shape, history
normalization, or `data/usage.sample.json`, refresh that section with:

```sh
npm run docs:storage
```

`npm run smoke` includes the same freshness assertion as
`npm run docs:storage:check`, so stale generated storage docs fail during the
normal static smoke layer.

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

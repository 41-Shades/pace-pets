---
name: pace-pets-release
description: Release Pace Pets from reviewed public source through GitHub and the existing Chrome Web Store item. Use when the user invokes `$pace-pets-release` or asks to ship, publish, or resume a package-only Pace Pets release without changing Store copy, privacy, distribution, screenshots, or promotional assets.
---

# Pace Pets Release

Ship one traceable package from reviewed source. A bare invocation authorizes the delegated PR preparation, review, remediation, guarded merge, version, tag, checks, GitHub Release, Web Store ZIP upload, and automatic-on-approval submission. Invocation authorizes all in-scope actions across composed skills and tools; reconfirm only if scope changes or governing policy requires it.

## Fixed targets

- Repository: `41-Shades/pace-pets`
- Publisher: `41 Shades`
- Item ID: `dgemeohjkjclceamjacmfneodafbcbdk`
- Item dashboard: `https://chrome.google.com/webstore/devconsole/d2e94121-a679-4a8c-8b1a-975be3e608ad/dgemeohjkjclceamjacmfneodafbcbdk/edit`
- Package page: `https://chrome.google.com/webstore/devconsole/d2e94121-a679-4a8c-8b1a-975be3e608ad/dgemeohjkjclceamjacmfneodafbcbdk/edit/package`
- Store listing: `https://chrome.google.com/webstore/devconsole/d2e94121-a679-4a8c-8b1a-975be3e608ad/dgemeohjkjclceamjacmfneodafbcbdk/edit/listing`

Use Mac Computer Use targeting `com.google.Chrome` for every Web Store read and action. Navigate directly to these URLs; do not use the dashboard hamburger menu or browser automation. Prefer focused or incremental state; request a full app snapshot only to resolve missing context.

Inspect existing Chrome windows and tabs first and reuse a dashboard session verified as publisher `41 Shades`. Preserve that session's observed account routing when opening the item pages; never assume `/u/1/` identifies the publisher across Chrome profiles. Use the account-neutral URLs above when no verified dashboard session is open.

If redirected to sign-in or account recovery, check the other existing Chrome windows and profiles for the signed-in publisher session before reporting an access blocker. Never initiate or continue account recovery, reset credentials, or ask the user to complete recovery for a release. If no authorized session is accessible, ask the user to open the publisher dashboard in their signed-in Chrome profile.

## Read first

Read `AGENTS.md` and available `.maintainer/agent-notes.md` and `.maintainer/release-ops.md`. Load the listing mirror for Store comparison and `docs/operations/release-packaging.md` for packaging; reuse unchanged guidance across phases. Repository instructions are canonical; local notes may tighten them.

## Stop conditions

Stop and report the exact blocker when:

- The repository, publisher, item ID, release scope, or intended source is ambiguous.
- The tree has unrelated changes, `main` cannot fast-forward, reviewed source differs, or required checks fail.
- Package, lockfile, and manifest versions disagree; Store is newer; or a target tag/Release points elsewhere.
- For a new target, no packaged extension change exists since the latest shipped tag. Docs, guardrails, listing copy, and version-only changes are not a release.
- Package metadata, checksum, tag, commit, clean-tree evidence, permissions, or listing claims do not match.
- Store metadata or assets require changes, a different draft/submission exists, a blocking warning appears, or Chrome is signed into the wrong publisher.

Never bypass checks, rebuild after pushing the tag, replace the Store item, move published tags, edit Store fields, or upload anything except the generated ZIP.

## Release steps

### 1. Resolve scope and version

1. Confirm the repository and intended source, fetch `origin/main` and tags, and resolve the prior shipped version from the latest matching GitHub Release and remote annotated tag. For a new target, require packaged changes since that tag.
2. Read the published Store version and permissions from the Package page. Compare the dashboard description with `docs/operations/chrome-web-store-listing.md`; mirror intentional differences in the source PR without editing the dashboard.
3. Require aligned package, lockfile, and manifest versions. Use source when higher than Store; when equal, select the bump from `Version Selection` in the packaging guide and include it in the intended release PR. Stop if Store is higher. Skipped unshipped versions need no synthetic releases.
4. Resume an existing target only when tag, commit, Release, artifacts, and Store state match exactly.

### 2. Resolve reviewed source

1. Include source, required version, and listing-mirror changes before PR acceptance. Invoke `$pr-preflight-create` when a PR is needed. For a matching open PR, commit and push required updates with its owning preflight; any new commit requires fresh acceptance. If source is already merged, prepare only the outstanding changes through a new PR.
2. Invoke `$pr-accept-merge` for the matching PR; skip completed merges.
3. Fast-forward `main` to `origin/main`, verify the reviewed merge is contained in clean `HEAD`, and collect merged PRs since the prior shipped tag for release notes.

### 3. Package and publish GitHub Release

Follow `GitHub Tags And Releases` in `docs/operations/release-packaging.md`. It owns gate reuse, local tagging, single-build packaging, artifact verification, and GitHub publication. Carry forward the checked tree/runtime inputs, release commit, Release URL, and ZIP SHA-256.

### 4. Upload and submit the Store package

1. Open the direct Package page. Confirm publisher `41 Shades`, item ID, published version, and expected permissions.
2. Click `Upload new package` → `Select file` and choose only `pace-pets-chrome-extension-v<version>.zip`. Never choose the `.release.json`, `.zip.sha256`, an older ZIP, or a CRX.
3. Wait for processing, then confirm Draft shows the target version and unchanged expected permissions. Stop on any warning or divergence.
4. Open the direct Store listing URL. Do not change or resave any field.
5. Reconfirm publisher, item ID, and draft version. Click `Submit for review`.
6. Keep `Publish "Pace Pets" automatically after it has passed review` checked, unless the user explicitly requested staged publishing. Click `Submit For Review`.
7. Require the success confirmation, dismiss it, and verify `Status: Pending review` or the platform equivalent. Do not claim publication while review remains pending.

## Resume and report

Inspect state before mutating. Resume a matching release at its first incomplete phase, including Store approval verification; skip new-release preparation for completed phases. Never duplicate a merge, tag, Release, upload, or submission.

- If pending, report the submitted version and ask the user to invoke the skill after Google's approval notice.
- If approved with automatic publication, confirm the published Store version. If rejected, report Google's reason and stop.
- After publication, verify a separate Store-installed copy without disturbing an unpacked developer installation: expected permissions, dashboard launch, badge-view context menu, and only normalized safe fields from `docs/reference/storage-schema.md` in extension-local storage. Do not retain or log storage contents.
- Report PR provenance, release commit, version/tag, checks, ZIP SHA-256, GitHub Release URL, Store item, publication mode, and current Store status.

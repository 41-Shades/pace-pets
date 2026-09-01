---
name: pace-pets-release
description: Release Pace Pets from reviewed public source through GitHub and the existing Chrome Web Store item. Use when the user invokes `$pace-pets-release` or asks to ship, publish, or resume a package-only Pace Pets release without changing Store copy, privacy, distribution, screenshots, or promotional assets.
---

# Pace Pets Release

Ship one traceable package from reviewed source. A bare invocation authorizes the delegated PR preparation, review, remediation, guarded merge, version, tag, checks, GitHub Release, Web Store ZIP upload, and automatic-on-approval submission. Do not ask for duplicate confirmation when every gate passes.

## Fixed targets

- Repository: `41-Shades/pace-pets`
- Publisher: `41 Shades`
- Item ID: `dgemeohjkjclceamjacmfneodafbcbdk`
- Item dashboard: `https://chrome.google.com/u/1/webstore/devconsole/d2e94121-a679-4a8c-8b1a-975be3e608ad/dgemeohjkjclceamjacmfneodafbcbdk/edit`
- Package page: `https://chrome.google.com/u/1/webstore/devconsole/d2e94121-a679-4a8c-8b1a-975be3e608ad/dgemeohjkjclceamjacmfneodafbcbdk/edit/package`
- Store listing: `https://chrome.google.com/u/1/webstore/devconsole/d2e94121-a679-4a8c-8b1a-975be3e608ad/dgemeohjkjclceamjacmfneodafbcbdk/edit/listing`

Use Mac Computer Use targeting `com.google.Chrome` for every Web Store read and action. Navigate directly to these URLs; do not use the dashboard hamburger menu or browser automation.

## Read first

Read `AGENTS.md`, `docs/operations/release-packaging.md`, and `docs/operations/chrome-web-store-listing.md`. Also read `.maintainer/agent-notes.md` and `.maintainer/release-ops.md` when present. Repository instructions are canonical; local notes may tighten them.

## Stop conditions

Stop and report the exact blocker when:

- The repository, publisher, item ID, release scope, or intended source is ambiguous.
- The tree has unrelated changes, `main` cannot fast-forward, reviewed source differs, or required checks fail.
- Package, lockfile, and manifest versions disagree; Store is newer; or a target tag/Release points elsewhere.
- No packaged extension change exists since the latest shipped tag. Docs, guardrails, listing copy, and version-only changes are not a release.
- Package metadata, checksum, tag, commit, clean-tree evidence, permissions, or listing claims do not match.
- Store metadata or assets require changes, a different draft/submission exists, a blocking warning appears, or Chrome is signed into the wrong publisher.

Never bypass checks, rebuild after pushing the tag, replace the Store item, move published tags, edit Store fields, or upload anything except the generated ZIP.

## Release steps

### 1. Resolve reviewed source

1. If the intended release changes still need a PR, invoke `$pr-preflight-create`, then resume from the resulting PR.
2. Fetch `origin/main` and all tags. Confirm the clean checkout is Pace Pets.
3. Reuse a matching active PR at its current head and invoke `$pr-accept-merge`; if the intended PR is already merged, continue.
4. Switch to `main`, fast-forward to `origin/main`, and verify the intended merge is contained in clean `HEAD`.
5. Resolve the prior shipped version from the latest matching GitHub Release and remote annotated tag. Collect merged PRs since that tag for provenance and notes.
6. Compare the dashboard description with `docs/operations/chrome-web-store-listing.md`. If an intentional dashboard description is not mirrored, fix the mirror in a separate docs-only PR before releasing. Do not edit the dashboard from repository text.

### 2. Resolve version

1. Read the published Store version from the direct Package page.
2. Require matching versions in `package.json`, root and package entries of `package-lock.json`, and `collector/extension/manifest.json`.
3. Use the aligned source version when it is higher than Store. Skipped unshipped numbers need no synthetic releases.
4. When source equals Store and packaged changes exist, make the smallest patch bump in those canonical files through a scoped PR, merge it, and fast-forward `main`.
5. Stop if Store is higher. Resume an existing target only when tag, commit, Release, artifacts, and Store state match exactly.

### 3. Tag, check, and package

1. Create annotated local tag `v<version>` on exact clean `HEAD`; do not push yet.
2. Run `./scripts/chks`. Invoking this skill authorizes the full release gate.
3. Run `npm run package:extension` exactly once.
4. Inspect:
   - `dist/pace-pets-chrome-extension-v<version>.zip`
   - `dist/pace-pets-chrome-extension-v<version>.release.json`
   - `dist/pace-pets-chrome-extension-v<version>.zip.sha256`
5. Verify ZIP checksum and allowlisted contents. Require exact version, commit, `gitTag`, clean-tree flag, filename, and SHA-256 in the release JSON.

### 4. Publish GitHub Release

1. Push the tag only after inspection succeeds.
2. Create the GitHub Release from that tag, generate notes from the prior shipped tag, attach all three artifacts, and mark it Latest.
3. Verify remote tag commit, Latest status, artifact names, sizes, and available digests. Record the Release URL and ZIP SHA-256. Do not regenerate artifacts.

### 5. Upload and submit the Store package

1. Open the direct Package page. Confirm publisher `41 Shades`, item ID, published version, and expected permissions.
2. Click `Upload new package` → `Select file` and choose only `pace-pets-chrome-extension-v<version>.zip`. Never choose the `.release.json`, `.zip.sha256`, an older ZIP, or a CRX.
3. Wait for processing, then confirm Draft shows the target version and unchanged expected permissions. Stop on any warning or divergence.
4. Open the direct Store listing URL. Do not change or resave any field.
5. Reconfirm publisher, item ID, and draft version. Click `Submit for review`.
6. Keep `Publish "Pace Pets" automatically after it has passed review` checked, unless the user explicitly requested staged publishing. Click `Submit For Review`.
7. Require the success confirmation, dismiss it, and verify `Status: Pending review` or the platform equivalent. Do not claim publication while review remains pending.

## Resume and report

Inspect state before mutating. Never duplicate a merge, tag, Release, upload, or submission.

- If pending, report the submitted version and ask the user to invoke the skill after Google's approval notice.
- If approved with automatic publication, confirm the published Store version. If rejected, report Google's reason and stop.
- After publication, verify a separate Store-installed copy without disturbing an unpacked developer installation: expected permissions, dashboard launch, badge-view context menu, and only normalized safe fields from `docs/reference/storage-schema.md` in extension-local storage. Do not retain or log storage contents.
- Report PR provenance, release commit, version/tag, checks, ZIP SHA-256, GitHub Release URL, Store item, publication mode, and current Store status.

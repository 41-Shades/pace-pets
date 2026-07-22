---
name: pace-pets-release
description: Release Pace Pets from a clean reviewed pull request through GitHub and the existing Chrome Web Store item using the repository's canonical package workflow. Use when the user invokes `$pace-pets-release` or explicitly asks to ship, publish, or resume a package-only Pace Pets release without changing store copy, privacy declarations, distribution, screenshots, or promotional assets.
---

# Pace Pets Release

Ship one traceable Pace Pets package from reviewed public source. Treat a bare invocation or an explicit ship/publish request as authorization for the normal merge, version, tag, GitHub Release, Web Store upload, and automatic-on-approval submission sequence. Do not ask for duplicate confirmation when all gates pass.

## Establish The Contract

- Work only in the public `41-Shades/pace-pets` repository and existing Web Store item `dgemeohjkjclceamjacmfneodafbcbdk`.
- Read repository `AGENTS.md`, `docs/operations/release-packaging.md`, and `docs/operations/chrome-web-store-listing.md` before acting. When `.maintainer/agent-notes.md` or `.maintainer/release-ops.md` exists, read it too. Treat tracked repository instructions as canonical; local maintainer notes may add constraints but must not loosen them.
- Fetch `origin/main` and all remote tags before resolving release state. Treat matching GitHub Releases, not the checkout's preexisting local refs, as authoritative for shipped versions.
- Use Mac Computer Use targeting `com.google.Chrome` for every Chrome Web Store dashboard read and action. Do not initialize Chrome browser automation for `chrome.google.com` Developer Dashboard pages.
- Treat the dashboard description as the operational source of truth. Require `docs/operations/chrome-web-store-listing.md` to mirror its approved copy before release; preserve privacy, distribution, support, test-instruction, screenshot, and promotional-asset fields.
- Upload only the generated extension ZIP to the Web Store. Attach the ZIP, release JSON, and SHA-256 file to the matching GitHub Release.
- Select automatic publication after approval. If the user explicitly requests staged/deferred publishing, honor that instead and report that a later manual publish action remains.
- Make the workflow resumable. Inspect existing PR, tag, release, package, and Web Store state before new-release gates or mutations. When a matching release is pending, approved, or published, jump to section 6; reuse only when provenance matches exactly.

## Stop Conditions

Stop and report the exact blocker without broadening scope when any of these is true:

- The repository identity, target store item, or release scope is ambiguous. A clean fetched `main` ahead of the latest shipped tag is valid release source and does not require one active PR.
- The working tree contains unrelated changes, local `main` cannot fast-forward, or reviewed source differs from the intended release source.
- PR checks or the release gate substantively fail. Retry the unchanged command with required access when failure is solely a sandbox, filesystem-permission, registry, or network restriction; never bypass a failing check or change product code merely to force a release through.
- Package, lockfile, and manifest versions disagree; the Store version is newer than public source; or an existing target tag or GitHub Release points elsewhere.
- When initiating a new release, the commits since the prior shipped tag contain no package-affecting extension change beyond version files. Stop with “nothing to release” instead of manufacturing a package update; do not apply this condition while resuming a matching release or submission.
- Packaged permissions, privacy behavior, listing claims, or user-visible surfaces require Store metadata or image changes.
- The Web Store has a concrete pending package, privacy, distribution, test-instruction, or asset change that cannot be proven to belong to this release. Do not treat the dashboard's generic Draft section or “This draft is unpublished” label alone as evidence of a pending change.
- The package metadata, checksum, file list, exact tag, commit, or clean-tree evidence does not match.
- Chrome is not signed into the correct publisher, the dashboard reports blocking warnings, or submission would affect a different item.

Do not delete or move published tags or releases automatically. Do not create a replacement Store item, rebuild after publishing the tag, change permissions, or edit listing fields under this skill.

## 1. Resolve And Merge The Reviewed PR

1. Confirm the checkout is the Pace Pets repository and the tree is clean.
2. If the active branch has an open PR, confirm its base is `main` and its changes match the package release the user requested. Wait for required checks, then merge with the repository's normal merge method only when green; do not delete local branches as part of the release.
3. If the active-branch PR is already merged, continue without recreating or modifying it.
4. If the checkout is already on clean `main`, use fetched `origin/main` as the reviewed release source when it is ahead of the latest shipped tag. Collect the merged PRs since that tag for provenance and release notes; do not require one intended PR.
5. Fetch `origin/main` and all remote tags, switch to local `main`, and fast-forward it to `origin/main`. Confirm any just-merged PR commit is contained in `HEAD` and the tree remains clean.
6. Resolve the prior shipped tag from the latest matching GitHub Release and require that annotated tag to exist remotely. If no matching shipped Release and tag pair exists, stop because first-release bootstrapping is outside this existing-item workflow. For a new release, compare the release source with that tag. Require a runtime, packaged asset, permission, or other release-content change beyond the canonical version files; docs, release guardrails, listing copy, and version-only changes do not justify a Store package. Skip this content-change gate when resuming a matching release or submission.
7. Read the dashboard description with Mac Computer Use and compare it with `docs/operations/chrome-web-store-listing.md`. If an intentional dashboard edit is not mirrored, create a scoped docs-only branch and PR that copies the dashboard text exactly, run the targeted release lint, merge after green checks, and fast-forward `main` again. Do not bump the extension version or edit the dashboard from repository text.

## 2. Resolve The Version

1. Read the published version from the existing item's Package or Status page in the signed-in dashboard.
2. Read and compare the versions in `package.json`, `package-lock.json` (root and package entry), and `collector/extension/manifest.json`.
3. If the aligned source version is greater than the published Store version, use it as the target version. Skipped unshipped version numbers do not need synthetic tags or releases.
4. If the aligned source version equals the Store version and section 1 confirmed package-affecting changes, create a scoped `codex/prepare-<next-version>-release` branch for the smallest next patch version. Update only the required version entries in the three canonical files, commit, push, open a release-bump PR, wait for green checks, merge it, and fast-forward local `main` again. If no package-affecting changes exist, stop with “nothing to release.”
5. If the Store version is greater than source, stop; public-source and release provenance must be reconciled first.
6. Confirm no conflicting local tag, remote tag, or GitHub Release exists for `v<version>`. Resume an existing release only when its tag, commit, and artifacts match the intended release exactly.

## 3. Tag, Gate, And Package

1. Create the annotated local `v<version>` tag on the exact clean release commit. Do not push it yet.
2. Run the full repository release gate with `./scripts/chks`. Invocation of this skill is the user's explicit authorization for the broad release gate.
3. Run `npm run package:extension` once from that clean, locally tagged commit.
4. Inspect the generated files under `dist/`:
   - `pace-pets-chrome-extension-v<version>.zip`
   - `pace-pets-chrome-extension-v<version>.release.json`
   - `pace-pets-chrome-extension-v<version>.zip.sha256`
5. Verify the checksum from the directory containing the ZIP. Inspect the ZIP file list and release JSON.
6. Require the intended version, exact commit, `gitTag: "v<version>"`, `workingTreeClean: true`, matching filename, matching SHA-256, and the repository's expected allowlisted extension contents.

## 4. Publish The GitHub Release

1. Push the release tag only after artifact inspection succeeds. Push the release commit first only if the version-bump merge has not already made it reachable from `origin/main`.
2. Create the matching GitHub Release from the existing tag, generate notes from the prior shipped tag, attach all three inspected artifacts, and mark the new shipped release Latest.
3. Verify the remote annotated tag resolves to the release commit, the new release is Latest, and all three uploaded artifact names, sizes, and available digests match the inspected local files. Record the release URL and ZIP checksum. Do not regenerate the artifacts after this point.

## 5. Submit The Existing Web Store Item

1. Use Mac Computer Use with Google Chrome and navigate directly to the existing item's exact dashboard URL. Confirm publisher `41 Shades` and item ID `dgemeohjkjclceamjacmfneodafbcbdk`; reconfirm both after any Chrome profile, window, or tab-context change.
2. Inspect Status, Package, Store Listing, and their actual field values before upload. Inspect Privacy, Distribution, and Test instructions only when permissions, data handling, distribution, access requirements, or reviewer setup changed; also inspect them when a dashboard warning or concrete draft divergence requires investigation. A generic Draft section is normal and is not a blocker. Accept an intentional saved or unsaved description when it matches the repository mirror exactly. If Save draft is enabled and the description is the only changed field, save it and verify the saved value; stop on a different draft package, active submission, or any other field divergence.
3. Open Package and upload the exact inspected `.zip`; never upload the release JSON or checksum file.
4. Confirm the dashboard recognizes the intended higher manifest version and that the package introduces no unexpected permission or policy warning.
5. Do not edit Store Listing fields. Apart from saving an exact mirrored description under step 2, do not resave or change Privacy, Distribution, Test instructions, support metadata, screenshots, tiles, or video fields.
6. Reconfirm the publisher, item ID, and draft version immediately before submission. Submit for review with automatic publication after approval enabled. If the user requested deferred publishing, disable automatic publication instead.
7. Confirm the resulting item state is pending review or the platform's equivalent. Do not claim it is published while review remains pending.

## 6. Resume And Report

- On a repeated invocation, inspect state first. Do not duplicate a merge, tag, GitHub Release, upload, or submission.
- If review is pending, report that state and the submitted version without resubmitting. State that post-publication verification remains and ask the user to invoke the skill again after Google's approval notice.
- If approved and automatic publishing was selected, confirm the published Store version when available. If rejected, report Google's reason and stop; remediation is a separate scoped task.
- After publication, verify a Store-installed copy without disturbing an unpacked developer installation: confirm only the expected permissions, open the dashboard from the toolbar icon, exercise the badge-view context menu, and inspect extension-local storage for only the normalized safe fields documented in `docs/reference/storage-schema.md`. Do not disable, replace, or uninstall an unpacked copy; ask which Chrome profile to use if no separate Store-installed test copy is available. Do not retain or log storage contents. Stop and report any unexpected permission, behavior, or stored field.
- Report the active or just-merged PR when one exists; otherwise report the merged PR range since the prior shipped tag. Also report the release commit, version, tag, checks, artifact SHA-256, GitHub Release URL, Web Store item, submission mode, and current Store status.

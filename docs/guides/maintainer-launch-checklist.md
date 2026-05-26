# Maintainer Launch Checklist

Status: maintainer-facing release checklist.

Use this checklist before publishing source, creating a release, or submitting Pace Pets to the Chrome Web Store. The private working repo stays private; `41-Shades/pace-pets` is created as a private public-candidate repo from a reviewed clean export, then flipped public only after the release gate passes.

## Launch Defaults

- Public product name: `Pace Pets`.
- Public repo/package name: `41-Shades/pace-pets`.
- License: `MIT`.
- First public release version: `1.0.0`.
- Chrome Web Store visibility: start `Unlisted`, then switch to `Public` after the listing and support flow are proven.
- Distribution posture: public-candidate repo private first, public source before Web Store submission, Web Store package from the matching public source tag.
- Privacy posture: no telemetry, no backend, no cloud sync, no account linking, no maintainer-controlled data collection.
- Page-access posture: no ChatGPT page injection, chat-content reading, page-content reading, screenshot capture, or `tabs`/`activeTab`/`scripting`/`tabCapture`/`desktopCapture` permission.
- Affiliation language: describe Codex only as the product this utility works with; state that Pace Pets is unofficial and not affiliated with OpenAI.
- Maintenance posture: maintainer-led public source. Users may inspect, copy, fork, and adapt the code under the MIT license, but the project does not promise a contributor workflow, governance process, feature request review, or pull request acceptance.

## 1. Confirm Ownership

- Use the `41-Shades` GitHub organization and final repo URL for `pace-pets`.
- Decide the Chrome Web Store developer account that will own the listing.
- Decide the support contact shown in the store listing.
- Decide the privacy policy URL. Prefer the public repo `PRIVACY.md` URL until there is a dedicated hosted policy page.
- Confirm whether the dashboard's `41 Shades` links are the final public publisher identity.
- Confirm who will handle future upstream-breakage updates if ChatGPT/Codex usage endpoints change.

Do not submit to the Chrome Web Store until these values are final enough to publish.

## 2. Prepare The Private Working Repo

- Confirm the work intended for release is committed on the private repo branch or tag chosen as the export source.
- Confirm `package.json`, `package-lock.json`, and `collector/extension/manifest.json` use the same current private version before export.
- Confirm `README.md`, `PRIVACY.md`, `SECURITY.md`, and `LICENSE` are present and current.
- Confirm `docs/reference/storage-schema.md` matches the generated storage-schema source.
- Confirm generated/private usage data is not tracked, especially `data/usage.json`.
- Confirm internal-only files are excluded from the clean export by `.gitattributes`.

Recommended release checks when intentionally doing a release pass:

```sh
npm run docs:storage:check
npm run lint:release
node scripts/extension-check.mjs
node scripts/vendor-asset-check.mjs
node scripts/smoke-check.mjs
npm run test
```

Run broader checks such as `npm run check`, `npm run security:check`, or `npm run preflight` only as an intentional release verification pass.

## 3. Create The Clean Public Source Export

- Follow the [Clean Public Export Workflow](clean-public-export.md).
- Review the exported file tree before initializing or pushing the public-candidate repo.
- Confirm the export has no private repo history.
- Confirm the export does not include local generated data, internal-only workspace files, private plans, local reports, or `.codex` content.
- Confirm public docs do not link users to internal planning notes or private-only workflows.

## 4. Create The Private Public-Candidate GitHub Repo

- Create a new empty private GitHub repo at `41-Shades/pace-pets`.
- Do not initialize the GitHub repo with a README, license, or `.gitignore`; the clean export already contains the source files.
- Create the initial public-candidate commit from the reviewed export.
- Push the initial branch.
- Confirm the private public-candidate repo renders the README, license, privacy doc, security doc, and maintainer docs correctly.
- Confirm the repo description says this is an unofficial local-only Chrome extension for sanitized Codex usage pace.
- Confirm the README describes the project as maintainer-led public source rather than a community contribution project.
- Configure lightweight protection for `main` before changing visibility: require the CI status check before merge, block force pushes, and block branch deletion.
- Do not use this repo as a scratchpad; only push public-candidate source and release artifacts.

## 5. Tag And Verify The Public-Candidate Source Release

- For the first public release, bump `package.json`, `package-lock.json`, and `collector/extension/manifest.json` to `1.0.0` in the private public-candidate repo.
- Create a source tag that matches the manifest/package version, such as `v1.0.0`.
- Confirm the tag points to the source tree intended for the Chrome Web Store package.
- Keep `package.json`, `package-lock.json`, and `collector/extension/manifest.json` on the same version.
- Create a GitHub release from that tag while the repo is still private if you want one more review gate.
- Attach the Chrome Web Store zip, `.zip.sha256`, and `.release.json` files created by the packaging workflow.

## 6. Package The Extension

From the source tag that will be made public and submitted to the Chrome Web Store, run:

```sh
npm run package:extension
```

The script creates:

- `dist/pace-pets-chrome-extension-v<version>.zip`
- `dist/pace-pets-chrome-extension-v<version>.zip.sha256`
- `dist/pace-pets-chrome-extension-v<version>.release.json`

It runs the extension and vendored-asset checks first, verifies package and manifest version/name alignment, excludes source-only extension docs, rejects private/generated artifact patterns, records the source Git commit/tag, and writes the zip checksum.

Inspect the zip file list before uploading it:

```sh
unzip -l dist/pace-pets-chrome-extension-v<version>.zip
```

The submitted zip should contain `manifest.json`, extension JavaScript, CSS, HTML, local app icons, local pace icons, theme metadata, and local vendored Chart.js at the zip root. It should not contain repo-only docs, source-control metadata, generated private data, local reports, maintainer-only workspace files, or `collector/extension/README.md`.

Do not submit the package unless the `.release.json` file says `workingTreeClean` is `true` and `gitTag` is `v<version>`.

## 7. Flip Source Public

- Confirm the private `41-Shades/pace-pets` repo contains only public-candidate source and release artifacts.
- Confirm the package was built from the matching tag in that repo.
- Confirm `main` protection or a ruleset is active before changing visibility.
- Confirm owner, support contact, privacy policy URL, and publisher identity are ready to be public.
- In GitHub repository settings, change `41-Shades/pace-pets` from private to public.
- After the flip, confirm unauthenticated users can see the README, license, privacy doc, security doc, release tag, and intended release artifacts.

## 8. Prepare Chrome Web Store Listing

- Listing name: `Pace Pets`.
- Short description: describe local sanitized Codex usage pace tracking.
- Long description: explain local-only operation, signed-in ChatGPT browser session use, unsupported upstream endpoint dependency, and no maintainer-controlled data collection.
- Version: use the version from the public source tag, `package.json`, and `collector/extension/manifest.json`.
- Category: choose the closest productivity/developer-tool category available in the Chrome Web Store form.
- Visibility: start `Unlisted`.
- Support contact: use the public support contact chosen in step 1.
- Privacy policy URL: use the chosen public privacy URL.
- Screenshots: capture the real extension dashboard from a safe sample/local state, not private user data.
- Permission rationale:
  - `storage`: stores bounded normalized usage history and local preferences in Chrome extension storage.
  - `alarms`: refreshes usage periodically.
  - `contextMenus`: lets users choose the toolbar badge view.
  - `https://chatgpt.com/*`: calls browser-visible ChatGPT/Codex usage endpoints as the signed-in user.
- Privacy practices: no telemetry, no backend, no cloud sync, no account linking, no sale or sharing of user data.
- Page-access practices: no ChatGPT chat reading, page-content reading, screenshot capture, content script, or `tabs`/`activeTab`/`scripting`/`tabCapture`/`desktopCapture` permission.
- Affiliation language: state that Pace Pets is unofficial and not affiliated with OpenAI.

## 9. Submit And Verify

- Submit the package from the public source tag.
- Install from the Web Store tester or unlisted link after review.
- Confirm the extension requests only the expected permissions.
- Confirm clicking the toolbar icon opens the dashboard.
- Confirm the badge-view context menu works.
- Confirm the dashboard and badge store only normalized safe fields in `chrome.storage.local`.
- Confirm no cookies, auth headers, access tokens, raw upstream responses, raw HTML, raw page text, screenshots, or account identifiers are stored or logged.
- Link the Web Store listing back to the public source repo and privacy policy wherever the listing allows.

## Stop Conditions

Stop the launch if any of these are true:

- The export contains private repo history or internal-only files.
- The package contains generated private usage data, local reports, source-control metadata, or workspace-only files.
- The store listing claims a privacy behavior that is not true in the implementation.
- The package version cannot be traced back to a public source tag.
- The publisher identity, support contact, or privacy policy URL is not ready to publish.

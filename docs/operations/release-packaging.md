# Release Packaging

Status: operations reference.

Pace Pets is a local-only Chrome extension with a Chrome Web Store listing and
public-source unpacked install path. Release packaging is only for a Chrome Web
Store or equivalent extension zip artifact; routine local development should
load `collector/extension/` directly as an unpacked extension.

## Chrome Web Store Listing

Canonical listing URL:
[https://chromewebstore.google.com/detail/pace-pets/dgemeohjkjclceamjacmfneodafbcbdk](https://chromewebstore.google.com/detail/pace-pets/dgemeohjkjclceamjacmfneodafbcbdk)

Store item ID: `dgemeohjkjclceamjacmfneodafbcbdk`.

Preferred store-facing copy is tracked in
[Chrome Web Store Listing Copy](chrome-web-store-listing.md). Keep store
console text aligned with that document, and keep the document aligned with the
manifest, README, privacy policy, security policy, storage schema, and
dashboard info panel.

Use the canonical slug URL in public docs and release notes. Do not use Chrome
share URLs with tracking query parameters such as `utm_source=item-share-cb`.
The ID-only URL redirects to the canonical slug URL.

## Package Command

`npm run package:extension` runs `scripts/package-extension.mjs`.

The script creates these ignored files under `dist/`:

- `pace-pets-chrome-extension-v<version>.zip`
- `pace-pets-chrome-extension-v<version>.release.json`
- `pace-pets-chrome-extension-v<version>.zip.sha256`

The package script runs `scripts/extension-check.mjs` and
`scripts/vendor-asset-check.mjs` before writing artifacts. It also verifies that
`package.json` and `collector/extension/manifest.json` agree on the extension
version.

## Zip Contents

The zip root contains one explicit release allowlist derived from the manifest,
background/dashboard runtime script lists, dashboard HTML styles and bootstrap
scripts, the default theme asset manifest, and the configured audio clip
registry. Files merely present under `collector/extension/` are not packaged.
This keeps the source-only extension `README.md`, unpacked developer controls,
inactive extracted artwork, ignored files, and unrelated local artifacts out of
release packages by construction.

Packaged files are limited to extension runtime assets with these extensions:

- `.css`
- `.html`
- `.js`
- `.json`
- `.map`
- `.m4a`
- `.png`

Every allowlisted path must exist as a regular extension-local file. The package
script also rejects private, generated, or sensitive-looking allowlisted paths
such as raw usage data, cookies, tokens, session material, screenshots,
databases, dumps, logs, archives, hidden files, `data/`, `docs`, `scripts`,
`tests`, `node_modules`, and `dist`.

Package text files are also scanned for local user-profile paths, concrete
bearer headers, and private key material.

## Reproducibility And Metadata

The generated zip uses sorted entries, deflate compression, regular file mode,
and a fixed zip entry timestamp of `2024-01-01T00:00:00.000Z`.

The release metadata records:

- package name
- extension name
- manifest version
- zip filename
- zip SHA-256
- fixed zip entry timestamp
- packaged file count
- git commit
- exact git tag when present
- whether the working tree was clean

The package script warns when the working tree has uncommitted changes or when
`HEAD` is not tagged as `v<manifest version>`.

## GitHub Tags And Releases

Keep version tags and GitHub Releases in sync. Every pushed `v<version>` tag for
a packaged release must have a matching GitHub Release created from that exact
tag, and the newest shipped version must be marked Latest.

When publishing a release:

1. Push the `v<version>` tag to GitHub.
2. Create the matching GitHub Release from that existing tag.
3. Use generated release notes with the previous release tag as the start tag.
4. Attach package artifacts to the GitHub Release when the release includes a
   distributable zip.
5. Confirm GitHub shows the intended newest shipped version as Latest.

## Public Source Guardrails

`scripts/release-artifact-check.mjs` validates the public source before a
release-facing workflow. It checks version alignment across `package.json`,
`package-lock.json`, and `collector/extension/manifest.json`; release-safe
tracked paths; sensitive tracked text; public-surface planning links;
`.gitattributes` export-ignore entries; and `.gitignore` entries for
private/generated local artifacts.

The public-surface content scan covers release-facing docs and source paths:
`README.md`, policy docs, package metadata, `collector/extension/`,
`data/usage.sample.json`, `docs/guides/`, `docs/operations/`,
`docs/reference/`, docs HTML/CSS, repo scripts, lint configs, and GitHub
workflow files. That scan blocks links to ignored internal planning docs and
concrete bearer headers. All tracked text is also scanned for local user-profile
paths and private key material.

Current export-ignore and gitignore policy keeps these internal or local paths
out of public source archives or tracked source:

- `.codex/`
- `.maintainer/`
- `docs/plans/`
- `data/chrome-web-store-assets/`
- `data/usage.json`
- ignored maintainer-only guide files
- local reports such as `security_best_practices_report.md`

Do not bump the extension version for docs-only changes. Align
`package.json`, `package-lock.json`, and `collector/extension/manifest.json`
only when the packaged extension behavior, assets, permissions, or release
contents change.

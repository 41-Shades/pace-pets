# Clean Public Export Workflow

Status: maintainer-facing workflow.

Use this workflow to create the future public `41-Shades/pace-pets` repository while keeping the private working repo private. Create the destination repo as a private public-candidate repo first, review it there, then flip that new repo public only after the release gate passes. Do not flip the private working repo public.

## Chosen Export Method

Use `git archive` from a clean committed private repo ref, then review the exported directory before initializing the new public-candidate Git repository.

This method has three properties we want:

- It creates a source tree without private Git history.
- It honors `.gitattributes` `export-ignore` rules.
- It lets the maintainer review the public file tree before the first public-candidate commit.

`.gitattributes` is a guardrail, not the whole release process. The exported files still need a human review before the public-candidate repo is created.

## Inputs

- Private source ref: the private branch, commit, or tag chosen for public release.
- Public-candidate repo name: `pace-pets`.
- Public product name: `Pace Pets`.
- Public GitHub owner: `41-Shades`.
- Private source version: the current version in `package.json`, `package-lock.json`, and `collector/extension/manifest.json`.
- First public release version: bump the public-candidate repo to `1.0.0` before tagging and packaging the first release.

## Required Exclusions

The public export must not include:

- Private Git history.
- `.codex` files or skills.
- Internal-only planning notes.
- Local security-review reports with machine-specific paths.
- Generated private usage data such as `data/usage.json`.
- Cookies, auth headers, access tokens, raw upstream responses, raw HTML, raw page text, screenshots, account identifiers, logs, databases, or local dumps.
- Any local machine absolute paths.

The export may include:

- Extension source in `collector/extension/`.
- Public docs in `README.md`, `PRIVACY.md`, `SECURITY.md`, `LICENSE`, and public docs folders.
- Safe sample data in `data/usage.sample.json`.
- Release/static validation scripts.
- Node-only tests for deterministic extension logic.
- Vendored local runtime assets required by the extension.

The public-candidate repo should be maintainer-led public source, not a community contribution project. Do not add contributor workflows, issue templates, governance docs, or community process unless that becomes an explicit product decision later.

## Private Repo Preparation

From the private working repo:

```sh
git status --short
npm run docs:storage:check
npm run lint:release
```

Before exporting, resolve any unexpected worktree changes or release-artifact failures. If broader release verification is desired, run it intentionally before choosing the export ref.

## Create The Export

From the private working repo at the chosen release ref:

```sh
git archive --format=tar --output ../pace-pets-public-source.tar HEAD
mkdir ../pace-pets-public-review
tar -xf ../pace-pets-public-source.tar -C ../pace-pets-public-review
```

If exporting from a named release ref instead of `HEAD`, replace `HEAD` with that branch, commit, or tag.

## Review The Exported Tree

In the exported review directory:

```sh
find . -maxdepth 3 -type f | sort
```

Review the file list and public text before creating the public-candidate repo.

Required confirmations:

- `README.md`, `PRIVACY.md`, `SECURITY.md`, `LICENSE`, `package.json`, and `collector/extension/manifest.json` are present.
- `collector/extension/` contains the extension runtime files and required local assets.
- `data/usage.sample.json` is present and `data/usage.json` is absent.
- Internal-only workspace files are absent.
- Internal-only planning notes are absent.
- Local security reports are absent.
- No `.git` directory exists yet.
- No `.codex` content is present.
- Public docs do not direct users to private-only files or workflows.

Targeted text searches for the review directory:

```sh
rg -n "/[U]sers/|/[hH]ome/|[A-Za-z]:[\\\\/]Users[\\\\/]|Bearer|access_token|refresh_token|data/usage.json|security_best_practices_report|\\.codex" .
```

Investigate every match. Some literal safety-boundary mentions may be acceptable; real secrets, local paths, or internal-only file references are not.

## Create The Private Public-Candidate Repo

Only after the export review passes:

1. Create a new empty private GitHub repo at `41-Shades/pace-pets`.
2. Do not initialize it with a README, license, or `.gitignore`.
3. Initialize Git in the reviewed export directory and push the initial commit.

```sh
git init
git checkout -b main
git add .
git commit -m "Initial public release"
git remote add origin git@github.com:41-Shades/pace-pets.git
git push -u origin main
```

This repo remains private until the final public-release gate passes. Treat it as public-candidate only: do not use it for rough experiments, internal notes, or private working files.

## Verify The Private Public-Candidate Repo

Before changing visibility to public:

- Confirm the GitHub repo renders the README, license, privacy doc, security doc, and maintainer docs correctly.
- Confirm the repo contains fresh public-candidate history only.
- Confirm no `.codex`, internal plans, local reports, generated private usage data, or local absolute paths are present.
- Run the release checks from that repo.
- Run the package workflow from that repo.
- Confirm the generated `.release.json` records a clean worktree and the expected release tag before Web Store submission.
- Configure lightweight `main` protection or a ruleset before changing visibility: require CI before merge, block force pushes, and block branch deletion.

## Tag The Public-Candidate Source

After the public-candidate repo is pushed:

```sh
git tag v<version>
git push origin v<version>
```

Use the same version as `package.json` and `collector/extension/manifest.json`. For the first public release, that version should be `1.0.0`.
The Chrome Web Store package should be built from this tagged public-candidate source, and the generated `.release.json` file should point back to this tag and commit.

## Flip To Public

Only after the private public-candidate repo passes the review, checks, package, metadata, branch-protection, and identity gates, change `41-Shades/pace-pets` from private to public in GitHub repository settings.

After the flip:

- Confirm unauthenticated users can see the README, license, privacy doc, security doc, tag, and release artifacts intended for publication.
- Confirm the package intended for Chrome Web Store submission was built from the public tag.
- Do not add unpublished internal files to the public repo after the flip.

## After The Public Repo Exists

- Build Web Store packages from the public-candidate repo/tag, and submit them only after the matching source/tag is public.
- Keep the private repo as the playground/incubator.
- Copy future public-ready changes forward intentionally through the same export/review discipline or through targeted public commits.
- Keep the repo maintainer-led. Do not add contributor workflows, issue templates, governance docs, or community process unless that becomes an explicit product decision.

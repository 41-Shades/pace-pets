# Pace Pets

Local-only Chrome extension for displaying sanitized Codex usage, pace, and reset timing.

This is an unofficial utility. It is not affiliated with OpenAI, and it depends on browser-visible ChatGPT/Codex usage endpoints that may change.

Chrome Web Store listing:
[Pace Pets](https://chromewebstore.google.com/detail/pace-pets/dgemeohjkjclceamjacmfneodafbcbdk)

## How It Works

Pace Pets can be installed from the Chrome Web Store or loaded as an unpacked Chrome extension from this source tree. Each user runs their own local copy in their own Chrome profile, and the background worker uses that user's existing signed-in ChatGPT browser session to refresh usage every five minutes.

There is no shared backend, central database, hosted account connection, or cross-user data path. See [Local Extension Runtime And Distribution Model](docs/guides/local-extension-distribution.md) and [Extension Architecture](docs/reference/extension-architecture.md).

To swap the bundled artwork for a local copy, replace the PNGs under
`collector/extension/themes/default/`. See [Custom Icons](docs/guides/custom-icons.md).

## Install / Update

Chrome Web Store install:

1. Open the [Pace Pets Chrome Web Store listing](https://chromewebstore.google.com/detail/pace-pets/dgemeohjkjclceamjacmfneodafbcbdk).
2. Add Pace Pets to Chrome.
3. Click the Pace Pets toolbar icon to open the dashboard.

Source install:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click Load unpacked.
4. Select `collector/extension`.
5. Click the Pace Pets toolbar icon to open the dashboard. Right-click the toolbar icon to choose whether the badge shows the 7d or 5h view.

To update a source install after pulling or downloading new repo contents, reload the unpacked extension from `chrome://extensions`.

## Data & Privacy

Usage history is stored only in `chrome.storage.local` for the user's local extension install. History is bounded by code constants: 14 days or 500 samples, whichever is smaller.

Stored samples contain only normalized safe usage fields: collection timestamps, source/version markers, supported window keys, remaining/used percentages, reset timestamps, and window duration. See [Storage Schema](docs/reference/storage-schema.md).

Pace Pets does not inject code into ChatGPT pages or read ChatGPT chats or page contents. The rare Singularity dashboard transition uses generated WebGL/canvas layers plus live dashboard DOM geometry and does not capture, store, or upload screenshots. The extension does not request browser tab or screen capture permissions.

The selected usage window is also stored locally so the dashboard, toolbar badge, and badge-view menu stay in sync. Dashboard theme and motion preferences stay in extension-page `localStorage`.

`data/usage.sample.json` is a safe fixture used by static checks and docs. Do not publish generated local usage exports such as `data/usage.json`.

See [Privacy](PRIVACY.md) for the full local-data boundary and [Security](SECURITY.md) for sensitive-reporting guidance.

## Upstream Fragility

The collector uses an undocumented ChatGPT web usage endpoint. If that endpoint or response shape changes, the extension may need a repo update.

Keep the current `chatgpt.com` host permission aligned with real runtime fetches. Do not add legacy or fallback host permissions unless the fallback is actually implemented.

## Maintenance

Pace Pets is a maintainer-led public source project. The source is published so users can inspect it, copy it, fork it, and adapt it under the MIT license.

This is not run as a community contribution project. Issues and pull requests may be reviewed at the maintainer's discretion, but there is no contributor workflow, governance process, review timeline, or promise that feature requests or pull requests will be accepted. Maintenance is best-effort and focused on keeping the local extension usable and privacy-readable.

## Development

Chart.js is pinned in `package.json` and vendored into `collector/extension/vendor/` for extension runtime use. After changing the pinned package version, run:

```sh
npm run vendor:chart
```

Useful narrow checks:

```sh
python3 -m json.tool collector/extension/manifest.json >/dev/null
python3 -m json.tool data/usage.sample.json >/dev/null
node scripts/extension-check.mjs
node scripts/vendor-asset-check.mjs
node scripts/release-artifact-check.mjs
node scripts/smoke-check.mjs
npm run test
```

See [Testing Guide](docs/guides/testing.md) for the lightweight testing layers
and scope.

## Security Rules

- Do not store browser cookies, auth headers, access tokens, raw HTML, raw page text, screenshots, raw network responses, or account identifiers.
- Keep real usage history local to Chrome extension storage.
- Store only normalized usage windows, collection timestamps, reset timestamps, source/version markers, and derived percentages.
- Keep extension permissions limited to hosts and Chrome APIs the runtime code actually uses.

## License

MIT. See [LICENSE](LICENSE).

## Project Docs

- [Local Extension Runtime And Distribution Model](docs/guides/local-extension-distribution.md)
- [Custom Icons](docs/guides/custom-icons.md)
- [Testing Guide](docs/guides/testing.md)
- [Extension Architecture](docs/reference/extension-architecture.md)
- [Pace State Presentation](docs/reference/pace-state-presentation.md)
- [Singularity Transition](docs/reference/singularity-transition.md)
- [Storage Schema](docs/reference/storage-schema.md)
- [Release Packaging](docs/operations/release-packaging.md)

# Custom Icons

Status: guide.

Pace Pets keeps replaceable artwork in the default extension theme:

```text
collector/extension/themes/default/
  asset-manifest.js
  app-icons/
    icon16.png
    icon32.png
    icon48.png
    icon128.png
  pace-icons/
    sprint-faster.png
    push-harder.png
    pick-up-speed.png
    keep-pace.png
    ease-up.png
    slow-down-shopping-cart.png
    brake-hard.png
    perfect-sync.png
    perfect-zero.png
    06-slow-down-splat-transparent.png
    06-slow-down-free-fall-transparent.png
    perfect-zero-glow.png
  effects/
    reset-exhausted/
      exhausted-person.png
```

## Replace Existing Files

The lowest-friction customization path is to keep the existing filenames and
replace the PNG files in place.

App icons must keep their exact pixel sizes:

- `icon16.png`: 16x16
- `icon32.png`: 32x32
- `icon48.png`: 48x48
- `icon128.png`: 128x128

Pace icons must be PNGs with a transparent background. The dashboard reads their
state mapping from
`collector/extension/themes/default/asset-manifest.js`.
Effect assets are also PNGs with transparent backgrounds and are listed in the
same asset manifest.

After replacing icons, reload the unpacked extension from
`chrome://extensions`.

## Rename Files

If you keep the default filenames, no code changes are needed.

If you rename pace icon files, update `PACE_ICON_FILES_BY_STATE` in
`collector/extension/themes/default/asset-manifest.js`.

If you rename app icon files, update `APP_ICON_FILES_BY_SIZE` in
`collector/extension/themes/default/asset-manifest.js` and keep
`collector/extension/manifest.json` pointed at the same files. Chrome reads app
icons directly from its manifest, so those paths have to stay aligned.

## State Mapping

- `wellAhead`: sprint faster
- `strongAhead`: push harder
- `ahead`: pick up speed
- `on`: keep pace
- `behind`: ease up
- `wellBehind`: slow down
- `criticalBehind`: brake hard
- `sync`: perfect sync
- `perfectZero`: perfect zero
- `splat`: splat

`perfect-zero-glow.png` is a dashboard-only variant used when the main
`PERFECT ZERO` status card renders its animated space background. The normal
`perfect-zero.png` asset remains the base state icon.

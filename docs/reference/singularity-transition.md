# Singularity Transition

Status: reference.

The Singularity transition is the dashboard-only cinematic effect for the rare
`singularity` pace state. It is intended as a visual marker for the v1 line: the
moment when Pace Pets can hit the narrow "everything is displayed zero, but the
reset window has not quite ended" state.

## Product Contract

- The effect runs only for the dashboard `singularity` state.
- The effect does not run for Perfect Sync, Perfect Zero, threshold states, or
  regular page navigation.
- The effect does not capture screenshots. It uses generated in-memory canvas
  fragments as transition texture.
- The extension still does not inject code into ChatGPT pages, read ChatGPT chat
  contents, capture arbitrary websites, or persist screenshots.

## User Experience

When the dashboard enters Singularity from any other state, a fixed full-window
canvas overlay takes over:

1. Generated dashboard-colored fragments appear across the overlay.
2. The fragments spiral into a black-hole center near the pace icon.
3. The scene compresses into a dark tunnel and a small singularity point.
4. A brief hold creates a pause at the point.
5. A big-bang flash, shockwave, and particle burst expands outward.
6. The overlay fades away and reveals the live Singularity dashboard.

Same-state refreshes do not replay the sequence. To replay it in development,
force a different pace state first, then force Singularity again.

Reduced-motion users get a short non-fragmenting pulse instead of the full
fragment/tunnel/big-bang sequence.

## Trigger Flow

Live data path:

```text
history / refresh status changes
  -> dashboard renderHistory()
  -> pace summary resolves to singularity
  -> setPaceSummary()
  -> updateSingularityTransitionState(previousState, singularity)
  -> playSingularityTransition()
```

Developer-control path:

```text
dev-flags.html writes forcedPaceState = singularity
  -> dashboard storage listener calls loadDashboard()
  -> refreshForcedPaceStateOverride()
  -> renderForcedPaceStateOverride()
  -> updateSingularityTransitionState(previousState, singularity)
  -> playSingularityTransition()
```

If the dashboard tab is hidden when developer controls set Singularity, the
transition is queued with `singularityTransitionPending` and plays from the
dashboard `visibilitychange` handler when the dashboard becomes visible.

## Render Flow

The dashboard starts the transition directly from
`playSingularityTransition()`:

```text
dashboard page
  -> playSingularityTransition()
  -> SingularityTransitionRenderer.create({ captureDataUrl: null, ... })
  -> fixed overlay canvas renders generated fragments
  -> overlay fades and tears down
```

The manifest does not request `activeTab`, `<all_urls>`, `tabs`, `tabCapture`,
or `desktopCapture` for this effect.

## Runtime Files

- `collector/extension/dashboard-singularity-transition-data.js`: timeline,
  tile, reduced-motion, z-index, and body-class constants.
- `collector/extension/dashboard-singularity-transition-motion.js`: easing,
  tile generation, tunnel streaks, and big-bang particle setup.
- `collector/extension/dashboard-singularity-transition-draw.js`: canvas drawing
  routines for intake, black hole, tunnel, point, shockwave, particles, and
  reduced-motion pulse.
- `collector/extension/dashboard-singularity-transition-renderer.js`: overlay
  canvas lifecycle, high-DPI sizing, animation frame loop, and teardown.
- `collector/extension/dashboard-singularity-transition-methods.js`: pace
  controller integration, entry gating, hidden-tab queueing, and scene launch.
- `collector/extension/dashboard-singularity-transition.css`: fixed overlay and
  body shell visibility styles.

`collector/extension/runtime-manifest.js` owns the script order. The draw helper
must load before the renderer, and the renderer must load before the controller
methods.

## Lifecycle And Cleanup

The renderer creates the overlay at playback start. During playback, the live
dashboard shell is hidden behind the overlay. Near the end of the sequence, the
body class is removed and the overlay fades out so the live Singularity
dashboard is revealed underneath.

Teardown removes the canvas, clears animation frames, removes the body class,
sets decoded image references to `null`, and clears generated tile, streak, and
particle arrays.

Leaving Singularity increments the transition run ID, stops any active scene,
clears queued playback, and prevents stale transition work from continuing after
the state changed.

## Validation Notes

The narrow checks for this implementation are file-scoped JavaScript syntax
checks and static source-shape scans. Broad lint, smoke, test, preflight, and
browser verification remain opt-in per the project checks policy.

The important functional checks are:

- force a non-Singularity state, then force Singularity while the dashboard is
  visible;
- force Singularity from `dev-flags.html`, then switch back to the dashboard;
- confirm same-state refreshes do not replay the transition;
- confirm leaving Singularity cancels any queued or active transition;
- confirm reduced-motion uses the short pulse path.

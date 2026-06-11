# Singularity Transition

Status: reference.

The Singularity transition is the dashboard-only cinematic effect for the rare
`singularity` pace state: the moment when Pace Pets can hit the narrow
"everything is displayed zero, but the reset window has not quite ended" state.

## Product Contract

- The effect runs only for the dashboard `singularity` state.
- The effect does not run for Perfect Sync, Perfect Zero, threshold states, or
  regular page navigation.
- The effect does not capture screenshots. V1 uses generated in-memory canvas
  fragments as transition texture; V2 uses the shared space backdrop and chrome
  fade timing.
- The extension still does not inject code into ChatGPT pages, read ChatGPT chat
  contents, capture arbitrary websites, or persist screenshots.

## User Experience

V1 starts with a fixed full-window canvas overlay:

1. Generated dashboard-colored fragments appear across the overlay.
2. The fragments spiral into a black-hole center near the pace icon.
3. The scene compresses into a dark tunnel and a small singularity point.
4. A brief hold creates a pause at the point.
5. A big-bang flash, shockwave, and particle burst expands outward.
6. The overlay fades away and reveals the live Singularity dashboard.

V2 is the default transition. It fades into the shared space backdrop over 1.6
seconds, hides dashboard chrome for 5 seconds, fades dashboard chrome in over 5
seconds, then starts the supermassive black-hole approach.

Same-state refreshes do not replay the sequence. To replay it in development,
force a different pace state first, then force Singularity again.

Reduced-motion users get a short non-fragmenting pulse instead of the full
fragment/tunnel/big-bang sequence.

## V2 Black-Hole Approach

The next central V2 effect is a supermassive black hole that starts as a small
point deep in the shared space scene, spins forward, and becomes the visual
anchor for the later UI suction phase.

The first implementation should be a procedural Canvas 2D scene. It is the
lowest-friction way to prove the look inside the extension without adding a
runtime dependency. The scene can draw the event horizon, photon ring, accretion
disk, plasma jets, lensing glow, and eventually star streaks directly over the
existing space backdrop.

Other implementation paths remain available if Canvas 2D hits a ceiling:

- WebGL shader canvas: best for lensing distortion, plasma turbulence, and
  smooth particle fields, but it is a larger technical step.
- Three.js scene: useful if the black hole needs true camera depth, orbital
  geometry, or 3D UI fragments later.
- Generated raster/video asset: visually rich, but less controllable and less
  integrated with the future UI suction physics.

Initial V2 sequence target:

1. Prior dashboard state fades out.
2. Singularity space backdrop fades in.
3. Dashboard chrome stays hidden during the space hold.
4. Dashboard chrome fades back in.
5. A distant black-hole point appears in the background.
6. The accretion disk spins, brightens, and grows toward the foreground.
7. The scene holds long enough to establish the threat before future UI suction
   begins.

## Versioning

`singularity` remains the only product pace state. Local developer controls can
store `singularityTransitionVersion` under `pacePetsDeveloperOptions` to choose
the dashboard transition implementation while both versions are under review.
The default is `v2`; selecting `v1` stores that override and returning to live
data clears it. The current V2 renderer is isolated in its own module and
performs no V1 transition overlay. It starts from the normal Singularity
page/backdrop, fades the space backdrop in over 1.6 seconds, holds the
dashboard chrome hidden for 5 seconds, fades the chrome in over 5 seconds, then
plays the procedural black-hole approach scene.

The local `Run from current state` dev action can be launched from another
displayed pace state. It fades the live dashboard chrome out, writes the forced
Singularity developer state, then lets the V2 space hold, chrome fade-in, and
black-hole approach run. If the dashboard tab is hidden when the action is
requested, the preview is queued until that dashboard tab becomes visible.

## Development Preview Checklist

1. Reload the unpacked extension from `chrome://extensions`.
2. Reload both extension pages: `dashboard.html` and `dev-flags.html`.
3. In Dev Controls, choose a prior state such as `Keep pace` or `Perfect zero`.
4. In the `Singularity` panel, confirm `Singularity V2` is selected.
5. Click `Run from current state`.
6. If Dev Controls reports that the preview is queued, switch to the dashboard
   tab.

Expected timing: the prior dashboard state fades out for about 1.6 seconds,
the forced Singularity state fades into space over 1.6 seconds, the dashboard
chrome fades in over 5 seconds after the space hold, then the black-hole
approach plays for about 7.7 seconds.

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
dev-flags.html may also write singularityTransitionVersion = v1
dev-flags.html may send Run from current state message
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
  -> SingularityTransitionVersions.create({ version, ... })
  -> V1 creates a fixed overlay canvas and renders generated fragments
  -> V2 leaves the space backdrop visible, fades dashboard chrome in, and plays
     the black-hole approach scene
  -> selected renderer tears down its temporary state
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
  canvas lifecycle, high-DPI sizing, animation frame loop, and teardown for V1.
- `collector/extension/dashboard-singularity-transition-v2-renderer.js`: V2
  renderer module. It currently performs no V1 transition overlay, fades into
  the normal Singularity page/backdrop over 1.6 seconds, holds dashboard chrome
  hidden, fades dashboard chrome in over 5 seconds, and starts the black-hole
  approach scene.
- `collector/extension/dashboard-singularity-v2-black-hole-draw.js`:
  procedural Canvas 2D black-hole approach drawing helpers for V2.
- `collector/extension/dashboard-singularity-v2-black-hole-scene.js`:
  temporary black-hole canvas lifecycle, high-DPI sizing, animation frame loop,
  and teardown for V2.
- `collector/extension/dashboard-singularity-transition-preview-methods.js`:
  dev-only V2 entry preview action that fades out live dashboard chrome, then
  forces Singularity so the selected transition can run.
- `collector/extension/dashboard-singularity-transition-versions.js`: renderer
  selection by normalized developer-option version.
- `collector/extension/dashboard-singularity-transition-methods.js`: pace
  controller integration, entry gating, hidden-tab queueing, and scene launch.
- `collector/extension/dashboard-singularity-transition.css`: fixed overlay and
  body shell visibility styles.

`collector/extension/runtime-manifest.js` owns the script order. The V1 draw
helper must load before the V1 renderer, and the version selector must load
before the controller methods.

## Lifecycle And Cleanup

The selected renderer creates its temporary presentation state at playback
start. V1 creates a fixed overlay canvas and hides the live dashboard shell
behind it. V2 applies body classes that hide the dashboard chrome while leaving
the shared space backdrop visible, then creates a temporary black-hole canvas
for the approach phase.

Teardown removes temporary body classes. V1 also removes the canvas, clears
animation frames, sets decoded image references to `null`, and clears generated
tile, streak, and particle arrays. V2 removes the temporary black-hole canvas
and cancels any pending animation frame.

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

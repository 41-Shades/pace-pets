# Singularity Transition

Status: reference.

The Singularity transition is the dashboard-only cinematic effect for the rare
`singularity` pace state: the moment when Pace Pets can hit the narrow
"everything is displayed zero, but the reset window has not quite ended" state.

## Product Contract

- The effect runs only for the dashboard `singularity` state.
- The effect does not run for Perfect Sync, Perfect Zero, threshold states, or
  regular page navigation.
- The effect does not capture screenshots. The current transition uses the
  shared space backdrop, dashboard chrome timing, and a generated black-hole
  canvas layer behind the dashboard chrome. Chrome collapse uses live DOM
  geometry only: it animates dashboard element bounds and never screenshots or
  captured page pixels.
- The extension still does not inject code into ChatGPT pages, read ChatGPT chat
  contents, capture arbitrary websites, or persist screenshots.

## User Experience

The Singularity transition fades into the shared space backdrop over 2 seconds,
fades dashboard chrome in over 6 seconds, then starts the selected supermassive
black-hole approach. As glints start falling inward, the dashboard chrome
pressure-ripples and its real containers begin one continuous split, orbital
pull, and distortion toward the black hole. They shrink and fade only as they
reach the horizon. The explosive/shard breakup path is intentionally not active.

Same-state refreshes do not replay the sequence. To replay it in development,
force a different pace state first, then force Singularity again.

Reduced-motion users skip the animated entry sequence.

## Black-Hole Approach

The central effect is a supermassive black hole that starts as a small point
deep in the shared space scene, spins forward, and becomes the visual anchor for
the chrome-collapse phase.

The black hole is the WebGL shader scene. It renders a full-window transparent
WebGL canvas behind the dashboard chrome and over the shared space backdrop with
a procedural event horizon, asymmetric photon ring, tilted noisy accretion disk,
lensing glow, Doppler-shifted plasma bands, turbulent vertical jets, a late
gravity pulse, and sparse infalling glints.

Other implementation paths remain available if the shader scene hits a ceiling:

- Three.js scene: useful if the black hole needs true camera depth, orbital
  geometry, or richer 3D UI-fragment physics later.
- Generated raster/video asset: visually rich, but less controllable and less
  integrated with the live chrome-collapse physics.

Current sequence target:

1. Prior dashboard state fades out.
2. Singularity space backdrop fades in.
3. Dashboard chrome stays hidden until the space fade completes.
4. Dashboard chrome fades back in.
5. A distant black-hole point appears in the background.
6. The accretion disk spins, brightens, and grows toward the foreground.
7. The scene holds long enough to establish the threat.
8. Dashboard chrome pressure-ripples near the same time glints start
   distorting and falling inward.
9. Main-panel containers and each state-rail item split apart, orbit inward,
   stretch, and shear as one continuous pull instead of separate break/fall
   phases.
10. Near the horizon, containers compress, darken, and disappear into the black
    hole without an explosion.

The black-hole canvas intentionally remains below `.content-grid` while the
approach holds. During collapse, the real `.content-grid` remains visible for
the container split/orbit/shrink phase; no temporary debris layer or explosive
breakup handoff is active in the current implementation.

## Versioning

`singularity` remains the only product pace state. The retired generated
fragment implementation and the Canvas black-hole baseline have both been
removed, so the dashboard now has one canonical Singularity transition. Local
developer controls no longer store selectors for the whole transition or the
black-hole phase.

The local `Run from current state` dev action can be launched from another
displayed pace state. It fades the live dashboard chrome out, writes the forced
Singularity developer state, then lets the space fade, chrome fade-in, and
black-hole approach run. If the dashboard tab is hidden when the action is
requested, the preview is queued until that dashboard tab becomes visible.

## Development Preview Checklist

1. Reload the unpacked extension from `chrome://extensions`.
2. Reload both extension pages: `dashboard.html` and `dev-flags.html`.
3. In Dev Controls, choose a prior state such as `Keep pace` or `Perfect zero`.
4. Click `Run from current state`.
5. If Dev Controls reports that the preview is queued, switch to the dashboard
   tab.

Expected timing: the prior dashboard state fades out for about 2 seconds, the
forced Singularity state fades into space over 2 seconds, the dashboard chrome
fades in over 6 seconds, then the black-hole approach builds for about 7.6
seconds. The chrome-collapse pressure starts around the glint suction point
inside the black-hole approach, and main-panel containers plus state-rail items
immediately split, orbit inward, distort, and shrink into the horizon as one
continuous pull.

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
  -> SingularityTransitionRenderer.create({ ... })
  -> renderer leaves the space backdrop visible
  -> renderer fades dashboard chrome in
  -> renderer starts the WebGL black-hole approach scene
  -> renderer starts live chrome container split/orbit during black-hole approach
  -> renderer compresses containers into the horizon without a shard explosion
  -> renderer tears down when the chrome collapse completes or Singularity exits
```

The manifest does not request `activeTab`, `<all_urls>`, `tabs`, `tabCapture`,
or `desktopCapture` for this effect.

## Runtime Files

- `collector/extension/dashboard-singularity-transition-renderer.js`: canonical
  Singularity transition renderer. It fades into the normal Singularity
  page/backdrop over 2 seconds, fades dashboard chrome in over 6 seconds, and
  starts the black-hole approach scene.
- `collector/extension/dashboard-singularity-black-hole-v2-shaders.js`:
  WebGL vertex and fragment shader sources for the black-hole scene.
- `collector/extension/dashboard-singularity-black-hole-v2-scene.js`:
  temporary WebGL canvas lifecycle, shader setup, high-DPI sizing, animation
  frame loop, context-loss handling, approach completion, and teardown for the
  black-hole scene.
- `collector/extension/dashboard-singularity-chrome-collapse-fragments.js`:
  DOM-geometry collection for live containers that split away from the dashboard
  chrome.
- `collector/extension/dashboard-singularity-chrome-collapse-motion.js`:
  black-hole target calculation and live-container split/orbit/stretch/shrink
  animation timing.
- `collector/extension/dashboard-singularity-chrome-collapse-scene.js`:
  chrome pressure and split/orbit/shrink lifecycle, plus teardown restoration.
- `collector/extension/dashboard-singularity-transition-preview-methods.js`:
  dev-only entry preview action that fades out live dashboard chrome, then
  forces Singularity so the transition can run.
- `collector/extension/dashboard-singularity-transition-methods.js`: pace
  controller integration, entry gating, hidden-tab queueing, and scene launch.
- `collector/extension/dashboard-singularity-transition.css`: body shell
  visibility styles, black-hole canvas layers, pressure ripple, and live
  chrome-collapse state. The black-hole scene stays behind the dashboard chrome
  while real chrome containers animate above it.

`collector/extension/runtime-manifest.js` owns the script order. The WebGL
shaders must load before the black-hole scene, chrome-collapse container
collection must load before the chrome-collapse motion and scene modules,
motion must load before the chrome-collapse scene, and those scenes must load
before the transition renderer.

## Lifecycle And Cleanup

The renderer creates its temporary presentation state at playback start. It
applies body classes that hide the dashboard chrome while leaving the shared
space backdrop visible, then creates a temporary black-hole canvas for the
approach phase. Around the glint suction timing, it starts the
chrome-collapse scene. That scene animates real main-panel containers and
state-rail items as stretched DOM pieces along circular inward paths, then
compresses them into the horizon without an explosive breakup.

Teardown removes temporary body classes, removes the temporary black-hole
canvas, restores the live dashboard chrome, and cancels active animation frames
or chrome-collapse animations.

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
- confirm reduced-motion skips the animated sequence.

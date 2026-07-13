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
- Singularity reuses the full-page Perfect Zero space renderer without the
  Perfect Zero status-icon featured planet.
- A Singularity first discovered while its dashboard is hidden waits until that
  dashboard becomes visible. If a running transition becomes hidden, the
  controller cancels and tears down its temporary presentation, reveals the
  current dashboard state, and does not replay it when visibility returns.
- The extension still does not inject code into ChatGPT pages, read ChatGPT chat
  contents, capture arbitrary websites, or persist screenshots.

## User Experience

The Singularity transition fades into the shared space backdrop over 2 seconds,
holds on blank space for 2 seconds, fades dashboard chrome in over 6 seconds,
then starts the selected supermassive black-hole approach. As glints start
falling inward, the dashboard chrome
pressure-ripples and its real containers begin one continuous split, orbital
pull, 3D depth recession, and distortion toward the black hole. CSS
perspective gives the live DOM plane depth, so pieces begin moving backward
into the black-hole layer as soon as collapse starts instead of sliding only in
screen space. Pull-direction X/Y torque makes the flat dashboard chrome rotate
as gravity catches it, while the existing Z-axis orbit and shear preserve the
spiral motion. Shortly after each container starts falling, its owned inner
pieces begin a second overlapping breakup pass so text, icons, controls, and
bars keep tearing loose while the parent container is already orbiting inward.
Containers and inner fragments progressively shrink, darken, and fade as depth
recession increases. The explosive/shard breakup path is intentionally not
active.

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
lensing glow, Doppler-shifted plasma bands, turbulent vertical jets, a
progress-driven violence ramp, late gravity shock ripples, and sparse infalling
glints.

Other implementation paths remain available if the shader scene hits a ceiling:

- Three.js scene: useful if the CSS-perspective collapse needs richer camera
  depth, orbital geometry, or UI-fragment physics later.
- Generated raster/video asset: visually rich, but less controllable and less
  integrated with the live chrome-collapse physics.

Current sequence target:

1. Prior dashboard state fades out.
2. Singularity space backdrop fades in.
3. Dashboard chrome stays hidden for a 2-second blank-space hold after the space
   fade completes.
4. Dashboard chrome fades back in over 6 seconds.
5. A distant black-hole point appears in the background.
6. The accretion disk spins, brightens, and grows toward the foreground.
7. Disk turbulence, photon-ring instability, jet flicker, glint stretch, and
   broken lensing shock ripples intensify as the approach nears collapse.
8. Dashboard chrome starts with a subtle whole-content jitter that ramps up as
   the black hole approaches.
9. Dashboard chrome pressure-ripples near the same time glints start
   distorting and falling inward.
10. Main-panel containers and each state-rail item split apart, orbit inward,
    rotate in 3D, recede along the Z axis, stretch, shear, and shrink as one
    continuous pull instead of separate break/fall phases.
11. Inner content fragments then tear loose on an overlapping delay, continuing
    to shear, torque, shrink, and recede as their parent containers fall.
    Each run uses a fresh collapse seed for geometry and inner-fragment
    selection while preserving the fixed collapse timing.
12. Near the horizon, containers and inner fragments compress, darken, and
    disappear into the black hole without an explosion.
13. As the black-hole approach completes, the same WebGL scene keeps advancing
    behind the still-collapsing DOM chrome. Its horizon continues expanding
    into the viewport, crosses into a funnel/cone visualization, and falls
    toward one central singularity point.
14. The camera falls through the singularity point into a full-frame whiteout.
15. A white checkerboard overlay restores the current dashboard state
    underneath, then decimates from fine cells to coarse cells before clearing
    instead of replaying the entry animation.

The black-hole canvas intentionally remains below `.content-grid` while the
approach holds. During collapse, the real `.content-grid` remains visible with
CSS perspective for the container split/orbit/depth-recession/shrink phase; no
temporary debris layer or explosive breakup handoff is active in the current
implementation. The black-hole scene continues past approach completion so the
same center, horizon, and shader clock keep moving while the app is consumed
instead of plateauing during chrome collapse. The horizon remains attached to
the existing black-hole center until the viewport is mostly consumed, then
recenters inside the cone. The collapse scene marks the live DOM pieces it
owns until the terminal whiteout. The renderer then covers the screen with a
shared checkerboard reveal overlay, tears down the WebGL and DOM-collapse
presentation state, and clears the overlay with a checkerboard decimation
reveal to show the current dashboard state.

## Versioning

`singularity` remains the only product pace state. The retired generated
fragment implementation and the Canvas black-hole baseline have both been
removed, so the dashboard now has one canonical Singularity transition. Local
developer controls no longer store selectors for the whole transition or the
black-hole phase.

The local developer controls can still force the Singularity state from any
other displayed pace state. If the dashboard tab is hidden when developer
controls set Singularity, the transition is queued until that dashboard tab
becomes visible.
Dev controls can also toggle whether the reveal's white or black squares are
transparent before replaying the shared checkerboard reveal or entering
Singularity.

## Development Preview Checklist

1. Reload the unpacked extension from `chrome://extensions`.
2. Reload both extension pages: `dashboard.html` and `dev-flags.html`.
3. In Dev Controls, choose a prior state such as `Keep pace` or `Perfect zero`.
4. Choose `Singularity`.
5. If the dashboard tab was hidden, switch to the dashboard tab.

Expected timing: Singularity fades into space over 2 seconds, holds on blank
space for 2 seconds, fades the dashboard chrome in over 6 seconds, then the
black-hole approach builds for about 7.6 seconds. A whole-dashboard jitter
starts when the black-hole approach
begins and ramps until chrome collapse starts around the glint suction point.
The chrome-collapse pressure then begins, and main-panel containers plus
state-rail items immediately split, orbit inward, recede into CSS perspective,
rotate in 3D, and distort. A second inner-fragment pass starts shortly after
the parent pieces begin falling, so text, icons, controls, and bars continue
breaking up while everything shrinks into the horizon as one continuous pull.
As soon as the black-hole approach completes, the same black-hole shader keeps
advancing behind the collapsing chrome, expands the horizon into the full
viewport, crosses into a cone/funnel grid, falls through the singularity point
into a whiteout, and returns through a checkerboard decimation reveal to the
current dashboard state.

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
transition is queued with `singularityTransitionPending`. The dashboard
refreshes its current time-sensitive state on visibility return, then plays the
pending transition only if Singularity is still current. A transition that was
already running when the dashboard became hidden is instead cancelled and
settled; returning to the dashboard does not replay it.

## Render Flow

The dashboard starts the transition directly from
`playSingularityTransition()`:

```text
dashboard page
  -> playSingularityTransition()
  -> SingularityTransitionRenderer.create({ ... })
  -> renderer fades into the space backdrop and holds it alone for 2 seconds
  -> renderer fades dashboard chrome in
  -> renderer starts the WebGL black-hole approach scene
  -> renderer starts live chrome container split/orbit during black-hole approach
  -> black-hole shader continues past approach completion into horizon growth
  -> renderer compresses containers into the horizon without a shard explosion
  -> black-hole shader falls through the singularity point into a whiteout
  -> renderer plays the shared checkerboard reveal over the restored dashboard state
```

The manifest does not request `activeTab`, `<all_urls>`, `tabs`, `tabCapture`,
or `desktopCapture` for this effect.

## Runtime Files

- `collector/extension/dashboard-singularity-transition-renderer.js`: canonical
  Singularity transition renderer. It fades into the normal Singularity
  page/backdrop over 2 seconds, holds on blank space for 2 seconds, fades
  dashboard chrome in over 6 seconds, and starts the black-hole approach scene,
  pre-collapse jitter ramp, chrome
  collapse, continuous horizon/descent phase, terminal whiteout, and shared
  checkerboard dashboard reveal.
- `collector/extension/dashboard-checkerboard-reveal.js`: shared dashboard
  reveal scene that appends the full-page white overlay, waits for the CSS
  checkerboard animation to complete, and tears the overlay down. Singularity
  and unpacked dev preview actions use the same scene.
- `collector/extension/dashboard-singularity-black-hole-v2-shaders.js`:
  WebGL vertex and fragment shader sources for the black-hole scene, including
  the progress-driven violence ramp for turbulence, flares, shock ripples,
  jet flicker, glint acceleration, full-viewport horizon growth, cone/funnel
  descent, singularity point, and final whiteout.
- `collector/extension/dashboard-singularity-black-hole-v2-scene.js`:
  temporary WebGL canvas lifecycle, shader setup, high-DPI sizing, animation
  frame loop, context-loss handling, approach completion, and teardown for the
  black-hole scene. Approach completion resolves the renderer cue but does not
  stop the shader clock.
- `collector/extension/dashboard-singularity-chrome-collapse-fragments.js`:
  DOM-geometry collection for live containers and their owned inner fragments
  that split away from the dashboard chrome, with per-run seeded inner-fragment
  selection.
- `collector/extension/dashboard-singularity-chrome-collapse-motion.js`:
  black-hole target calculation plus live-container and inner-fragment
  split/orbit/stretch/depth-recession/torque/shrink animation geometry and
  timing.
- `collector/extension/dashboard-singularity-chrome-collapse-scene.js`:
  chrome pressure and split/orbit/depth-recession/shrink lifecycle, owned-piece
  marking during the collapse, plus teardown restoration.
- `collector/extension/dashboard-singularity-transition-methods.js`: pace
  controller integration, entry gating, hidden-tab queueing, and scene launch.
- `collector/extension/dashboard-singularity-transition.css`: body shell
  visibility styles, black-hole canvas layer, pressure ripple, and live
  chrome-collapse state. The black-hole scene stays behind the dashboard chrome
  while real chrome containers animate above it.
- `collector/extension/dashboard-checkerboard-reveal.css`: shared
  whiteout-to-dashboard checkerboard reveal overlay and keyframes.

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
state-rail items as stretched DOM pieces along circular inward paths while they
recede through CSS perspective and rotate with pull-direction 3D torque. Their
owned inner fragments start an overlapping secondary breakup while the parent
pieces are already falling. When the black-hole approach completes, the same
black-hole scene keeps advancing behind those falling pieces, grows the
horizon into the viewport, crosses into a cone/funnel visualization, and falls
through the singularity point into a whiteout. During the terminal reveal, the
shared checkerboard reveal covers the screen while the renderer removes the
temporary WebGL canvas and restores live dashboard chrome; the overlay then
decimates from fine checkerboard cells to coarse cells before clearing to reveal
the current dashboard state.

Teardown removes temporary body classes, removes the temporary WebGL canvas,
restores the live dashboard chrome, and cancels active animation frames or
chrome-collapse animations when motion is disabled, the transition is explicitly
stopped, the dashboard becomes hidden, or a transition phase fails. Visibility
loss also invalidates the active controller run before stopping its scene, so
late promise continuations cannot reclaim transition state. Any transition audio
is stopped immediately. The ordinary dashboard refresh on visibility return
then presents the current state without replaying the interrupted transition.

Leaving Singularity before a hidden-tab queued transition starts clears queued
playback. Once the transition has started, ordinary pace-state changes do not
stop the active scene; they update the dashboard DOM underneath so the terminal
checkerboard reveal exposes the latest rendered dashboard state.

## Validation Notes

The narrow checks for this implementation are file-scoped JavaScript syntax
checks and static source-shape scans. Broad lint, smoke, test, preflight, and
browser verification remain opt-in per the project checks policy.

The important functional checks are:

- force a non-Singularity state, then force Singularity while the dashboard is
  visible;
- force Singularity from `dev-flags.html`, then switch back to the dashboard;
- request the global Checkerboard reveal dev preview over a live state and a
  forced state;
- repeat the Checkerboard reveal preview with white squares transparent and
  black squares transparent;
- confirm same-state refreshes do not replay the transition;
- confirm leaving Singularity before playback starts cancels a queued transition;
- confirm leaving Singularity during active playback does not cancel the
  transition and the checkerboard reveal exposes the latest dashboard state;
- confirm hiding the dashboard during active playback immediately restores live
  chrome, removes temporary canvases/classes, and does not replay on return;
- confirm reduced-motion skips the animated sequence.

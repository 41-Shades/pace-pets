# Big Bang Transition

Status: reference.

The Big Bang transition is the dashboard-only cinematic effect for the
`bigBang` pace state: the beginning-of-window state where displayed remaining
usage and displayed remaining time both equal `100`.

Big Bang is a flagship animation alongside Singularity. It should be maintained
as one canonical transition path, not as a collection of parallel experiments.

## Product Contract

- The effect runs only for the dashboard `bigBang` state.
- The effect does not run for Perfect Sync, Perfect Zero, Singularity, Splat,
  threshold states, or regular page navigation.
- The first visible beat is a dark pre-hold. The transition must not reveal a
  seed glow, ring, star field, or dashboard chrome before the pre-hold ends.
- The transition hides dashboard chrome, plays temporary full-viewport
  generated canvases, hands off to the shared full-page space backdrop, then
  fades dashboard chrome back after space is already established.
- The effect does not capture screenshots, request page content, or use Chrome
  tab pixels. It uses generated Canvas/WebGL layers and the shared space
  backdrop.
- Same-state refreshes do not replay the transition. To replay in development,
  force a different pace state first, then force Big Bang again.
- Reduced-motion users skip the animated sequence.

## User Experience

The sequence should feel like a cosmic first-light event, not a fire/explosion
warning state. The stable UI palette for Big Bang is cool white, cyan, blue,
and a small violet edge; warm amber belongs only in the tiny ignition core when
needed. The state title, value, rail chip, toolbar badge, and shared-space
handoff should not read as yellow/orange.

Current user-facing beats:

1. Dark pre-hold.
2. Tiny center seed sparkle.
3. First ignition flash with billowing vapor/dust plumes.
4. WebGL ray volley and hard expansion over the opening Canvas cover.
5. Shared full-page space backdrop fades in under the opaque cover.
6. The Canvas cover fades away while the WebGL expansion continues.
7. The WebGL layer fades over the established shared backdrop.
8. Dashboard chrome fades back after the space scene is already visible.

## Runtime Files

- `collector/extension/dashboard-big-bang-origin.js`: shared Big Bang origin
  placement helpers.
- `collector/extension/dashboard-big-bang-scene-factory.js`: seeded generated
  scene state for the Canvas opening and legacy comparison helpers.
- `collector/extension/dashboard-big-bang-ejecta-draw.js`: retired/disabled
  opening ejecta layer.
- `collector/extension/dashboard-big-bang-particle-draw.js`: particle drawing
  helpers used by the opening sparks and legacy matter layers.
- `collector/extension/dashboard-big-bang-recede-draw.js`: retired/disabled
  legacy receding-envelope aftermath.
- `collector/extension/dashboard-big-bang-plume-draw.js`: ignition plume draw
  helpers for the first Canvas beat.
- `collector/extension/dashboard-big-bang-webgl-shaders.js`: WebGL shader
  source for the flagship ray/bloom/residue expansion.
- `collector/extension/dashboard-big-bang-webgl-renderer.js`: temporary WebGL
  canvas lifecycle, shader setup, high-DPI sizing, context-loss handling, and
  teardown.
- `collector/extension/dashboard-big-bang-scene-draw.js`: Canvas opening
  cover and disabled legacy middle/aftermath draw path.
- `collector/extension/dashboard-big-bang-scene.js`: transition clock,
  Canvas/WebGL mounting, reveal milestones, and teardown.
- `collector/extension/dashboard-big-bang-audio-timeline.js`: Big Bang
  two-clip music timeline, clip durations, 500ms crossfade, and 2500ms final
  fade timing.
- `collector/extension/dashboard-big-bang-transition-renderer.js`: body
  classes, dashboard chrome hiding/reveal, shared-space handoff callbacks, and
  transition promise lifecycle.
- `collector/extension/dashboard-singularity-transition-methods.js`: pace
  controller integration shared by Big Bang and Singularity special
  transitions.
- `collector/extension/dashboard-big-bang-transition.css`: temporary canvas
  layers, dashboard chrome visibility, and shared-space reveal styling.

`collector/extension/runtime-manifest.js` owns the script order. Origin helpers
must load before scene factory/plume/draw helpers, WebGL shaders before the
WebGL renderer, Canvas/WebGL draw helpers before the scene, and the scene before
the transition renderer.

## Timing

Timing is measured from the first animation frame in
`collector/extension/dashboard-big-bang-scene.js`. The scene has a 2-second
pre-hold, then passes post-hold elapsed time into the 2D opening cover and the
WebGL expansion overlay. The Canvas opening draw subtracts another 720ms for
the seed sparkle before the stage-one bang helpers activate.

| Approx visible window | Beat / code area                                                                                                                                              |
| --------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|            `0-2000ms` | Blank dark pre-hold (`PRE_BANG_HOLD_MS`).                                                                                                                     |
|         `2000-2720ms` | Tiny center seed sparkle (`SEED_SPARKLE_MS`).                                                                                                                 |
|         `2720-4320ms` | First ignition flash, plumes, and near-center sparks (`drawStageOneExplosion()`, `drawIgnitionPlumes()`).                                                     |
|         `2520-5240ms` | Dense WebGL ray volley over the seed/stage-one opening (`crackRayBurst()`).                                                                                   |
|        `4380-14600ms` | WebGL hard ray eruption, delayed bloom, residue, and sparse handoff matter. WebGL does not draw the final stable star field.                                  |
|         `4600-7800ms` | Shared full-page space backdrop fades in underneath the Big Bang cover (`SPACE_BACKGROUND_REVEAL_AT_MS`, `SPACE_BACKGROUND_REVEAL_DURATION_MS`).              |
|         `7200-9600ms` | The opaque 2D Big Bang cover fades out, exposing the shared backdrop behind the WebGL explosion (`CANVAS_COVER_FADE_AT_MS`, `CANVAS_COVER_FADE_DURATION_MS`). |
|       `11400-14600ms` | WebGL Big Bang fades away over the already-visible shared backdrop (`SPACE_REVEAL_AT_MS`, `CANVAS_FADE_DURATION_MS`).                                         |
|             `14200ms` | Dashboard chrome reveal starts (`DASHBOARD_REVEAL_AT_MS`).                                                                                                    |
|             `14600ms` | Big Bang canvases are removed (`CANVAS_DONE_AT_MS`).                                                                                                          |
|       `14200-19400ms` | Dashboard chrome opacity fade (`DASHBOARD_FADE_DURATION_MS`).                                                                                                 |
|             `19400ms` | Transition promise completes.                                                                                                                                 |

## Audio Timing

Big Bang has a bounded two-clip music effect. The files are packaged extension
assets under `collector/extension/assets/audio/`, and playback is requested by
the named `bigBang` transition timeline rather than by visual draw code.
When dashboard audio is ready, the dashboard preloads and decodes this timeline
before Big Bang starts so transition playback does not perform first-use decode
work during the animation's opening frames. Playback captures one Web Audio
clock anchor at transition start and schedules both clips relative to that
anchor.

|    Offset | Audio behavior                                                                    |
| --------: | --------------------------------------------------------------------------------- |
|  `1000ms` | Start `bigBangTransition` / `the-great-beyond-21s-31s.m4a`; linear 500ms fade in. |
| `10500ms` | Start `bigBangReturn` / `the-great-beyond-60s-72p5s.m4a`; linear 500ms crossfade. |
| `20500ms` | Begin the return clip's linear 2500ms final fade out.                             |
| `23000ms` | End the bounded Big Bang music group.                                             |

The audio tail after the `19400ms` visual transition completion is intentional:
it covers the first part of the returned dashboard presentation. It is not an
ambient loop and should not continue past the declared timeline.

Big Bang audio plays only when the dashboard audio manager is ready in the
current page. If Chrome still requires a user gesture, that transition occurrence
stays silent rather than replaying later after audio is allowed.

## Current Layering

The current flagship path is a hybrid:

- 2D Canvas owns the dark cover, seed sparkle, first ignition flash, plumes,
  and near-center sparks.
- WebGL owns the high-count ray volley, hard expansion, delayed bloom, residue,
  and sparse handoff matter.
- The shared full-page space backdrop owns the stable final star field.

This split is intentional. Earlier all-Canvas stage-two attempts stacked too
much work into the same frame: full-canvas gradients, particles, stars, dust,
rays, shock arcs, core/envelope fills, and `context.filter` blur passes. That
made the "really big bang" beat lag even when the visual idea was simpler than
Singularity. Singularity performs better because its heaviest continuous work is
kept in WebGL and its DOM-collapse work is structured around bounded pieces and
fixed timing, while the old Big Bang middle stage tried to make Canvas do
everything at once.

The disabled Canvas middle/aftermath helpers remain in source for comparison,
but `DRAW_OPENING_EJECTA`, `DRAW_REALLY_BIG_BANG_EXPANSION`, and
`DRAW_LEGACY_AFTERGLOW` are currently `false` in
`dashboard-big-bang-scene-draw.js`.

## Lessons Learned

1. Keep one canonical Big Bang path.

   A separate Big Bang 2 preview made comparison harder and introduced another
   behavior path to maintain. Failed architectural trials should be removed
   cleanly. Future major experiments should either live outside the packaged
   runtime or be folded into the canonical transition deliberately.

2. Preserve the dark pre-hold contract.

   A visible center glow during the first beat reads as broken sequencing. The
   pre-hold should draw only the dark frame until `PRE_BANG_HOLD_MS` has passed.

3. Do not use screenshot-only evaluation for animation quality.

   Screenshots can catch static palette/layout problems, but they do not prove
   temporal coherence, frame pacing, sequencing, or dropped-frame behavior. Big
   Bang animation changes should be reviewed through source timing, layer
   ownership, runtime logs if available, and targeted performance reasoning.

4. Treat Canvas filters as a hot-path cost.

   The legacy 2D `drawEnergyRay()` and `drawShockArc()` helpers still use
   `context.filter = blur(...)`. Those helpers are disabled because that path
   was a likely stage-two bottleneck and the ragged outer rings were visually
   weak. If the legacy Canvas expansion is re-enabled, filters should be
   removed or limited to a very small subset before increasing particle counts.

5. Scale budgets by physical pixels.

   Canvas render cost tracks physical canvas pixels, not just CSS viewport
   area. Keep explicit pixel-ratio caps and consider physical-pixel workload
   when changing particle counts, full-canvas gradient fills, or viewport-sized
   effects.

6. Separate visual responsibility by layer.

   Canvas should not draw the seed, plumes, rings, rays, dust, stable stars,
   final backdrop, and dashboard handoff all at once. The current path keeps the
   early cover, WebGL expansion, and final backdrop distinct so the peak frame
   does not carry every visual idea simultaneously.

7. Favor beat clarity over physical speed.

   The explosion can be slightly slower and still feel dramatic. A too-fast
   "realistic" expansion can compress the sequence, hide connecting beats, and
   increase per-frame pileup.

8. Avoid ragged decorative rings.

   The three large uneven outer rings tried to communicate shock fronts, but
   they read as visual clutter and likely added cost. Broken rays, bloom,
   residue, and sparse matter provide a better flagship vocabulary.

9. Keep the Big Bang palette cosmic.

   Big Bang should read as first light against space: white, cyan, blue, and
   violet. Yellow/orange should not define the state card, value, rail chip, or
   toolbar badge because those colors imply warning, fire, or pace pressure.

10. Handoff timing matters.

    The shared backdrop should become visible under the Big Bang cover before
    dashboard chrome returns. Chrome should not fade in over an unfinished or
    unstable explosion frame.

## Validation Notes

The narrow checks for this transition are source-level timing review,
file-scoped syntax checks, and targeted tests around runtime script order and
transition lifecycle. Broad lint, smoke, test, preflight, and browser
verification remain opt-in per the project checks policy.

Useful code-level review questions:

- Does the first visible beat stay dark until `PRE_BANG_HOLD_MS`?
- Does each layer own a clear part of the sequence?
- Are costly Canvas filters, full-canvas gradients, or high particle counts
  active in the same frame?
- Are pixel-ratio caps still explicit?
- Does the shared backdrop reveal before dashboard chrome returns?
- Are temporary canvases removed and animation frames/timers cancelled on
  completion, stop, reduced motion, or setup failure?
- Does WebGL failure leave a coherent fallback instead of blocking the
  transition promise?
- Does Big Bang audio skip reduced-motion runs, stop/fade on interrupted
  transitions, and remain bounded to the declared two-clip timeline?

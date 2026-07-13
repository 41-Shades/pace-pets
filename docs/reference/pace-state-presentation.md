# Pace State Presentation

Status: reference.

Pace math and formatting are owned by `collector/extension/pace-logic.js`.
`collector/extension/pace-presentation.js` returns one frozen active-reading
model containing state, raw pace ratio, and displayed pace ratio, with
reset-window history helpers in `collector/extension/pace-window-history.js`.
The dashboard and toolbar adapt that model instead of resolving normal and
special states independently.

When running the unpacked extension, local developer settings can force one pace
state for the dashboard card and toolbar badge. That display override is owned by
`collector/extension/developer-options.js`, reuses the preview-control ratios,
percent pairs, and reset-window model, and remains active until cleared.

## Pace Ratio

For one supported usage window, the pace ratio compares usage remaining to time
remaining:

```text
paceRatio = remainingPercent / timeRemainingPercent
```

`timeRemainingPercent` is derived from `resetsAt`, `windowMinutes`, and the
current time. If either percent cannot be normalized, or if the time remaining
percent is zero, the ratio is unavailable. Dashboard interim presentations use
Nothingness; the muted state remains the neutral startup and internal fallback
for unknown ratio presentation.

Percent inputs are bounded to `0..100`. Display surfaces choose their own
formatting, but the stored history keeps source precision after normalization.
Current observed WHAM usage-window data reports whole-number `used_percent`
values, so fractional state behavior is supported by normalization but is not
the current observed provider contract.

Normal pace levels classify the ratio at the same two-decimal precision shown
to the user. The raw ratio is rounded to two decimal places before threshold
mapping, so a displayed boundary value and its pace level cannot disagree.
Special presentation states are resolved before this normal threshold mapping.

## Threshold States

`PacePetsLogic.paceStateForRatio()` maps two-decimal display ratios to threshold
states:

| State            | Class                  | Two-decimal display ratio | Dashboard title  |
| ---------------- | ---------------------- | ------------------------- | ---------------- |
| `criticalBehind` | `pace-critical-behind` | `< 0.55`                  | Brake hard!      |
| `wellBehind`     | `pace-well-behind`     | `>= 0.55` and `< 0.75`    | Slow down        |
| `behind`         | `pace-behind`          | `>= 0.75` and `< 0.90`    | Ease up          |
| `on`             | `pace-on`              | `>= 0.90` and `<= 1.10`   | Keep pace        |
| `ahead`          | `pace-ahead`           | `> 1.10` and `<= 1.25`    | Pick up speed    |
| `strongAhead`    | `pace-strong-ahead`    | `> 1.25` and `<= 1.55`    | Push harder      |
| `wellAhead`      | `pace-well-ahead`      | `> 1.55`                  | Sprint faster!   |
| `muted`          | `pace-muted`           | unavailable               | Neutral fallback |

Big Bang, Perfect Sync, Perfect Zero, Splat, Singularity, and Nothingness are
presentation states, not threshold states. They sit above threshold mapping and
can override the displayed state when their exact rule matches or when the
dashboard has no usable pace reading.

## Perfect State Contract

Perfect states compare display-scale percent values, not hidden source
precision. Percent values are bounded to `0..100` and then rounded with
`Math.round()` before the perfect-state rules compare them. Current observed
WHAM usage-window data already reports whole-number `used_percent` values, so
live usage normally reaches display zero only when reported used percent is
`100`. The meaningful live rounding band is the locally computed time remaining
percent. In current WHAM data, display-scale usage is the reported integer
remaining percent; display-scale time is computed locally and rounded.
Dashboard percent text uses the same `roundedDisplayPercent()` rule through
`formatDisplayPercent()`, while bar widths retain their bounded fractional value.

| State                        | Surface                                   | Rule                                                                                              | Presentation                                                                                                             |
| ---------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Big Bang (`bigBang`)         | Dashboard and toolbar badge               | Display-scale remaining-usage percent and time-remaining percent both equal `100`.                | Uses the `bigBang` state with a controlled display ratio of `1.00`.                                                      |
| Perfect sync (`sync`)        | Dashboard and toolbar badge               | Display-scale remaining-usage percent equals display-scale time-remaining percent.                | Uses the `sync` state with a controlled display ratio of `1.00`.                                                         |
| Perfect zero (`perfectZero`) | Dashboard and toolbar badge               | Perfect sync is valid and display-scale remaining-usage percent is `0`.                           | Uses the `perfectZero` state with a controlled display ratio of `0.00`.                                                  |
| Singularity (`singularity`)  | Dashboard, browser tab, and toolbar badge | Perfect zero is valid and `Resets In` also displays zero while `resetsAt` is still in the future. | Uses the `singularity` state with a controlled display ratio of `0.00` and a reset countdown presentation of `0d 0h 0m`. |

The perfect states are mutually ordered by specificity. Big Bang wins over
Perfect Sync when the matching rounded percent is `100`. Singularity wins over
Perfect Zero on live presentation surfaces when its reset-countdown rule is also
true. Perfect Zero wins over Perfect Sync when the matching rounded percent is
zero.

Perfect presentation is normally suppressed when the reset window is stale,
meaning `resetsAt` is at or before the current time. The exception is held
zero-state presentation: when the latest known reading is already a zero-state,
the dashboard keeps that zero state instead of showing a new-window waiting
state until a new usage reading arrives. Perfect Zero can also be disallowed for
a current reset window when history shows usage already reached displayed zero
while rounded time still displayed above zero in that same window. Singularity
inherits that Perfect Zero guard and also requires the countdown display-zero
band, not an ended window.

## Display-Zero Timing Bands

Display-zero bands are separate product rules. They should not be treated as one
shared "zero" moment.

| Value                         | Display-zero rule                                                                                      | 5h window threshold               | 7d window threshold               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------- | --------------------------------- |
| Usage remaining percent       | `Math.round(remainingPercent) === 0`; current WHAM normally reaches this when `used_percent` is `100`. | No fractional live band observed. | No fractional live band observed. |
| Time remaining percent        | `Math.round(timeRemainingPercent) === 0` while `resetsAt` is still future.                             | Final `< 90s`                     | Final `< 50m 24s` (`< 50.4m`)     |
| `Resets In` countdown display | `Math.floor(remainingMs / 60000) === 0` while `resetsAt` is still future.                              | Final `< 60s`                     | Final `< 60s`                     |

At exactly the time-percent half-point, `Math.round(0.5)` returns `1`, so the
time percent still displays `1%`: exactly `90s` remaining for the 5h window, and
exactly `50m 24s` remaining for the 7d window. At exactly reset time, the
countdown displays `Window ended`, not zero.

Product implications:

- Perfect Zero can only appear after usage displays as `0%` remaining and the
  time percent display also reaches `0%`: final `< 90s` for 5h, final `< 50m
24s` for 7d.
- Singularity is narrower than Perfect Zero because `Resets In` must also display
  zero: final `< 60s` for both windows.
- Splat wins when usage displays as `0%` remaining while time percent still
  displays above zero: `>= 90s` remaining for 5h, `>= 50m 24s` remaining for 7d.
- If history already shows usage reached display zero earlier in the same reset
  window, the current guard keeps displayed-zero usage in Splat through the
  final zero-time band instead of promoting it to Perfect Zero or Singularity.
- After `resetsAt` passes, the dashboard holds the latest zero-state
  presentation instead of showing Nothingness with the waiting-for-reading copy.
  The next successful reset reading moves the display to Big Bang.

## Display-Hundred Timing Bands

Big Bang uses the same display-scale rounding model as the other perfect states.
It can appear only when usage remaining and time remaining both display as
`100%`. With current WHAM integer usage precision, usage normally displays
`100%` only when the provider reports `used_percent: 0`. Time remaining displays
`100%` at the start of a reset window until the locally computed time remaining
falls below `99.5%`: the first `90s` of a 5h window, and the first `50m 24s` of
a 7d window.

## Rough Countdown Transition Conditions

These rough countdown bands assume current WHAM integer usage precision. `R` is
the displayed remaining usage percent after normalization and rounding, derived
from `remainingPercent = 100 - used_percent`. The rows below assume displayed
`R = 0`; Perfect Zero and Singularity only apply when no earlier displayed-zero
history blocks perfect presentation in the same reset window. When that block
exists, displayed-zero usage remains Splat. After the window ends, the dashboard
holds whichever zero-state presentation was derived from the latest exhausted
reading until a new usage reading arrives.

### 5h Window

| Usage remaining  | Time remaining          | `Resets In` display | Duration              | State                        |
| ---------------- | ----------------------- | ------------------- | --------------------- | ---------------------------- |
| 0%               | 90 seconds or more      | 1 minute or more    | Until 90 seconds left | Splat (`splat`)              |
| 0%               | 60 to 89 seconds        | 1 minute            | About 30 seconds      | Perfect zero (`perfectZero`) |
| 0%               | 1 to 59 seconds         | 0 minutes           | About 59 seconds      | Singularity (`singularity`)  |
| 0%               | 0 seconds or past reset | Window ended        | Until next reading    | Held zero state              |
| Non-zero/unknown | 0 seconds or past reset | Window ended        | Ended                 | Ended or stale window        |

### 7d Window

| Usage remaining  | Time remaining                      | `Resets In` display | Duration           | State                        |
| ---------------- | ----------------------------------- | ------------------- | ------------------ | ---------------------------- |
| 0%               | 50 minutes 24 seconds or more       | 50 minutes or more  | Until 50m 24s left | Splat (`splat`)              |
| 0%               | 60 seconds to 50 minutes 23 seconds | 1 to 50 minutes     | About 49m 24s      | Perfect zero (`perfectZero`) |
| 0%               | 1 to 59 seconds                     | 0 minutes           | About 59 seconds   | Singularity (`singularity`)  |
| 0%               | 0 seconds or past reset             | Window ended        | Until next reading | Held zero state              |
| Non-zero/unknown | 0 seconds or past reset             | Window ended        | Ended              | Ended or stale window        |

If the first observed displayed-`R = 0` sample arrives during the final countdown
minute and no earlier displayed-zero history blocks perfect presentation, the
display can enter Singularity directly. If displayed `R = 0` is observed
earlier, the current history guard keeps later displayed-zero presentation in
Splat. Once the reset time passes, the dashboard keeps the held zero-state
presentation until the next successful usage reading replaces it.

## Imperfect State Contract

Splat is an imperfect special state. It uses displayed-zero remaining usage,
which is commonly derived from source-reported `used_percent: 100` in current
WHAM data. Live Splat wins before the final rounded time band. Held zero-state
presentation can keep Splat visible after the reset boundary until a new usage
reading arrives.

Nothingness is the user-facing imperfect state for interim dashboard card
presentations where no usable pace ratio exists. It has no icon asset; the
dashboard and rail render only a faint icon-slot outline. The rail remains
visible and highlights Nothingness unless it is explicitly hidden through the
local developer controls. In Nothingness, the rail retains its normal catalog
palette beneath the same synchronized black pulse used by the main panel.

| State                       | Surface                     | Rule                                                                                         | Presentation                                                      |
| --------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Splat (`splat`)             | Dashboard and toolbar badge | Rounded remaining-usage percent displays as `0` and rounded time-remaining percent is `> 0`. | Uses the `splat` state with a controlled display ratio of `0.00`. |
| Nothingness (`nothingness`) | Dashboard                   | No usable live pace reading for the selected interim condition.                              | Uses the `nothingness` state with no pace ratio.                  |

Perfect Zero wins when both usage and time display as zero. That avoids treating
a provider-rounded usage `0` as absolute exhaustion during the final rounded time
band.

## Legend And Preview Order

`collector/extension/pace-state-data.js` owns pace-state group membership and
display order. Dashboard legend metadata and local developer controls both
derive their level, perfect-state, and imperfect-state projections from that
catalog:

```text
levels: wellAhead, strongAhead, ahead, on, behind, wellBehind, criticalBehind
perfect: bigBang, sync, perfectZero, singularity
imperfect: splat, nothingness
```

Preview controls are owned by `collector/extension/preview-control.js`.
Synthetic preview ratios are based on a default `50%` time remaining. The
dashboard rail is passive and highlights the active state; local developer
controls can still force regular, perfect, and imperfect states for inspection.
Rail size, spacing, type scale, and icon dimensions are owned by
`collector/extension/dashboard-rail.css`; state and theme styles may adjust
contrast for dark space presentations but should not redefine rail structure.
Forced toolbar badge states use the same synthetic ratio model except
Nothingness, which is a no-ratio dashboard preview.

Synthetic and forced developer states use one preview timing model for percent
bars, chart data, reset dates, reset progress, and `Resets in`. Regular examples
derive reset timing from their synthetic percent pair. Forced Big Bang uses exact
`100%` usage and time. Forced Perfect Zero uses a small positive pair that
displays as `0%` for usage and time, while forced Singularity uses exact zero
and keeps the explicit `0d 0h 0m` countdown. Forced Splat keeps usage at exact
zero while reusing the selected live window's time remaining when available, so
its `Time remaining` percent stays aligned with the live `Resets in` countdown.
Dev controls expose explicit Splat timing variants for the two animation
branches: `splatTimeRemainingPreview: "over50"` uses `75%` time remaining, and
`splatTimeRemainingPreview: "under50"` uses `49%` time remaining.

Splat's active status icon plays a one-time free-fall animation on entry into
the state. The resting Splat icon stays hidden until the falling icon reaches
the status icon area. Passive time refreshes while Splat remains active do not
replay the animation. Leaving forced Splat active in dev controls also does not
replay on interval refreshes, but turning Splat on again or reloading the
dashboard while Splat is active can replay it once. At the impact moment, the
status card briefly teeters and the ratio stat pops upward before both settle.
When the displayed time-remaining percent is over `50%`, Splat always plays the
full rare Max Splat sequence. Dev controls use the `Splat >50%` timing preview
to force that full sequence. At `50%` or below, each Splat entry chooses one of
three entry modes: a normal ratio bounce 75% of the time, a max-normal regular
ratio bounce 20% of the time, or the full rare Max Splat sequence 5% of the
time. Normal and max-normal entries still randomize the ratio pop drift,
rebound, duration, and card teeter profile. In the full rare sequence, the
free-fall figure lands on a faster max-preview fall, a larger first card teeter
plays, then the ratio launches after a `60ms` beat, rockets straight up through
`-620px` toward `-5000px`, hangs briefly, descends through vertical checkpoints,
slams down to `138px`, quickly settles back at the ratio stat, and throws the
same free-fall figure from the severe 0.00-slam impact peak into a rotated Splat
icon on the browser side wall. The wall Splat then slides down, switches back to
the free-fall figure for a short drop, pauses midair for an extended spin, and
slams into a rubber-wide final
Splat icon on the bottom browser edge. The final Splat icon holds with a subtle
widening pulse until the dashboard leaves Splat, while the status card runs a
larger teeter aligned to the slam-back moment.

Pace icon motion is status-card-only. The active dashboard status icon may render
state-specific effects.

Regular pace levels and Perfect Sync use a shared dashboard-card transition when
the displayed pace state changes from another regular level or Perfect Sync.
The card fades down briefly, swaps to the new state, then fades back in. A small
finite pulse appears beside the usage-window control in the new state's
dashboard color as a short state-change afterglow. Big Bang, Perfect Zero,
Singularity, Splat, Nothingness, and transitions to or from those states do not
use this shared pulse/fade because their presentation is either static/interim
or already handled by a state-specific transition. Local
developer controls include a one-shot Pace transition action that stages Keep
pace, then previews the shared transition into Brake hard without storing
developer option state.

The `wellAhead` / Sprint faster state uses the dashboard-only smoke and scooter
motion effect in `collector/extension/dashboard-sprint-smoke-methods.js` and
`collector/extension/dashboard-pace-card.css`. Sprint faster remains one pace
state for all ratios above `1.55`; within that state, the actual ratio
continuously increases a capped animation intensity. Higher Sprint faster ratios
shorten scooter bounce and smoke durations, lengthen smoke drift, and make speed
bump bursts more frequent, taller, and slightly more tilted without replaying
the effect on same-state refreshes.
Local dev controls can force Sprint faster at exact preview ratios `1.55`,
`2.00`, `3.00`, `4.00`, `5.00`, `6.00`, and `7.00`.

The `on` / Keep pace state uses the dashboard-only train roll and smoke effect
in `collector/extension/dashboard-train-roll-methods.js`,
`collector/extension/dashboard-train-roll.css`, and
`collector/extension/dashboard-train-smoke.js`. Puffs emit from a fixed train
stack origin, follow bounded-random quadratic arcs, and occasionally use a
longer normal arc with a matching longer duration so the smoke extends farther
without speeding up. Those longer normal arcs use a lower peak opacity and an
earlier fade so they dissipate with the train's visual orientation instead of
reading as detached smoke bubbles. A rare separate escape profile continues
selected puffs onto a much longer cubic float up and away path. Same-state
refreshes preserve the running effect, reduced-motion settings disable smoke,
and the legend rail remains static.

The reset countdown card has an Exhausted man rescue presentation owned by
`collector/extension/dashboard-reset-exhausted-methods.js` and
`collector/extension/dashboard-reset-exhausted.css`. Local developer controls
can force it with `resetExhaustedPreview`, and live Splat can also schedule it
after the falling Splat intro finishes. The developer preview shows the traced
tired figure and message immediately, then repeats on the same bounded cadence
while the preview remains enabled and the dashboard is not currently in Splat.
While Splat remains current, the rescue sequence waits for a bounded delay,
shows the traced tired figure and message, then repeats on later bounded delays
until the dashboard leaves Splat. The developer override is the only stored
field; live Splat rescue state is transient dashboard timer and DOM state.

The same card shows projected pace burn out by linearly extrapolating the
current window's used percent over elapsed time, including projections that land
after the scheduled reset.

The source visual asset remains
`collector/extension/themes/default/effects/reset-exhausted/exhausted-person.png`,
which is kept as the raster reference for the seated, slumped pose. The active
presentation renders an inline SVG trace so the free arm can animate
independently without modifying or masking the PNG. The whole traced figure
shares the same subtle rocking motion; reduced-motion settings disable that
rock. Keep the base PNG available while iterating on the trace, because it
remains the visual target for pose, face, scale, and future asset work.

For small organic or atmospheric effects, prefer a focused canvas renderer over
stacked CSS gradients once the visual depends on noisy asymmetry, soft plumes,
or nonuniform shimmer. CSS works well for flat legend treatment and simple
transforms, but canvas is a better fit when a tiny control needs to feel
photographic rather than geometric.

The Perfect Zero dashboard theme control uses
`collector/extension/dashboard-eclipse-icon.js` to render a total-eclipse icon
while the full-page Perfect Zero background is active. The renderer appends a
high-DPI canvas inside the existing theme button icon, draws a soft base corona,
irregular plumes, low-alpha wispy rays, sparse rim glints, and then a crisp dark
moon disk on top. The animation remains intentionally subtle: slow plume
breathing, slight ray shimmer, and rare rim glints. Leaving Perfect Zero removes
the canvas from the control.

The `behind` / Ease up state uses a dashboard-only CSS effect in
`collector/extension/dashboard-ease-up-methods.js` and
`collector/extension/dashboard-ease-up.css`, with keyframes isolated in
`collector/extension/dashboard-ease-up-keyframes.css`. The active status card
visibly breathes with separate fill and border layers that bulge at the center
while keeping the side endpoints anchored; a brief center contraction precedes
the outward swell. The status icon, copy, and ratio use a smaller synchronized
transform-only breath with slight vertical drift so they move with the shape
without affecting layout. The icon layer renders short SVG mug-steam squiggles
with an in-place shimmer.
Same-state refreshes preserve the effect, reduced-motion settings disable the
looping motion, and the legend rail remains static.

The `wellBehind` / Slow down state uses the dashboard-only slow-wobble and
cart-spill effect in `collector/extension/dashboard-pace-wobble-methods.js`,
`collector/extension/dashboard-cart-spill-data.js`,
`collector/extension/dashboard-cart-spill-methods.js`,
`collector/extension/dashboard-cart-spill-pile-renderer.js`, and
`collector/extension/dashboard-cart-spill.css`. Periodic wobble bursts may use a
normal or extreme profile. Grocery PNGs from
`collector/extension/themes/default/grocery_icons/` launch from the status icon,
follow bounded-random toss paths, and settle into a bottom-of-viewport pile that
is cleaned up when Slow down exits. Same-state refreshes preserve the running
effect; reduced-motion settings skip the thrown grocery launches.

The `criticalBehind` / Brake hard state uses the dashboard-only brake-wobble
effect in `collector/extension/dashboard-pace-wobble-methods.js`,
`collector/extension/dashboard-brake-debris-data.js`,
`collector/extension/dashboard-brake-debris-methods.js`,
`collector/extension/dashboard-brake-extreme-canvas-methods.js`, and
`collector/extension/dashboard-brake-debris.css`. The first burst is normal.
Later bursts choose normal, wide, escape, or extreme ranges. Brake hard remains
one pace state for all ratios below `0.55`; within that state, the actual ratio
continuously increases a capped animation intensity as it approaches `0.00`.
Higher Brake hard intensity shifts later burst odds from
60% / 25% / 12% / 3% toward 35% / 25% / 15% / 25%, shortens repeat delay from
`1600-3400ms` toward `1200-2600ms`, and increases extreme canvas debris from
`5000-10000` particles toward `8000-14000`. Wide and escape bursts emit SVG
debris from the status icon; extreme bursts use a high-DPI canvas particle
layer for many tiny fragments, sparks, and smoke. Same-state refreshes preserve
the running wobble while updating intensity; reduced-motion settings skip debris
launches. Local dev controls can force Brake hard at exact preview ratios
`0.55`, `0.45`, `0.35`, `0.25`, `0.15`, `0.05`, and `0.00`.

The `sync` / Perfect Sync state keeps its existing gentle status-icon float and
adds a dashboard-only yellow sunburst on the page background layer behind the
main panel. The canvas renderer in
`collector/extension/dashboard-sync-sunburst-renderer.js` centers the sunburst
near the status icon position and slowly grows it from a point to a panel-scale
glow over a single 30-second entry animation. Each new sunburst gets a fresh
bounded-random ray field, so the final burst is slightly larger than the main
panel with varied ray placement, widths, bright yellow tones, and a relatively
even outer ray length. A broader center bloom sits behind the status icon with a
softened resting opacity. The main usage panel background fades to transparent
after a slight delay so the page-layer sunburst establishes first, then becomes
increasingly visible behind the UI without fading panel contents. Secondary
inner dashboard cards render transparent with warm softened borders in this
state; the tinted `sync` pace status container background fades on the same
curve while keeping a slightly stronger warm outline. The sunburst rise is a
one-time page-session animation; re-renders continue from the original start
time instead of restarting the rise. After it completes, the ray field remains
alive while old rays fade out and new rays fade in faster from the same
bounded-random sunburst parameters unless reduced motion is enabled. Fully risen
rays also apply their own slow bounded length motion, so individual ray tips
subtly extend and recede without changing the sunburst center or restarting the
entry animation. The turnover starts lightly midway through the rise, ramps up
near the end, and uses the full-strength turnover after the rise completes.
After 60 continuous seconds in Perfect Sync, the dashboard clones the status
monk into a fixed page layer, hides the in-card icon, and launches the clone
through a bounded-random 70-degree upward cone. The escaped monk uses the same
mirrored viewport wall-bounce motion as the Perfect Zero planets. Leaving Sync
tears down the clone and resets the 60-second entry clock. Reduced-motion
settings skip the escape.

The `strongAhead` / Push harder state uses a dashboard-only WebGL canvas mesh
effect in `collector/extension/dashboard-push-stretch-methods.js` and
`collector/extension/dashboard-push-stretch.css`. The main status icon texture is
warped along the lower-left-foot-to-head axis so the root stays pinned while the
head end expands more. A matching 2D canvas layer emits small sweat beads from
the transformed head area. Pulse levels choose seeded bead-count ranges: normal
uses one to three beads, extreme uses four to six, and rare uses seventy-five to
one hundred twenty-five. Launch timing, bead size, lift, spin, and travel vary per
pulse without frame-to-frame jitter, with larger levels using larger bead boosts
and longer previous-pulse trail windows. Rare keeps its full carry-over only when
the next pulse is also rare; transitions from rare into normal or extreme use a
short carry-over so stale rare geometry does not flash during the shorter stretch.
The status card also renders a clipped canvas water layer behind the content so
the falling drops land into a slowly rising shimmer pool. The pool starts empty
when Push harder is entered or the dashboard page is loaded, rises toward its cap,
and does not loop back to empty while Push harder remains the active pace state.
As the pool fills, `collector/extension/dashboard-push-tank-renderer.js` adds a
small staged fish-tank scene using selected PNGs from
`collector/extension/themes/default/ocean-icons/`: a few swimmers arrive first,
then restrained bottom decor and crawlers appear at higher fill levels. Near max
fill, a shark or surface-height whale can pass through without tying the scene to
pulse intensity. See `docs/reference/push-harder-fish-tank.md` for the tank's
asset, staging, and orientation rules.
The dashboard's boundary-aware time-sensitive refresh reapplies the pace
summary at the next visible presentation change, with a maximum 60-second wait,
so the active Push harder effect is preserved across same-state refreshes to
keep the pool from resetting. Leaving Push harder or reloading the dashboard
tears down the effect and resets the pool. The local developer controls include a
max-pool-fill preview that forces that water layer to its configured cap for
inspection and a one-shot Rare burst (5%) action that forces the next pulse to
the rare profile. The legend rail remains static. The first pulse after
entering Push harder is normal; each later pulse chooses normal, extreme, or
rare at 75% / 20% / 5% odds.
Extreme and rare pulses use progressively longer expansion lines and larger
cone-shaped head stretch.

The `ahead` / Pick up speed state uses the dashboard-only speed-lines effect in
`collector/extension/dashboard-speed-lines-methods.js`,
`collector/extension/dashboard-speed-lines.css`, and
`collector/extension/dashboard-speed-tail.css`. Its normal burst keeps the dog in
a crouch, pauses, runs one tail-wag cycle, pauses again, jumps into the orbit,
then loops normally. After the first burst in an active Pick up speed state,
later bursts may use the extreme orbit variant, which extends the tail-wag count
before launch and uses the larger/wobbling orbit timing.

The forced developer override can also render perfect and imperfect context
states outside the regular pace levels.

The `bigBang` state runs a dashboard-only transition when the dashboard enters
that state from any other state. The transition immediately hides dashboard
chrome, plays a full-viewport generated canvas scene with a small bright
opening flash inside billowing vapor and dust plumes, then follows with a more
violent broken shock-front burst. It throws only sparks, specks, dust, and stars
outward, lets the blast take over the viewport, then shrinks the remaining
energy back into the center as if receding into the distance. The resulting Big
Bang star field thins into residual matter while the shared full-page space
backdrop is prepared underneath the opaque Big Bang canvases. The canvases then
fade away over that real backdrop while the dashboard chrome stays hidden; the
dashboard fades in later, after the shared space backdrop is already established.
Same-state refreshes do not replay the transition. Local dev controls expose a
Video Capture section with a one-shot `Replay Big Bang` action that restarts
the presentation only when the dashboard is already on Big Bang. If Big Bang is
selected from the developer controls while the dashboard tab is hidden, the
transition is queued. When the dashboard becomes visible, it refreshes the
current time-sensitive state first and plays only if Big Bang remains current.
After playback starts, ordinary pace-state changes update the dashboard DOM
under the active transition instead of cancelling it. If the dashboard becomes hidden
during playback, the controller stops transition audio, tears down temporary
scenes and presentation classes, exposes the latest rendered dashboard state,
and does not replay the interrupted transition when the tab becomes visible.
Reduced-motion users skip the animated sequence.

Current Big Bang transition timing is measured from the first animation frame in
`collector/extension/dashboard-big-bang-scene.js`. The scene has a 2-second
blank pre-hold, then passes post-hold elapsed time into the 2D opening canvas
and the WebGL flagship expansion overlay. The 2D opening draw still subtracts
another 720ms for the seed sparkle before the stage-one bang helpers activate.

| Approx visible window | Beat / code area                                                                                                                                                                                            |
| --------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|            `0-2000ms` | Blank dark pre-hold (`PRE_BANG_HOLD_MS`).                                                                                                                                                                   |
|         `2000-2720ms` | Tiny center seed sparkle (`SEED_SPARKLE_MS`).                                                                                                                                                               |
|         `2720-4320ms` | First ignition flash, plumes, and near-center sparks (`drawStageOneExplosion()`, `drawIgnitionPlumes()`, spark particles).                                                                                  |
|         `2520-5240ms` | Dense WebGL ray volley: fast hero rays, seeded needle-ray cascade, and spark-like streaks over the seed/stage-one opening (`crackRayBurst()`).                                                              |
|        `4380-14600ms` | WebGL hard ray eruption, delayed bloom, residue, and sparse handoff matter; WebGL does not draw the final stable starfield (`dashboard-big-bang-webgl-renderer.js`, `dashboard-big-bang-webgl-shaders.js`). |
|         `4600-7800ms` | Shared full-page space backdrop fades in underneath the Big Bang cover (`SPACE_BACKGROUND_REVEAL_AT_MS`, `SPACE_BACKGROUND_REVEAL_DURATION_MS`).                                                            |
|         `7200-9600ms` | The opaque 2D Big Bang cover fades out, exposing the shared backdrop behind the WebGL explosion (`CANVAS_COVER_FADE_AT_MS`, `CANVAS_COVER_FADE_DURATION_MS`).                                               |
|       `11400-14600ms` | WebGL Big Bang fades away over the already-visible shared backdrop (`SPACE_REVEAL_AT_MS`, `CANVAS_FADE_DURATION_MS`).                                                                                       |
|             `14200ms` | Dashboard chrome reveal starts (`DASHBOARD_REVEAL_AT_MS`).                                                                                                                                                  |
|             `14600ms` | Big Bang canvases are removed (`CANVAS_DONE_AT_MS`).                                                                                                                                                        |
|       `14200-19400ms` | Dashboard chrome opacity fade (`DASHBOARD_FADE_DURATION_MS`).                                                                                                                                               |
|             `19400ms` | Transition promise completes.                                                                                                                                                                               |

The prior 2D middle/aftermath helpers remain in source for comparison, but the
active WebGL trial disables legacy 2D ejecta, stage-two core, envelope, rays,
shock arcs, receding envelope, dust, and star particle layers via constants in
`collector/extension/dashboard-big-bang-scene-draw.js`.

See `docs/reference/big-bang-transition.md` for the Big Bang-specific product
contract, runtime file map, timing table, and animation lessons learned from
the Canvas-only and Big Bang 2 trials.

The `singularity` state runs a dashboard-only transition when the dashboard
enters that state from any other state. The transition fades from the prior
state into the shared space backdrop, holds briefly on blank space, fades the
dashboard chrome back in, then starts the WebGL black-hole approach scene. The
black-hole canvas stays behind the dashboard chrome. Singularity uses the
shared full-page space backdrop without Perfect Zero's status-icon featured
planet. As the approach nears collapse, the shader increases disk turbulence,
photon-ring flares, lensing shock ripples, jet flicker, and infalling-glint
acceleration. Around the glint suction timing, a chrome-collapse phase splits
real main-panel containers and state-rail items, pulls them along circular
inward paths, recedes them through CSS perspective, rotates them with
pull-direction 3D torque, and stretches them toward the black hole. Owned inner
fragments then tear loose on an overlapping delay while the parent pieces
continue falling, and all pieces shrink into the horizon without an explosive
breakup. When the black-hole approach completes, the same WebGL scene keeps
advancing behind the still-collapsing chrome, keeps the horizon attached to the
existing black-hole center, expands into the viewport, descends through a
cone/funnel visualization, falls through the singularity point into a full
whiteout, then plays the shared checkerboard reveal over the current dashboard
state. Same-state refreshes do not replay the transition. If Singularity is
selected from the separate developer controls while the dashboard tab is
hidden, the transition is queued. Visibility return refreshes the current
time-sensitive state first and plays only if Singularity remains current. After
playback starts, ordinary pace-state changes update the dashboard DOM under the
active transition instead of cancelling it. Reduced-motion users skip the
animated sequence. If the dashboard becomes hidden during playback, the
controller invalidates the active run, tears down the temporary WebGL and DOM
presentation, reveals the latest dashboard state, and does not replay the
interrupted transition when visibility returns. The renderer also removes the
temporary WebGL canvas and restores distorted chrome at terminal whiteout, when
motion effects are explicitly stopped, or when a transition phase fails. See
`docs/reference/singularity-transition.md` for the full architecture and
lifecycle contract.

## Display Caps

Dashboard pace text uses `PacePetsLogic.formatPaceRatioValue()` with a display
cap of `100+`. Positive values below `0.01` display as `<0.01`.

The dashboard's inactive-window ratio keeps the window label neutral and tints
only the numeric value with that inactive window's pace state color.

Toolbar badge text normally uses the same formatter with a cap of `10+`; tiny
positive values round to `0.01` rather than using the `<0.01` display form. If
any supported window is `criticalBehind`, the badge uses attention mode instead:
it shows the worst critical window's compact label (`7d` or `5h`) on that
state's badge color, while the tooltip carries the exact critical pace value.
When both windows are critical, the lower pace ratio wins; equal ratios prefer
the stored badge window.

The toolbar badge recomputes its presentation from stored history at the
`refresh-schedule.js` presentation interval, separately from the
`refresh-schedule.js` usage collection alarm. Each pass evaluates the immutable
presentation for every real supported window. Splat, Perfect Zero, and
Singularity are stored as semantic per-window holds with the window's
`resetsAt` value as identity; forced and critical-window developer previews are
excluded.

An active dashboard render captures one live timestamp and uses it consistently
for every time-derived value in that render, including time remaining, pace
ratio and state, alternate-window ratio, reset countdown, reset budget rate, and
burnout projection. An open page evolves the same semantic hold across the exact
reset boundary. Reloaded pages accept a persisted hold only when its window key
and reset identity match; otherwise a stale window shows Nothingness. Legacy
timestamp metadata is discarded rather than retained as a second state path.

The chart clamps plotted pace values to `0..50` through
`PacePetsLogic.chartPaceRatio()`. `dashboard.js` narrows the visible y-axis for
normal ranges, expands high ranges in coarser steps, and marks capped tooltip
values when raw pace is outside the plotted bounds. Historical points remain
anchored to their collection timestamps. Full and cached renders use the same
dashboard render timestamp for one synthetic live endpoint; cached refreshes
replace that endpoint, crossings, cap metadata, and y bounds without recreating
the Chart instance or accumulating synthetic points.

## Asset Ownership

Each shipped pace state gets its image path from
`collector/extension/themes/default/asset-manifest.js`. The same manifest owns
the explicit non-packaged pace-state exceptions used by static checks; the muted
state has no playful image, Nothingness uses an outline placeholder, and
Singularity uses generated in-memory art. Big Bang uses the packaged
`pace-icons/big-bang.png` raster icon for dashboard and state-rail presentation.
Its dashboard-only transition uses a temporary
generated canvas overlay and the shared full-page space backdrop. Perfect Zero
also uses the dedicated canvas scene in
`collector/extension/perfect-zero-space-scene.js` when the main dashboard card
enters the Perfect Zero presentation, plus the dashboard-only canvas eclipse in
`collector/extension/dashboard-eclipse-icon.js` for the theme control while the
Perfect Zero page background is active.

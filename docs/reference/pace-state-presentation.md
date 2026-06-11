# Pace State Presentation

Status: reference.

Pace presentation is owned by `collector/extension/pace-logic.js`. The
dashboard, toolbar badge, chart, favicon, and developer override controls reuse
that shared state model instead of each surface defining its own thresholds.

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
percent is zero, the ratio is unavailable and the muted state is used.

Percent inputs are bounded to `0..100`. Display surfaces choose their own
formatting, but the stored history keeps source precision after normalization.

## Threshold States

`PacePetsLogic.paceStateForRatio()` maps numeric ratios to threshold states:

| State            | Class                  | Ratio                   | Dashboard title   |
| ---------------- | ---------------------- | ----------------------- | ----------------- |
| `criticalBehind` | `pace-critical-behind` | `< 0.55`                | Brake hard!       |
| `wellBehind`     | `pace-well-behind`     | `>= 0.55` and `< 0.75`  | Slow down         |
| `behind`         | `pace-behind`          | `>= 0.75` and `< 0.90`  | Ease up           |
| `on`             | `pace-on`              | `>= 0.90` and `<= 1.10` | Keep pace         |
| `ahead`          | `pace-ahead`           | `> 1.10` and `<= 1.25`  | Pick up speed     |
| `strongAhead`    | `pace-strong-ahead`    | `> 1.25` and `<= 1.55`  | Push harder       |
| `wellAhead`      | `pace-well-ahead`      | `> 1.55`                | Sprint faster!    |
| `muted`          | `pace-muted`           | unavailable             | Waiting for usage |

Perfect Sync, Perfect Zero, Splat, and Singularity are controlled
presentation states, not threshold states. They sit above threshold mapping and
can override the displayed state when their exact rule matches.

## Perfect State Contract

Perfect states use display rounding, not exact raw equality. Percent values are
bounded to `0..100` and then rounded with `Math.round()` before the perfect-state
rules compare them. A round zero can therefore be a small positive source value
that displays as `0%`.

| State                        | Surface                     | Rule                                                                                              | Presentation                                                                                                             |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Perfect sync (`sync`)        | Dashboard and toolbar badge | Rounded remaining-usage percent equals rounded time-remaining percent.                            | Uses the `sync` state with a controlled display ratio of `1.00`.                                                         |
| Perfect zero (`perfectZero`) | Dashboard and toolbar badge | Perfect sync is valid and rounded remaining-usage percent is `0`.                                 | Uses the `perfectZero` state with a controlled display ratio of `0.00`.                                                  |
| Singularity (`singularity`)  | Dashboard and toolbar badge | Perfect zero is valid and `Resets In` also displays zero while `resetsAt` is still in the future. | Uses the `singularity` state with a controlled display ratio of `0.00` and a reset countdown presentation of `0d 0h 0m`. |

The three perfect states are mutually ordered by specificity. Singularity wins
over Perfect Zero on the dashboard when its reset-countdown rule is also true.
Perfect Zero wins over Perfect Sync when the matching rounded percent is zero.

Perfect presentation is suppressed when the reset window is stale, meaning
`resetsAt` is at or before the current time. Perfect Zero can also be disallowed
for a current reset window when history shows usage already reached displayed
zero while rounded time still displayed above zero in that same window.
Singularity inherits that Perfect Zero guard and also requires the countdown
display-zero band, not an ended window.

## Imperfect State Contract

Splat is an imperfect special state. It uses source-reported zero usage, but it
only wins before the final rounded time band because upstream source precision
can be whole-percent at the low end.

| State           | Surface                     | Rule                                                                                    | Presentation                                                      |
| --------------- | --------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Splat (`splat`) | Dashboard and toolbar badge | Remaining usage percent is reported as `0` and rounded time-remaining percent is `> 0`. | Uses the `splat` state with a controlled display ratio of `0.00`. |

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
perfect: sync, perfectZero, singularity
imperfect: splat
```

Preview controls are owned by `collector/extension/preview-control.js`.
Synthetic preview ratios are based on a default `50%` time remaining. The
dashboard rail is passive and highlights the active state; local developer
controls can still force regular, perfect, and imperfect states for inspection.
Forced toolbar badge states use the same synthetic ratio model.

Synthetic and forced developer states use one preview timing model for percent
bars, chart data, reset dates, reset progress, and `Resets in`. Regular
examples derive reset timing from their synthetic percent pair. Forced Perfect
Zero uses a small positive pair that displays as `0%` for usage and time, while
forced Singularity uses exact zero and keeps the explicit `0d 0h 0m` countdown.
Forced Splat keeps usage at exact zero while reusing the selected live window's
time remaining when available, so its `Time remaining` percent stays aligned
with the live `Resets in` countdown.

Splat's active status icon plays a one-time free-fall animation on entry into
the state. The resting Splat icon stays hidden until the falling icon reaches
the status icon area. Passive time refreshes while Splat remains active do not
replay the animation. Leaving forced Splat active in dev controls also does not
replay on interval refreshes, but turning Splat on again or reloading the
dashboard while Splat is active can replay it once. At the impact moment, the
status card briefly teeters and the ratio stat pops upward before both settle.

Pace icon motion is status-card-only. The active dashboard status icon may render
state-specific effects.

The `wellAhead` / Sprint faster state uses the dashboard-only smoke and scooter
motion effect in `collector/extension/dashboard-sprint-smoke-methods.js` and
`collector/extension/dashboard-pace-card.css`. Sprint faster remains one pace
state for all ratios above `1.55`; within that state, the actual ratio
continuously increases a capped animation intensity. Higher Sprint faster ratios
shorten scooter bounce and smoke durations, lengthen smoke drift, and make speed
bump bursts more frequent without replaying the effect on same-state refreshes.

The `on` / Keep pace state uses the dashboard-only train roll and smoke effect
in `collector/extension/dashboard-train-roll-methods.js`,
`collector/extension/dashboard-train-roll.css`, and
`collector/extension/dashboard-train-smoke.js`. Puffs emit from a fixed train
stack origin, follow bounded-random quadratic arcs, and occasionally use a
longer normal arc with a matching longer duration so the smoke extends farther
without speeding up. A rare separate escape profile continues selected puffs
onto a much longer cubic float up and away path. Same-state refreshes preserve
the running effect, reduced-motion settings disable smoke, and the legend rail
remains static.

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
`collector/extension/dashboard-ease-up.css`. The active status card visibly
breathes with separate fill and border layers that bulge at the center while
keeping the side endpoints anchored; a brief center contraction precedes the
outward swell. The status icon, copy, and ratio use a smaller synchronized
transform-only breath with slight vertical drift so they move with the shape
without affecting layout. The icon layer renders short SVG mug-steam squiggles
with an in-place shimmer.
Same-state refreshes preserve the effect, reduced-motion settings disable the
looping motion, and the legend rail remains static.

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
The dashboard's 60-second time-sensitive refresh reapplies the pace summary, so
the active Push harder effect is preserved across same-state refreshes to keep
the pool from resetting. Leaving Push harder or reloading the dashboard tears
down the effect and resets the pool. The local developer controls include a
max-pool-fill preview that forces that water layer to its configured cap for
inspection. The legend rail remains static. The first pulse after entering Push
harder is normal; each later pulse chooses normal, extreme, or rare at
75% / 20% / 5% odds.
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

The `singularity` state runs a dashboard-only transition when the dashboard
enters that state from any other state. The background worker accepts the
ephemeral capture request only from `dashboard.html`, captures the visible
dashboard tab for render input, and returns the image data URL to the dashboard
renderer. `collector/extension/dashboard-singularity-transition-renderer.js`
uses that image in memory to break the dashboard into canvas tiles, pull them
into a black-hole center, hold on a small singularity point, and expand into a
brief big-bang reveal. Same-state refreshes do not replay the transition.
If Singularity is selected from the separate developer controls while the
dashboard tab is hidden, the transition is queued and plays when the dashboard
becomes visible. Reduced-motion users get a short non-fragmenting pulse. The
renderer removes the overlay and releases the capture references when the
sequence ends or the state changes. See
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

The toolbar badge recomputes its presentation from stored history once per
minute, separately from the five-minute usage collection alarm. That keeps
time-derived pace ratios aligned with the dashboard's minute-level cached
history refresh without making extra usage endpoint requests.

The chart clamps plotted pace values to `0..50` through
`PacePetsLogic.chartPaceRatio()`. `dashboard.js` narrows the visible y-axis for
normal ranges, expands high ranges in coarser steps, and marks capped tooltip
values when raw pace is outside the plotted bounds.

## Asset Ownership

Each shipped pace state gets its image path from
`collector/extension/themes/default/asset-manifest.js`. The same manifest owns
the explicit non-packaged pace-state exceptions used by static checks; the
muted state has no playful image, and Singularity uses generated in-memory art.
Perfect Zero also uses the dedicated canvas scene in
`collector/extension/perfect-zero-space-scene.js` when the main dashboard card
enters the Perfect Zero presentation, plus the dashboard-only canvas eclipse in
`collector/extension/dashboard-eclipse-icon.js` for the theme control while the
Perfect Zero page background is active.

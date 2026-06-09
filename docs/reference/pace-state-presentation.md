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
zero while time still remained in that same window. Singularity inherits that
Perfect Zero guard and also requires the countdown display-zero band, not an
ended window.

## Imperfect State Contract

Splat is an imperfect special state. It uses exact source usage, not display
rounding.

| State           | Surface                     | Rule                                                           | Presentation                                                      |
| --------------- | --------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| Splat (`splat`) | Dashboard and toolbar badge | Remaining usage percent is exactly `0` and time remains `> 0`. | Uses the `splat` state with a controlled display ratio of `0.00`. |

Splat wins over Perfect Zero when usage is exactly zero and the reset window
still has time remaining, even if display rounding would otherwise make the time
percent look like zero.

## Legend And Preview Order

The dashboard legend uses dashboard-owned level, perfect-state, and
imperfect-state key lists:

```text
levels: wellAhead, strongAhead, ahead, on, behind, wellBehind, criticalBehind
perfect: sync, perfectZero, singularity
imperfect: splat
```

Preview controls are owned by `collector/extension/preview-control.js`.
Synthetic preview ratios are based on a default `50%` time remaining. The
dashboard does not expose clickable pace-state previews; local developer
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

The chart clamps plotted pace values to `0..50` through
`PacePetsLogic.chartPaceRatio()`. `dashboard.js` narrows the visible y-axis for
normal ranges, expands high ranges in coarser steps, and marks capped tooltip
values when raw pace is outside the plotted bounds.

## Asset Ownership

Each shipped pace state gets its image path from
`collector/extension/themes/default/asset-manifest.js`. The muted state has no
playful image. Perfect Zero also uses the dedicated canvas scene in
`collector/extension/perfect-zero-space-scene.js` when the main dashboard card
enters the Perfect Zero presentation.

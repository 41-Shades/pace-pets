# Pace State Presentation

Status: reference.

Pace presentation is owned by `collector/extension/pace-logic.js`. The
dashboard, toolbar badge, chart, favicon, and preview controls reuse that shared
state model instead of each surface defining its own thresholds.

When running the unpacked extension, local developer settings can force one pace
state for the dashboard card and toolbar badge. That display override is owned by
`collector/extension/developer-options.js`, reuses the preview-control synthetic
ratios and percent pairs, and remains active until cleared.

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

Perfect Sync and Perfect Zero are controlled presentation states, not threshold
states. They can override the displayed state when the rounded usage and time
percentages match.

## Controlled States

Perfect Sync applies when the rounded remaining-usage percent and rounded
time-remaining percent are equal. It displays the `sync` state with a controlled
display ratio of `1.00`.

Perfect Zero applies when those rounded percentages match and the rounded
remaining-usage percent is zero. It displays the `perfectZero` state with a
controlled display ratio of `0.00`.

Controlled presentation is suppressed when the reset window is stale, meaning
`resetsAt` is at or before the current time. Perfect Zero can also be disallowed
for a current reset window when history shows usage already reached displayed
zero while time still remained in that same window.

## Legend And Preview Order

The dashboard legend uses `PACE_LEGEND_STATE_KEYS` from `pace-logic.js`:

```text
wellAhead, on, behind, strongAhead, sync, wellBehind, ahead, perfectZero, criticalBehind
```

Preview controls are owned by `collector/extension/preview-control.js`. Preview
ratios are synthetic examples based on a default `50%` time remaining, except
Perfect Zero, which previews `0%` usage and `0%` time. The toolbar badge preview
uses the same preview state and restores through the alarm-backed badge-preview
contract.

The dashboard-only Singularity state previews and forced developer overrides
also set the reset countdown presentation to `0d 0h 0m`.

## Display Caps

Dashboard pace text uses `PacePetsLogic.formatPaceRatioValue()` with a display
cap of `100+`. Positive values below `0.01` display as `<0.01`.

The dashboard's inactive-window ratio keeps the window label neutral and tints
only the numeric value with that inactive window's pace state color.

Toolbar badge text uses the same formatter with a cap of `10+`; tiny positive
values round to `0.01` rather than using the `<0.01` display form.

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

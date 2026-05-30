(function attachPacePetsLogic(root) {
  "use strict";

  const PERFECT_PACE_RATIO = 1;
  const PACE_RATIO_DISPLAY_MAX = 100;
  const PACE_RATIO_CHART_MIN = 0;
  const PACE_RATIO_CHART_MAX = 50;
  const BADGE_PACE_RATIO_DISPLAY_MAX = 10;
  const THEME_ASSETS = root.CodexThemeAssets;
  if (!THEME_ASSETS) {
    throw new Error("Codex theme assets must load before pace-logic.js.");
  }
  const USAGE_VALUES = root.CodexUsageValues;
  if (!USAGE_VALUES) {
    throw new Error(
      "Codex usage value helpers must load before pace-logic.js.",
    );
  }

  function iconPart(part) {
    return Object.freeze({
      tag: part.tag,
      attrs: Object.freeze({ ...part.attrs }),
    });
  }

  function iconParts(parts) {
    return Object.freeze(parts.map(iconPart));
  }

  function paceState(state) {
    return Object.freeze({
      ...state,
      favicon: Object.freeze(state.favicon),
      iconParts: iconParts(state.iconParts),
    });
  }

  const PACE_STATES = Object.freeze({
    criticalBehind: paceState({
      key: "criticalBehind",
      className: "pace-critical-behind",
      title: "Brake hard!",
      copy: "Too much thrust for this window!",
      ratioLabel: "Pace < 0.55",
      badgeColor: "#b42318",
      favicon: { bg: "#fdf1f3", color: "#991b1b" },
      playfulImage: THEME_ASSETS.paceIconPathForState("criticalBehind"),
      iconParts: [
        {
          tag: "path",
          attrs: {
            d: "M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9L7.9 2Z",
          },
        },
        { tag: "path", attrs: { d: "M15 9l-6 6" } },
        { tag: "path", attrs: { d: "m9 9 6 6" } },
      ],
    }),
    wellBehind: paceState({
      key: "wellBehind",
      className: "pace-well-behind",
      title: "Slow down",
      copy: "This pace is getting bumpy.",
      ratioLabel: "Pace 0.55-0.75",
      badgeColor: "#c2410c",
      favicon: { bg: "#fbf2e9", color: "#c2410c" },
      playfulImage: THEME_ASSETS.paceIconPathForState("wellBehind"),
      iconParts: [
        {
          tag: "path",
          attrs: {
            d: "M10.3 4.3 3.4 16.2A2 2 0 0 0 5.1 19h13.8a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z",
          },
        },
        { tag: "path", attrs: { d: "M12 9v4" } },
        { tag: "path", attrs: { d: "M12 16h.01" } },
      ],
    }),
    behind: paceState({
      key: "behind",
      className: "pace-behind",
      title: "Ease up",
      copy: "The window needs breathing room.",
      ratioLabel: "Pace 0.75-0.90",
      badgeColor: "#b45309",
      favicon: { bg: "#fbf7e8", color: "#b45309" },
      playfulImage: THEME_ASSETS.paceIconPathForState("behind"),
      iconParts: [
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "8" } },
        { tag: "path", attrs: { d: "M10 15V9" } },
        { tag: "path", attrs: { d: "M14 15V9" } },
      ],
    }),
    on: paceState({
      key: "on",
      className: "pace-on",
      title: "Keep pace",
      copy: "You\u2019re right on rhythm. So smooth.",
      ratioLabel: "Pace 0.90-1.10",
      badgeColor: "#0f766e",
      favicon: { bg: "#edf5f3", color: "#0f766e" },
      playfulImage: THEME_ASSETS.paceIconPathForState("on"),
      iconParts: [
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "8" } },
        { tag: "path", attrs: { d: "m8.5 12.5 2.5 2.5 4.5-5" } },
      ],
    }),
    sync: paceState({
      key: "sync",
      className: "pace-sync",
      title: "PERFECT SYNC",
      copy: "Time and pace are in harmony. Ascendent.",
      ratioLabel: "Time = Usage",
      badgeColor: "#0f766e",
      favicon: { bg: "#edf6f4", color: "#0f766e" },
      playfulImage: THEME_ASSETS.paceIconPathForState("sync"),
      iconParts: [
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "8" } },
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "3" } },
        { tag: "path", attrs: { d: "M12 2v3" } },
        { tag: "path", attrs: { d: "M12 19v3" } },
        { tag: "path", attrs: { d: "M2 12h3" } },
        { tag: "path", attrs: { d: "M19 12h3" } },
      ],
    }),
    perfectZero: paceState({
      key: "perfectZero",
      className: "pace-perfect-zero",
      title: "PERFECT ZERO",
      copy: "A beautiful, unreasonable zero.",
      ratioLabel: "Time = Usage = 0",
      badgeColor: "#6b7280",
      favicon: { bg: "#020617", color: "#e5e7eb" },
      playfulImage: THEME_ASSETS.paceIconPathForState("perfectZero"),
      iconParts: [
        {
          tag: "ellipse",
          attrs: { cx: "12", cy: "12", rx: "5.5", ry: "8" },
        },
        {
          tag: "path",
          attrs: {
            d: "M9 8.5c1.5-1.3 4.3-1.5 6-.2",
            "stroke-width": "2.2",
          },
        },
      ],
    }),
    ahead: paceState({
      key: "ahead",
      className: "pace-ahead",
      title: "Pick up speed",
      copy: "This window has room to run.",
      ratioLabel: "Pace 1.10-1.25",
      badgeColor: "#15803d",
      favicon: { bg: "#eff7ef", color: "#15803d" },
      playfulImage: THEME_ASSETS.paceIconPathForState("ahead"),
      iconParts: [
        { tag: "path", attrs: { d: "M4 17 10 11l4 4 6-8" } },
        { tag: "path", attrs: { d: "M14 7h6v6" } },
      ],
    }),
    strongAhead: paceState({
      key: "strongAhead",
      className: "pace-strong-ahead",
      title: "Push harder",
      copy: "This window wants a challenge.",
      ratioLabel: "Pace 1.25-1.55",
      badgeColor: "#166534",
      favicon: { bg: "#edf6ec", color: "#166534" },
      playfulImage: THEME_ASSETS.paceIconPathForState("strongAhead"),
      iconParts: [
        { tag: "path", attrs: { d: "M12 2v8" } },
        { tag: "path", attrs: { d: "m16 6-4-4-4 4" } },
        { tag: "path", attrs: { d: "M4 14c2.5-2 5-2 8 0s5.5 2 8 0" } },
        { tag: "path", attrs: { d: "M4 20c2.5-2 5-2 8 0s5.5 2 8 0" } },
      ],
    }),
    wellAhead: paceState({
      key: "wellAhead",
      className: "pace-well-ahead",
      title: "Sprint faster!",
      copy: "Full sprint conditions. Let it rip.",
      ratioLabel: "Pace > 1.55",
      badgeColor: "#14532d",
      favicon: { bg: "#eef5e8", color: "#14532d" },
      playfulImage: THEME_ASSETS.paceIconPathForState("wellAhead"),
      iconParts: [
        { tag: "path", attrs: { d: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z" } },
      ],
    }),
    muted: paceState({
      key: "muted",
      className: "pace-muted",
      title: "Waiting for usage",
      copy: "Waiting for usage.",
      ratioLabel: "Unavailable",
      badgeColor: "#64748b",
      favicon: { bg: "#f4f6f8", color: "#64748b" },
      playfulImage: "",
      iconParts: [
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "8" } },
        { tag: "path", attrs: { d: "M12 8v4" } },
        { tag: "path", attrs: { d: "M12 16h.01" } },
      ],
    }),
  });
  const PACE_STATES_BY_CLASS = Object.freeze(
    Object.fromEntries(
      Object.values(PACE_STATES).map((state) => [state.className, state]),
    ),
  );
  const PACE_CLASS_NAMES = Object.freeze(Object.keys(PACE_STATES_BY_CLASS));
  const PACE_LEGEND_STATE_KEYS = Object.freeze([
    "wellAhead",
    "on",
    "behind",
    "strongAhead",
    "sync",
    "wellBehind",
    "ahead",
    "perfectZero",
    "criticalBehind",
  ]);
  const DEFAULT_BADGE_COLORS = Object.freeze(
    Object.fromEntries(
      Object.values(PACE_STATES).map((state) => [state.key, state.badgeColor]),
    ),
  );

  const {
    boundedPercent,
    dateMs,
    elapsedWindowPercentAt,
    timeRemainingPercentAt,
    windowStartMs,
  } = USAGE_VALUES;

  function timeRemainingPercent(windowData, atMs = Date.now()) {
    return timeRemainingPercentAt(windowData, atMs);
  }

  function paceRatioForValues(remainingPercent, timePercent) {
    const boundedRemainingPercent = boundedPercent(remainingPercent);
    const boundedTimePercent = boundedPercent(timePercent);
    return boundedRemainingPercent !== null &&
      boundedTimePercent !== null &&
      boundedTimePercent > 0
      ? boundedRemainingPercent / boundedTimePercent
      : null;
  }

  function roundedDisplayPercent(value) {
    const bounded = boundedPercent(value);
    return bounded === null ? null : Math.round(bounded);
  }

  function isPerfectSyncPercentPair(remainingPercent, timePercent) {
    const displayRemainingPercent = roundedDisplayPercent(remainingPercent);
    const displayTimePercent = roundedDisplayPercent(timePercent);
    return (
      displayRemainingPercent !== null &&
      displayTimePercent !== null &&
      displayRemainingPercent === displayTimePercent
    );
  }

  function isPerfectZeroPercentPair(remainingPercent, timePercent) {
    return (
      isPerfectSyncPercentPair(remainingPercent, timePercent) &&
      roundedDisplayPercent(remainingPercent) === 0
    );
  }

  function usageZeroedBeforeFinalTimeBand(windowData, atMs) {
    const remainingDisplayPercent = roundedDisplayPercent(
      windowData?.remainingPercent,
    );
    const timeDisplayPercent = roundedDisplayPercent(
      timeRemainingPercentAt(windowData, atMs),
    );
    return (
      remainingDisplayPercent === 0 &&
      timeDisplayPercent !== null &&
      timeDisplayPercent > 0
    );
  }

  function paceRatioForWindow(windowData, atMs = Date.now()) {
    return paceRatioForValues(
      windowData?.remainingPercent,
      timeRemainingPercent(windowData, atMs),
    );
  }

  function formatPaceRatioValue(
    value,
    {
      suffix = "",
      max = PACE_RATIO_DISPLAY_MAX,
      showSmallPositive = true,
    } = {},
  ) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return `--${suffix}`;
    }

    const boundedValue = Math.max(0, numericValue);
    if (boundedValue >= max) {
      return `${max}${suffix}+`;
    }
    if (showSmallPositive && boundedValue > 0 && boundedValue < 0.01) {
      return `<0.01${suffix}`;
    }

    return `${boundedValue.toFixed(2)}${suffix}`;
  }

  function badgeTextForPaceRatio(paceRatio) {
    return formatPaceRatioValue(paceRatio, {
      max: BADGE_PACE_RATIO_DISPLAY_MAX,
      showSmallPositive: false,
    });
  }

  function paceStateForRatio(paceRatio) {
    const numericValue = Number(paceRatio);
    if (!Number.isFinite(numericValue)) {
      return PACE_STATES.muted;
    }

    if (numericValue < 0.55) {
      return PACE_STATES.criticalBehind;
    }
    if (numericValue < 0.75) {
      return PACE_STATES.wellBehind;
    }
    if (numericValue < 0.9) {
      return PACE_STATES.behind;
    }
    if (numericValue <= 1.1) {
      return PACE_STATES.on;
    }
    if (numericValue <= 1.25) {
      return PACE_STATES.ahead;
    }
    if (numericValue <= 1.55) {
      return PACE_STATES.strongAhead;
    }
    return PACE_STATES.wellAhead;
  }

  function paceStateForClassName(className) {
    return PACE_STATES_BY_CLASS[className] || PACE_STATES.muted;
  }

  function badgeColorForPaceRatio(paceRatio, colors = DEFAULT_BADGE_COLORS) {
    const state = paceStateForRatio(paceRatio);
    return colors[state.key] || colors.muted;
  }

  function chartPaceRatio(value, bounds = null) {
    const numericValue = Number(value);
    const min = bounds?.min ?? PACE_RATIO_CHART_MIN;
    const max = bounds?.max ?? PACE_RATIO_CHART_MAX;
    return Number.isFinite(numericValue)
      ? Math.max(min, Math.min(max, numericValue))
      : null;
  }

  root.PacePetsLogic = {
    BADGE_PACE_RATIO_DISPLAY_MAX,
    DEFAULT_BADGE_COLORS,
    PACE_CLASS_NAMES,
    PACE_LEGEND_STATE_KEYS,
    PACE_RATIO_CHART_MAX,
    PACE_RATIO_CHART_MIN,
    PACE_RATIO_DISPLAY_MAX,
    PACE_STATES,
    PERFECT_PACE_RATIO,
    badgeColorForPaceRatio,
    badgeTextForPaceRatio,
    boundedPercent,
    chartPaceRatio,
    dateMs,
    elapsedWindowPercentAt,
    formatPaceRatioValue,
    isPerfectSyncPercentPair,
    isPerfectZeroPercentPair,
    paceStateForClassName,
    paceStateForRatio,
    paceRatioForValues,
    paceRatioForWindow,
    timeRemainingPercent,
    timeRemainingPercentAt,
    usageZeroedBeforeFinalTimeBand,
    windowStartMs,
  };
})(globalThis);

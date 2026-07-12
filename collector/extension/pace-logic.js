(function attachPacePetsLogic(root) {
  "use strict";

  const PERFECT_PACE_RATIO = 1;
  const PACE_RATIO_DISPLAY_MAX = 100;
  const PACE_RATIO_CHART_MIN = 0;
  const PACE_RATIO_CHART_MAX = 50;
  const BADGE_PACE_RATIO_DISPLAY_MAX = 10;
  const PACE_STATE_DATA = root.PacePetsPaceStateData;
  if (!PACE_STATE_DATA) {
    throw new Error("Pace state data must load before pace-logic.js.");
  }
  const USAGE_VALUES = root.CodexUsageValues;
  if (!USAGE_VALUES) {
    throw new Error(
      "Codex usage value helpers must load before pace-logic.js.",
    );
  }
  const {
    DEFAULT_BADGE_COLORS,
    PACE_CLASS_NAMES,
    PACE_IMPERFECT_STATE_KEYS,
    PACE_LEGEND_STATE_KEYS,
    PACE_LEVEL_STATE_KEYS,
    PACE_PERFECT_STATE_KEYS,
    PACE_STATE_GROUPS,
    PACE_STATE_GROUPS_BY_KEY,
    PACE_STATES,
    PACE_STATES_BY_CLASS,
  } = PACE_STATE_DATA;

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

  function formatDisplayPercent(value) {
    const rounded = roundedDisplayPercent(value);
    return rounded === null ? "--" : `${rounded}%`;
  }

  function isResetWindowStale(windowData, atMs = Date.now()) {
    const resetMs = dateMs(windowData?.resetsAt);
    return resetMs !== null && resetMs <= atMs;
  }

  function paceRatioForWindow(windowData, atMs = Date.now()) {
    return paceRatioForValues(
      windowData?.remainingPercent,
      timeRemainingPercent(windowData, atMs),
    );
  }

  function finitePaceRatio(value) {
    if (
      (typeof value !== "number" && typeof value !== "string") ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  function displayScalePaceRatio(value) {
    const numericValue = finitePaceRatio(value);
    return numericValue === null
      ? null
      : Number(Math.max(0, numericValue).toFixed(2));
  }

  function formatPaceRatioValue(
    value,
    {
      suffix = "",
      max = PACE_RATIO_DISPLAY_MAX,
      showSmallPositive = true,
    } = {},
  ) {
    const numericValue = finitePaceRatio(value);
    if (numericValue === null) {
      return `--${suffix}`;
    }

    const boundedValue = Math.max(0, numericValue);
    if (boundedValue >= max) {
      return `${max}${suffix}+`;
    }
    if (showSmallPositive && boundedValue > 0 && boundedValue < 0.01) {
      return `<0.01${suffix}`;
    }

    return `${displayScalePaceRatio(boundedValue).toFixed(2)}${suffix}`;
  }

  function badgeTextForPaceRatio(paceRatio) {
    return formatPaceRatioValue(paceRatio, {
      max: BADGE_PACE_RATIO_DISPLAY_MAX,
      showSmallPositive: false,
    });
  }

  function paceStateForRatio(paceRatio) {
    const displayRatio = displayScalePaceRatio(paceRatio);
    if (displayRatio === null) {
      return PACE_STATES.muted;
    }

    if (displayRatio < 0.55) {
      return PACE_STATES.criticalBehind;
    }
    if (displayRatio < 0.75) {
      return PACE_STATES.wellBehind;
    }
    if (displayRatio < 0.9) {
      return PACE_STATES.behind;
    }
    if (displayRatio <= 1.1) {
      return PACE_STATES.on;
    }
    if (displayRatio <= 1.25) {
      return PACE_STATES.ahead;
    }
    if (displayRatio <= 1.55) {
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
    const numericValue = finitePaceRatio(value);
    const min = bounds?.min ?? PACE_RATIO_CHART_MIN;
    const max = bounds?.max ?? PACE_RATIO_CHART_MAX;
    return numericValue !== null
      ? Math.max(min, Math.min(max, numericValue))
      : null;
  }

  root.PacePetsLogic = {
    BADGE_PACE_RATIO_DISPLAY_MAX,
    DEFAULT_BADGE_COLORS,
    PACE_CLASS_NAMES,
    PACE_IMPERFECT_STATE_KEYS,
    PACE_LEGEND_STATE_KEYS,
    PACE_LEVEL_STATE_KEYS,
    PACE_PERFECT_STATE_KEYS,
    PACE_STATE_GROUPS,
    PACE_STATE_GROUPS_BY_KEY,
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
    finitePaceRatio,
    formatDisplayPercent,
    formatPaceRatioValue,
    isResetWindowStale,
    paceStateForClassName,
    paceStateForRatio,
    paceRatioForValues,
    paceRatioForWindow,
    roundedDisplayPercent,
    timeRemainingPercent,
    timeRemainingPercentAt,
    windowStartMs,
  };
})(globalThis);

(function attachPacePetsLogic(root) {
  "use strict";

  const PERFECT_PACE_RATIO = 1;
  const MS_PER_MINUTE = 60 * 1000;
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

  function isPerfectHundredPercentPair(remainingPercent, timePercent) {
    return (
      isPerfectSyncPercentPair(remainingPercent, timePercent) &&
      roundedDisplayPercent(remainingPercent) === 100
    );
  }

  function isUsageAbsoluteZero(remainingPercent) {
    const numericRemainingPercent =
      remainingPercent === null ||
      remainingPercent === undefined ||
      remainingPercent === ""
        ? null
        : Number(remainingPercent);
    return numericRemainingPercent === 0;
  }

  function isUsageAbsoluteZeroBeforeFinalTimeBand(
    remainingPercent,
    timePercent,
  ) {
    const displayTimePercent = roundedDisplayPercent(timePercent);
    return isUsageAbsoluteZero(remainingPercent) && displayTimePercent !== null
      ? displayTimePercent > 0
      : false;
  }

  function preservesSplatForBlockedPerfectZero(
    remainingPercent,
    timePercent,
    allowPerfectZero,
  ) {
    return (
      !allowPerfectZero &&
      isUsageAbsoluteZero(remainingPercent) &&
      isPerfectZeroPercentPair(remainingPercent, timePercent)
    );
  }

  function controlledPaceDisplayRatio(state) {
    return state.key === PACE_STATES.perfectZero.key ||
      state.key === PACE_STATES.singularity.key ||
      state.key === PACE_STATES.splat.key
      ? 0
      : PERFECT_PACE_RATIO;
  }

  function splatPacePresentationForValues(
    remainingPercent,
    timePercent,
    allowPerfectZero,
  ) {
    const shouldShowSplat =
      isUsageAbsoluteZeroBeforeFinalTimeBand(remainingPercent, timePercent) ||
      preservesSplatForBlockedPerfectZero(
        remainingPercent,
        timePercent,
        allowPerfectZero,
      );
    return shouldShowSplat
      ? {
          displayRatio: controlledPaceDisplayRatio(PACE_STATES.splat),
          paceRatio: paceRatioForValues(remainingPercent, timePercent),
          state: PACE_STATES.splat,
        }
      : null;
  }

  function perfectSyncStateForValues(
    remainingPercent,
    timePercent,
    allowPerfectZero,
  ) {
    const perfectZero = isPerfectZeroPercentPair(remainingPercent, timePercent);
    if (perfectZero) {
      return allowPerfectZero ? PACE_STATES.perfectZero : null;
    }
    if (!isPerfectSyncPercentPair(remainingPercent, timePercent)) {
      return null;
    }
    return isPerfectHundredPercentPair(remainingPercent, timePercent)
      ? PACE_STATES.bigBang
      : PACE_STATES.sync;
  }

  function controlledPacePresentationForValues(
    remainingPercent,
    timePercent,
    { allowPerfectZero = true } = {},
  ) {
    const splatPresentation = splatPacePresentationForValues(
      remainingPercent,
      timePercent,
      allowPerfectZero,
    );
    if (splatPresentation) {
      return splatPresentation;
    }

    const state = perfectSyncStateForValues(
      remainingPercent,
      timePercent,
      allowPerfectZero,
    );
    if (!state) {
      return null;
    }

    return {
      displayRatio: controlledPaceDisplayRatio(state),
      paceRatio: paceRatioForValues(remainingPercent, timePercent),
      state,
    };
  }

  function resetCountdownDisplaysZero(value, atMs = Date.now()) {
    const resetMs = dateMs(value);
    if (resetMs === null) {
      return false;
    }

    const remainingMs = resetMs - atMs;
    return remainingMs > 0 && Math.floor(remainingMs / MS_PER_MINUTE) === 0;
  }

  function shouldPromoteSingularityPresentation(
    windowData,
    controlledPresentation,
    atMs,
  ) {
    return (
      controlledPresentation?.state.key === PACE_STATES.perfectZero.key &&
      resetCountdownDisplaysZero(windowData?.resetsAt, atMs)
    );
  }

  function singularityPacePresentation(controlledPresentation) {
    return {
      ...controlledPresentation,
      displayRatio: controlledPaceDisplayRatio(PACE_STATES.singularity),
      state: PACE_STATES.singularity,
    };
  }

  function controlledPacePresentationForWindow(
    windowData,
    { allowPerfectZero = true, atMs = Date.now() } = {},
  ) {
    if (isResetWindowStale(windowData, atMs)) {
      return null;
    }

    const controlledPresentation = controlledPacePresentationForValues(
      windowData?.remainingPercent,
      timeRemainingPercentAt(windowData, atMs),
      { allowPerfectZero },
    );
    return shouldPromoteSingularityPresentation(
      windowData,
      controlledPresentation,
      atMs,
    )
      ? singularityPacePresentation(controlledPresentation)
      : controlledPresentation;
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

    return `${boundedValue.toFixed(2)}${suffix}`;
  }

  function badgeTextForPaceRatio(paceRatio) {
    return formatPaceRatioValue(paceRatio, {
      max: BADGE_PACE_RATIO_DISPLAY_MAX,
      showSmallPositive: false,
    });
  }

  function paceStateForRatio(paceRatio) {
    const numericValue = finitePaceRatio(paceRatio);
    if (numericValue === null) {
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

  function paceStatePresentationForRatio(paceRatio) {
    return paceStateForRatio(paceRatio);
  }

  function paceStateForClassName(className) {
    return PACE_STATES_BY_CLASS[className] || PACE_STATES.muted;
  }

  function badgeColorForPaceRatio(paceRatio, colors = DEFAULT_BADGE_COLORS) {
    const state = paceStatePresentationForRatio(paceRatio);
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
    controlledPaceDisplayRatio,
    controlledPacePresentationForValues,
    controlledPacePresentationForWindow,
    dateMs,
    elapsedWindowPercentAt,
    finitePaceRatio,
    formatPaceRatioValue,
    isPerfectSyncPercentPair,
    isPerfectHundredPercentPair,
    isPerfectZeroPercentPair,
    isUsageAbsoluteZeroBeforeFinalTimeBand,
    isResetWindowStale,
    paceStateForClassName,
    paceStatePresentationForRatio,
    paceStateForRatio,
    paceRatioForValues,
    paceRatioForWindow,
    resetCountdownDisplaysZero,
    roundedDisplayPercent,
    timeRemainingPercent,
    timeRemainingPercentAt,
    windowStartMs,
  };
})(globalThis);

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
    PACE_LEGEND_STATE_KEYS,
    PACE_LEVEL_STATE_KEYS,
    PACE_PERFECT_STATE_KEYS,
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

  function controlledPaceDisplayRatio(state) {
    return state.key === PACE_STATES.perfectZero.key ? 0 : PERFECT_PACE_RATIO;
  }

  function controlledPacePresentationForValues(
    remainingPercent,
    timePercent,
    { allowPerfectZero = true } = {},
  ) {
    const perfectZero = isPerfectZeroPercentPair(remainingPercent, timePercent);
    if (perfectZero && !allowPerfectZero) {
      return null;
    }
    if (
      !perfectZero &&
      !isPerfectSyncPercentPair(remainingPercent, timePercent)
    ) {
      return null;
    }

    const state = perfectZero ? PACE_STATES.perfectZero : PACE_STATES.sync;
    return {
      displayRatio: controlledPaceDisplayRatio(state),
      paceRatio: paceRatioForValues(remainingPercent, timePercent),
      state,
    };
  }

  function controlledPacePresentationForWindow(
    windowData,
    { allowPerfectZero = true, atMs = Date.now() } = {},
  ) {
    if (isResetWindowStale(windowData, atMs)) {
      return null;
    }

    return controlledPacePresentationForValues(
      windowData?.remainingPercent,
      timeRemainingPercentAt(windowData, atMs),
      { allowPerfectZero },
    );
  }

  function isResetWindowStale(windowData, atMs = Date.now()) {
    const resetMs = dateMs(windowData?.resetsAt);
    return resetMs !== null && resetMs <= atMs;
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

  function resetWindowBounds(windowData) {
    const min = windowStartMs(windowData);
    const max = dateMs(windowData?.resetsAt);
    if (min === null || max === null || min >= max) {
      return null;
    }
    return { min, max };
  }

  function resetWindowSamples(history, windowKey, windowData) {
    const bounds = resetWindowBounds(windowData);
    if (!bounds || !Array.isArray(history?.samples)) {
      return [];
    }

    return history.samples
      .filter((sample) => {
        const collectedMs = dateMs(sample?.collectedAt);
        return (
          sample?.windows?.[windowKey] &&
          collectedMs !== null &&
          collectedMs >= bounds.min &&
          collectedMs <= bounds.max
        );
      })
      .sort((a, b) => dateMs(a.collectedAt) - dateMs(b.collectedAt));
  }

  function allowsPerfectZeroForWindow(history, windowKey, windowData) {
    return !resetWindowSamples(history, windowKey, windowData).some(
      (sample) => {
        const collectedMs = dateMs(sample.collectedAt);
        return (
          collectedMs !== null &&
          usageZeroedBeforeFinalTimeBand(sample.windows[windowKey], collectedMs)
        );
      },
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
    PACE_LEVEL_STATE_KEYS,
    PACE_PERFECT_STATE_KEYS,
    PACE_RATIO_CHART_MAX,
    PACE_RATIO_CHART_MIN,
    PACE_RATIO_DISPLAY_MAX,
    PACE_STATES,
    PERFECT_PACE_RATIO,
    allowsPerfectZeroForWindow,
    badgeColorForPaceRatio,
    badgeTextForPaceRatio,
    boundedPercent,
    chartPaceRatio,
    controlledPaceDisplayRatio,
    controlledPacePresentationForValues,
    controlledPacePresentationForWindow,
    dateMs,
    elapsedWindowPercentAt,
    formatPaceRatioValue,
    isPerfectSyncPercentPair,
    isPerfectZeroPercentPair,
    isResetWindowStale,
    paceStateForClassName,
    paceStatePresentationForRatio,
    paceStateForRatio,
    paceRatioForValues,
    paceRatioForWindow,
    resetWindowBounds,
    resetWindowSamples,
    roundedDisplayPercent,
    timeRemainingPercent,
    timeRemainingPercentAt,
    usageZeroedBeforeFinalTimeBand,
    windowStartMs,
  };
})(globalThis);

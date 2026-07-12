(function attachPacePetsPresentation(root) {
  "use strict";

  const LOGIC = root.PacePetsLogic;
  if (!LOGIC) {
    throw new Error("Pace logic must load before pace-presentation.js.");
  }

  const MS_PER_MINUTE = 60 * 1000;
  const PERFECT_PACE_RATIO = LOGIC.PERFECT_PACE_RATIO;
  const PACE_STATES = LOGIC.PACE_STATES;

  function isPerfectSyncPercentPair(remainingPercent, timePercent) {
    const displayRemainingPercent =
      LOGIC.roundedDisplayPercent(remainingPercent);
    const displayTimePercent = LOGIC.roundedDisplayPercent(timePercent);
    return (
      displayRemainingPercent !== null &&
      displayTimePercent !== null &&
      displayRemainingPercent === displayTimePercent
    );
  }

  function isPerfectZeroPercentPair(remainingPercent, timePercent) {
    return (
      isPerfectSyncPercentPair(remainingPercent, timePercent) &&
      LOGIC.roundedDisplayPercent(remainingPercent) === 0
    );
  }

  function isPerfectHundredPercentPair(remainingPercent, timePercent) {
    return (
      isPerfectSyncPercentPair(remainingPercent, timePercent) &&
      LOGIC.roundedDisplayPercent(remainingPercent) === 100
    );
  }

  function isUsageDisplayZero(remainingPercent) {
    return LOGIC.roundedDisplayPercent(remainingPercent) === 0;
  }

  function isUsageDisplayZeroBeforeFinalTimeBand(
    remainingPercent,
    timePercent,
  ) {
    const displayTimePercent = LOGIC.roundedDisplayPercent(timePercent);
    return isUsageDisplayZero(remainingPercent) && displayTimePercent !== null
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
      isUsageDisplayZero(remainingPercent) &&
      isPerfectZeroPercentPair(remainingPercent, timePercent)
    );
  }

  function controlledDisplayRatio(state) {
    return state.key === PACE_STATES.perfectZero.key ||
      state.key === PACE_STATES.singularity.key ||
      state.key === PACE_STATES.splat.key
      ? 0
      : PERFECT_PACE_RATIO;
  }

  function controlledPresentationForValues(
    remainingPercent,
    timePercent,
    allowPerfectZero,
  ) {
    const paceRatio = LOGIC.paceRatioForValues(remainingPercent, timePercent);
    const shouldShowSplat =
      isUsageDisplayZeroBeforeFinalTimeBand(remainingPercent, timePercent) ||
      preservesSplatForBlockedPerfectZero(
        remainingPercent,
        timePercent,
        allowPerfectZero,
      );
    if (shouldShowSplat) {
      return {
        displayRatio: controlledDisplayRatio(PACE_STATES.splat),
        paceRatio,
        state: PACE_STATES.splat,
      };
    }

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

    const state = perfectZero
      ? PACE_STATES.perfectZero
      : isPerfectHundredPercentPair(remainingPercent, timePercent)
        ? PACE_STATES.bigBang
        : PACE_STATES.sync;
    return {
      displayRatio: controlledDisplayRatio(state),
      paceRatio,
      state,
    };
  }

  function resetCountdownDisplaysZero(value, atMs = Date.now()) {
    const resetMs = LOGIC.dateMs(value);
    if (resetMs === null) {
      return false;
    }

    const remainingMs = resetMs - atMs;
    return remainingMs > 0 && Math.floor(remainingMs / MS_PER_MINUTE) === 0;
  }

  function frozenPresentation(state, paceRatio, displayRatio = paceRatio) {
    return Object.freeze({ displayRatio, paceRatio, state });
  }

  function pacePresentationForValues(
    remainingPercent,
    timePercent,
    {
      allowPerfectZero = true,
      resetCountdownDisplaysZero: countdownDisplaysZero = false,
    } = {},
  ) {
    const controlled = controlledPresentationForValues(
      remainingPercent,
      timePercent,
      allowPerfectZero,
    );
    if (controlled) {
      const state =
        controlled.state.key === PACE_STATES.perfectZero.key &&
        countdownDisplaysZero
          ? PACE_STATES.singularity
          : controlled.state;
      return frozenPresentation(
        state,
        controlled.paceRatio,
        controlledDisplayRatio(state),
      );
    }

    const paceRatio = LOGIC.paceRatioForValues(remainingPercent, timePercent);
    return frozenPresentation(LOGIC.paceStateForRatio(paceRatio), paceRatio);
  }

  function pacePresentationForWindow(
    windowData,
    { allowPerfectZero = true, atMs = Date.now() } = {},
  ) {
    if (LOGIC.isResetWindowStale(windowData, atMs)) {
      return frozenPresentation(PACE_STATES.muted, null, null);
    }

    return pacePresentationForValues(
      windowData?.remainingPercent,
      LOGIC.timeRemainingPercentAt(windowData, atMs),
      {
        allowPerfectZero,
        resetCountdownDisplaysZero: resetCountdownDisplaysZero(
          windowData?.resetsAt,
          atMs,
        ),
      },
    );
  }

  Object.assign(LOGIC, {
    isPerfectHundredPercentPair,
    isPerfectSyncPercentPair,
    isPerfectZeroPercentPair,
    pacePresentationForValues,
    pacePresentationForWindow,
    resetCountdownDisplaysZero,
  });
})(globalThis);

(function attachPacePetsPreviewControl(root) {
  "use strict";

  const PREVIEW_BADGE_MESSAGE_TYPE = "pacePets.previewBadge";
  const RESTORE_BADGE_MESSAGE_TYPE = "pacePets.restoreBadge";
  const BADGE_PREVIEW_RESTORE_ALARM = "restore-pace-preview-badge";
  const BADGE_PREVIEW_EXPIRES_STORAGE_KEY = "pacePetsBadgePreviewExpiresAtMs";
  const PACE_STATE_PREVIEW_DURATION_MS = 1800;
  const BADGE_PREVIEW_STALE_TIMEOUT_MS = 60 * 1000;
  const DEFAULT_PACE_STATE_PREVIEW_TIME_PERCENT = 50;
  const PERFECT_ZERO_PREVIEW_TIME_PERCENT = 0.4;
  const MS_PER_MINUTE = 60 * 1000;
  const PACE_LOGIC = root.PacePetsLogic;
  if (!PACE_LOGIC) {
    throw new Error(
      "Pace Pets pace logic must load before preview-control.js.",
    );
  }
  const USAGE_VALUES = root.CodexUsageValues;
  if (!USAGE_VALUES) {
    throw new Error(
      "Codex usage value helpers must load before preview-control.js.",
    );
  }
  const PACE_STATES = PACE_LOGIC.PACE_STATES;
  const LIVE_TIMING_PREVIEW_STATE_KEYS = Object.freeze([PACE_STATES.splat.key]);

  function pacePreviewPercentPair(
    paceRatio,
    { timePercent = DEFAULT_PACE_STATE_PREVIEW_TIME_PERCENT } = {},
  ) {
    return Object.freeze({
      remainingPercent: paceRatio * timePercent,
      timePercent,
    });
  }

  const PACE_STATE_PREVIEW_PERCENT_PAIRS = Object.freeze({
    [PACE_STATES.criticalBehind.key]: pacePreviewPercentPair(0.45),
    [PACE_STATES.wellBehind.key]: pacePreviewPercentPair(0.65),
    [PACE_STATES.behind.key]: pacePreviewPercentPair(0.82),
    [PACE_STATES.on.key]: pacePreviewPercentPair(1.02),
    [PACE_STATES.ahead.key]: pacePreviewPercentPair(1.16),
    [PACE_STATES.strongAhead.key]: pacePreviewPercentPair(1.4),
    [PACE_STATES.wellAhead.key]: pacePreviewPercentPair(1.8),
  });
  const FORCED_PACE_STATE_PERCENT_PAIRS = Object.freeze({
    ...PACE_STATE_PREVIEW_PERCENT_PAIRS,
    [PACE_STATES.sync.key]: pacePreviewPercentPair(
      PACE_LOGIC.PERFECT_PACE_RATIO,
    ),
    [PACE_STATES.perfectZero.key]: pacePreviewPercentPair(
      PACE_LOGIC.PERFECT_PACE_RATIO,
      {
        timePercent: PERFECT_ZERO_PREVIEW_TIME_PERCENT,
      },
    ),
    [PACE_STATES.singularity.key]: pacePreviewPercentPair(0, {
      timePercent: 0,
    }),
    [PACE_STATES.splat.key]: pacePreviewPercentPair(0),
  });

  function normalizePreviewStateKey(stateKey) {
    return PACE_STATES[stateKey]?.key || null;
  }

  function previewStateKeyEnabled(stateKey) {
    const normalizedStateKey = normalizePreviewStateKey(stateKey);
    if (!normalizedStateKey) {
      return false;
    }

    return Object.hasOwn(PACE_STATE_PREVIEW_PERCENT_PAIRS, normalizedStateKey);
  }

  function previewPaceRatioForState(stateKey) {
    const normalizedStateKey = normalizePreviewStateKey(stateKey);
    if (!previewStateKeyEnabled(normalizedStateKey)) {
      return null;
    }

    return forcedPaceRatioForState(normalizedStateKey);
  }

  function usesLivePreviewTiming(stateKey) {
    return LIVE_TIMING_PREVIEW_STATE_KEYS.includes(stateKey);
  }

  function livePreviewTimePercent(stateKey, windowData, atMs) {
    if (!usesLivePreviewTiming(stateKey)) {
      return null;
    }

    const timePercent = PACE_LOGIC.timeRemainingPercent(windowData, atMs);
    return Number.isFinite(timePercent) && timePercent > 0 ? timePercent : null;
  }

  function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function previewDurationMinutes(windowData, fallbackDurationMinutes) {
    return (
      positiveNumber(windowData?.windowMinutes) ||
      positiveNumber(fallbackDurationMinutes)
    );
  }

  function livePreviewResetMs(stateKey, windowData, atMs) {
    if (!usesLivePreviewTiming(stateKey)) {
      return null;
    }

    const resetMs = PACE_LOGIC.dateMs(windowData?.resetsAt);
    const startMs = PACE_LOGIC.windowStartMs(windowData);
    return startMs !== null &&
      resetMs !== null &&
      startMs < resetMs &&
      resetMs > atMs
      ? resetMs
      : null;
  }

  function forcedPercentPairForState(
    stateKey,
    { atMs = Date.now(), windowData = null } = {},
  ) {
    const normalizedStateKey = normalizePreviewStateKey(stateKey);
    const percentPair = FORCED_PACE_STATE_PERCENT_PAIRS[normalizedStateKey];
    if (!percentPair) {
      return null;
    }

    const liveTimePercent = livePreviewTimePercent(
      normalizedStateKey,
      windowData,
      atMs,
    );
    return liveTimePercent === null
      ? percentPair
      : Object.freeze({
          ...percentPair,
          timePercent: liveTimePercent,
        });
  }

  function previewWindowDataForPercentPair(
    stateKey,
    percentPair,
    { atMs, durationMinutes, windowData },
  ) {
    const remainingPercent = PACE_LOGIC.boundedPercent(
      percentPair?.remainingPercent,
    );
    const timePercent = PACE_LOGIC.boundedPercent(percentPair?.timePercent);
    const windowMinutes = previewDurationMinutes(windowData, durationMinutes);
    if (
      remainingPercent === null ||
      timePercent === null ||
      windowMinutes === null
    ) {
      return null;
    }

    const liveResetMs = livePreviewResetMs(stateKey, windowData, atMs);
    const resetMs =
      liveResetMs ?? atMs + (windowMinutes * MS_PER_MINUTE * timePercent) / 100;
    return Object.freeze({
      remainingPercent,
      resetsAt: new Date(resetMs).toISOString(),
      usedPercent: USAGE_VALUES.percentComplement(remainingPercent),
      windowMinutes,
    });
  }

  function forcedPreviewWindowForState(
    stateKey,
    { atMs = Date.now(), durationMinutes = null, windowData = null } = {},
  ) {
    const normalizedStateKey = normalizePreviewStateKey(stateKey);
    const percentPair = forcedPercentPairForState(normalizedStateKey, {
      atMs,
      windowData,
    });
    const previewWindowData = previewWindowDataForPercentPair(
      normalizedStateKey,
      percentPair,
      { atMs, durationMinutes, windowData },
    );
    return previewWindowData
      ? Object.freeze({
          atMs,
          percentPair,
          windowData: previewWindowData,
        })
      : null;
  }

  function forcedPaceRatioForState(stateKey) {
    const normalizedStateKey = normalizePreviewStateKey(stateKey);
    const percentPair = forcedPercentPairForState(normalizedStateKey);
    if (!percentPair) {
      return null;
    }

    if (
      normalizedStateKey === PACE_STATES.perfectZero.key ||
      normalizedStateKey === PACE_STATES.singularity.key
    ) {
      return 0;
    }

    return PACE_LOGIC.paceRatioForValues(
      percentPair.remainingPercent,
      percentPair.timePercent,
    );
  }

  function forcedBadgeState(stateKey) {
    const normalizedStateKey = normalizePreviewStateKey(stateKey);
    const state = PACE_STATES[normalizedStateKey];
    if (!state) {
      return null;
    }

    const paceRatio = forcedPaceRatioForState(normalizedStateKey);
    if (paceRatio === null) {
      return null;
    }

    return Object.freeze({
      badgeColor: state.badgeColor,
      badgeText: PACE_LOGIC.badgeTextForPaceRatio(paceRatio),
      paceRatio,
      state,
      stateKey: normalizedStateKey,
    });
  }

  function previewBadgeState(stateKey) {
    const normalizedStateKey = normalizePreviewStateKey(stateKey);
    if (!previewStateKeyEnabled(normalizedStateKey)) {
      return null;
    }

    const state = PACE_STATES[normalizedStateKey];
    if (!state) {
      return null;
    }

    const paceRatio = previewPaceRatioForState(normalizedStateKey);
    if (paceRatio === null) {
      return null;
    }

    return Object.freeze({
      badgeColor: state.badgeColor,
      badgeText: PACE_LOGIC.badgeTextForPaceRatio(paceRatio),
      paceRatio,
      state,
      stateKey: normalizedStateKey,
    });
  }

  function previewBadgeMessage(stateKey) {
    const normalizedStateKey = normalizePreviewStateKey(stateKey);
    return previewStateKeyEnabled(normalizedStateKey)
      ? { stateKey: normalizedStateKey, type: PREVIEW_BADGE_MESSAGE_TYPE }
      : null;
  }

  function restoreBadgeMessage() {
    return { type: RESTORE_BADGE_MESSAGE_TYPE };
  }

  function isPreviewBadgeMessage(message) {
    return (
      message?.type === PREVIEW_BADGE_MESSAGE_TYPE &&
      previewStateKeyEnabled(message.stateKey)
    );
  }

  function isRestoreBadgeMessage(message) {
    return message?.type === RESTORE_BADGE_MESSAGE_TYPE;
  }

  function badgePreviewExpiresAtMs(atMs = Date.now()) {
    return atMs + BADGE_PREVIEW_STALE_TIMEOUT_MS;
  }

  function normalizeBadgePreviewExpiresAtMs(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const expiresAtMs = Number(value);
    return Number.isFinite(expiresAtMs) ? expiresAtMs : null;
  }

  root.PacePetsPreviewControl = Object.freeze({
    BADGE_PREVIEW_EXPIRES_STORAGE_KEY,
    BADGE_PREVIEW_RESTORE_ALARM,
    BADGE_PREVIEW_STALE_TIMEOUT_MS,
    PACE_STATE_PREVIEW_DURATION_MS,
    PACE_STATE_PREVIEW_PERCENT_PAIRS,
    PREVIEW_BADGE_MESSAGE_TYPE,
    RESTORE_BADGE_MESSAGE_TYPE,
    badgePreviewExpiresAtMs,
    isPreviewBadgeMessage,
    isRestoreBadgeMessage,
    forcedBadgeState,
    forcedPercentPairForState,
    forcedPaceRatioForState,
    forcedPreviewWindowForState,
    normalizeBadgePreviewExpiresAtMs,
    normalizePreviewStateKey,
    previewBadgeMessage,
    previewBadgeState,
    previewPaceRatioForState,
    previewStateKeyEnabled,
    restoreBadgeMessage,
  });
})(globalThis);

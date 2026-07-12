(function attachCodexRefreshStatus(root) {
  "use strict";

  const USAGE_VALUES = root.CodexUsageValues;
  if (!USAGE_VALUES) {
    throw new Error(
      "Codex usage value helpers must load before refresh-status.js.",
    );
  }
  const USAGE_WINDOWS = root.CodexUsageWindows;
  if (!USAGE_WINDOWS) {
    throw new Error(
      "Codex usage window contract must load before refresh-status.js.",
    );
  }
  const PERSISTED_TEXT = root.CodexPersistedText;
  if (!PERSISTED_TEXT) {
    throw new Error("Codex persisted text must load before refresh-status.js.");
  }
  const HELD_ZERO_STATE = root.PacePetsHeldZeroState;
  if (!HELD_ZERO_STATE) {
    throw new Error(
      "Held zero-state contract must load before refresh-status.js.",
    );
  }

  const REFRESH_STATUS_STORAGE_KEY = "codexUsageRefreshStatus";
  const INITIAL_MESSAGE = "Waiting for first refresh.";
  const SUCCESS_STORED_MESSAGE = "Stored usage history locally.";
  const SUCCESS_UNCHANGED_MESSAGE = "Usage unchanged; history already current.";
  const FAILURE_MESSAGE = "Refresh failed.";
  const { isoDate } = USAGE_VALUES;
  const { safeRedactedText, safeText } = PERSISTED_TEXT;

  function safeFailureMessage(error) {
    return safeRedactedText(error?.message, FAILURE_MESSAGE);
  }

  function normalizeStatusCode(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const statusCode = Number(value);
    return Number.isInteger(statusCode) &&
      statusCode >= 100 &&
      statusCode <= 599
      ? statusCode
      : null;
  }

  function normalizeSampleCount(value) {
    const sampleCount = Number(value);
    return Number.isInteger(sampleCount) && sampleCount >= 0 ? sampleCount : 0;
  }

  function normalizedStored(value) {
    return value === true ? true : value === false ? false : null;
  }

  function normalizedBadgeWindowKey(value) {
    return USAGE_WINDOWS.isSupportedWindowKey(value) ? value : null;
  }

  function normalizedPaceRatio(value) {
    const paceRatio = Number(value);
    return Number.isFinite(paceRatio) && paceRatio >= 0 ? paceRatio : null;
  }

  function initialState() {
    return {
      ok: false,
      message: INITIAL_MESSAGE,
      authFailure: false,
      statusCode: null,
      refreshedAt: null,
      windows: null,
      badgeWindowKey: null,
      badgePaceRatio: null,
      heldZeroStates: {},
      sampleCount: 0,
      stored: null,
    };
  }

  function successState({
    badgePaceRatio = null,
    badgeWindowKey = null,
    heldZeroStates = {},
    refreshedAt,
    sampleCount = 0,
    stored = false,
    windows = null,
  }) {
    return {
      ok: true,
      message: stored ? SUCCESS_STORED_MESSAGE : SUCCESS_UNCHANGED_MESSAGE,
      authFailure: false,
      statusCode: null,
      refreshedAt,
      windows,
      badgeWindowKey,
      badgePaceRatio,
      heldZeroStates: HELD_ZERO_STATE.normalizeHeldZeroStates(heldZeroStates),
      sampleCount,
      stored,
    };
  }

  function failureState(
    error,
    { heldZeroStates = {}, refreshedAt = new Date().toISOString() } = {},
  ) {
    return {
      ok: false,
      message: safeFailureMessage(error),
      authFailure: error?.authFailure === true,
      statusCode: normalizeStatusCode(error?.statusCode),
      refreshedAt,
      windows: null,
      badgeWindowKey: null,
      badgePaceRatio: null,
      heldZeroStates: HELD_ZERO_STATE.normalizeHeldZeroStates(heldZeroStates),
      sampleCount: 0,
      stored: null,
    };
  }

  function normalizeRefreshStatus(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const refreshedAt = isoDate(value.refreshedAt);
    if (!refreshedAt) {
      return null;
    }

    const ok = value.ok === true;
    return {
      ok,
      message: ok
        ? safeText(value.message, "Refresh completed.")
        : safeFailureMessage({ message: value.message || FAILURE_MESSAGE }),
      authFailure: value.authFailure === true,
      statusCode: normalizeStatusCode(value.statusCode),
      refreshedAt,
      badgeWindowKey: ok
        ? normalizedBadgeWindowKey(value.badgeWindowKey)
        : null,
      badgePaceRatio: ok ? normalizedPaceRatio(value.badgePaceRatio) : null,
      heldZeroStates: HELD_ZERO_STATE.normalizeHeldZeroStates(
        value.heldZeroStates,
      ),
      sampleCount: normalizeSampleCount(value.sampleCount),
      stored: normalizedStored(value.stored),
    };
  }

  function presentationSampleCount(normalized, presentation) {
    return presentation?.sampleCount ?? normalized.sampleCount;
  }

  function statusWithBadgePresentation(refreshStatus, presentation) {
    const normalized = normalizeRefreshStatus(refreshStatus);
    if (!normalized || normalized.ok !== true) {
      return null;
    }

    return normalizeRefreshStatus({
      ...normalized,
      badgePaceRatio: presentation?.badgePaceRatio,
      badgeWindowKey: presentation?.badgeWindowKey,
      heldZeroStates: presentation?.heldZeroStates || normalized.heldZeroStates,
      sampleCount: presentationSampleCount(normalized, presentation),
    });
  }

  root.CodexRefreshStatus = Object.freeze({
    FAILURE_MESSAGE,
    INITIAL_MESSAGE,
    REFRESH_STATUS_STORAGE_KEY,
    SUCCESS_STORED_MESSAGE,
    SUCCESS_UNCHANGED_MESSAGE,
    failureState,
    initialState,
    normalizeRefreshStatus,
    safeFailureMessage,
    safeText,
    statusWithBadgePresentation,
    successState,
  });
})(globalThis);

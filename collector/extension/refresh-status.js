(function attachCodexRefreshStatus(root) {
  "use strict";

  const USAGE_VALUES = root.CodexUsageValues;
  if (!USAGE_VALUES) {
    throw new Error(
      "Codex usage value helpers must load before refresh-status.js.",
    );
  }
  const PERSISTED_TEXT = root.CodexPersistedText;
  if (!PERSISTED_TEXT) {
    throw new Error("Codex persisted text must load before refresh-status.js.");
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
      sampleCount: 0,
      stored: null,
    };
  }

  function successState({
    badgePaceRatio = null,
    badgeWindowKey = null,
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
      sampleCount,
      stored,
    };
  }

  function failureState(error, refreshedAt = new Date().toISOString()) {
    return {
      ok: false,
      message: safeFailureMessage(error),
      authFailure: error?.authFailure === true,
      statusCode: normalizeStatusCode(error?.statusCode),
      refreshedAt,
      windows: null,
      badgeWindowKey: null,
      badgePaceRatio: null,
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

    return {
      ok: value.ok === true,
      message:
        value.ok === true
          ? safeText(value.message, "Refresh completed.")
          : safeFailureMessage({ message: value.message || FAILURE_MESSAGE }),
      authFailure: value.authFailure === true,
      statusCode: normalizeStatusCode(value.statusCode),
      refreshedAt,
      sampleCount: normalizeSampleCount(value.sampleCount),
      stored: normalizedStored(value.stored),
    };
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
    successState,
  });
})(globalThis);

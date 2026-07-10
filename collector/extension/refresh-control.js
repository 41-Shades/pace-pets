(function attachPacePetsRefreshControl(root) {
  "use strict";

  const REFRESH_STATUS = root.CodexRefreshStatus;
  if (!REFRESH_STATUS) {
    throw new Error(
      "Codex refresh status must load before refresh-control.js.",
    );
  }

  const REFRESH_NOW_MESSAGE_TYPE = "pacePets.refreshUsageNow";
  const CLEAR_USAGE_DATA_MESSAGE_TYPE = "pacePets.clearUsageData";
  const CLEAR_USAGE_DATA_FAILURE_MESSAGE = "Could not clear local usage data.";
  const MANUAL_REFRESH_COOLDOWN_STORAGE_KEY =
    "pacePetsManualRefreshCooldownUntil";
  const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000;

  function manualRefreshCooldownUntilMs(value) {
    const valueMs =
      typeof value === "string" ? Date.parse(value) : Number(value);
    return Number.isFinite(valueMs) ? valueMs : 0;
  }

  function manualRefreshCooldownStorageValue(cooldownUntilMs) {
    const valueMs = manualRefreshCooldownUntilMs(cooldownUntilMs);
    if (valueMs <= 0) {
      return null;
    }

    const valueDate = new Date(valueMs);
    return Number.isFinite(valueDate.getTime())
      ? valueDate.toISOString()
      : null;
  }

  function cooldownRemainingMs(cooldownUntilMs, nowMs = Date.now()) {
    const valueMs = manualRefreshCooldownUntilMs(cooldownUntilMs);
    if (!Number.isFinite(valueMs) || !Number.isFinite(nowMs)) {
      return 0;
    }

    return Math.max(0, valueMs - nowMs);
  }

  function refreshNowMessage() {
    return {
      type: REFRESH_NOW_MESSAGE_TYPE,
    };
  }

  function isRefreshNowMessage(message) {
    return message?.type === REFRESH_NOW_MESSAGE_TYPE;
  }

  function clearUsageDataMessage() {
    return {
      type: CLEAR_USAGE_DATA_MESSAGE_TYPE,
    };
  }

  function isClearUsageDataMessage(message) {
    return message?.type === CLEAR_USAGE_DATA_MESSAGE_TYPE;
  }

  function clearUsageDataResponse(result) {
    return {
      ok: true,
      history: result?.history || null,
      refreshStatus: result?.refreshStatus || null,
    };
  }

  function clearUsageDataErrorResponse() {
    return {
      ok: false,
      message: CLEAR_USAGE_DATA_FAILURE_MESSAGE,
    };
  }

  function normalizeRefreshStatus(refreshState) {
    return REFRESH_STATUS.normalizeRefreshStatus(refreshState);
  }

  function refreshNowResponse(refreshState) {
    const refreshStatus = normalizeRefreshStatus(refreshState);
    return {
      ok: refreshStatus?.ok === true,
      refreshStatus,
    };
  }

  function manualRefreshCooldownResponse(refreshState, remainingMs) {
    return {
      ok: false,
      refreshStatus: normalizeRefreshStatus(refreshState),
      cooldownRemainingMs: Math.max(
        0,
        Number.isFinite(remainingMs) ? remainingMs : 0,
      ),
    };
  }

  function refreshErrorResponse(error) {
    return {
      ok: false,
      refreshStatus: null,
      message: REFRESH_STATUS.safeFailureMessage(error),
    };
  }

  function isManualRefreshCooldownResponse(response) {
    return Number.isFinite(response?.cooldownRemainingMs);
  }

  function responseCooldownUntilMs(response, nowMs = Date.now()) {
    if (!isManualRefreshCooldownResponse(response)) {
      return null;
    }

    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    return now + Math.max(0, response.cooldownRemainingMs);
  }

  function manualRefreshResponseFailed(response) {
    return (
      response?.refreshStatus?.ok === false ||
      (response?.ok === false && !isManualRefreshCooldownResponse(response))
    );
  }

  root.PacePetsRefreshControl = Object.freeze({
    CLEAR_USAGE_DATA_FAILURE_MESSAGE,
    CLEAR_USAGE_DATA_MESSAGE_TYPE,
    MANUAL_REFRESH_COOLDOWN_MS,
    MANUAL_REFRESH_COOLDOWN_STORAGE_KEY,
    REFRESH_NOW_MESSAGE_TYPE,
    clearUsageDataErrorResponse,
    clearUsageDataMessage,
    clearUsageDataResponse,
    cooldownRemainingMs,
    isClearUsageDataMessage,
    isManualRefreshCooldownResponse,
    isRefreshNowMessage,
    manualRefreshCooldownResponse,
    manualRefreshCooldownStorageValue,
    manualRefreshCooldownUntilMs,
    manualRefreshResponseFailed,
    refreshErrorResponse,
    refreshNowMessage,
    refreshNowResponse,
    responseCooldownUntilMs,
  });
})(globalThis);

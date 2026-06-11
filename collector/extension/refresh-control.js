(function attachPacePetsRefreshControl(root) {
  "use strict";

  const REFRESH_STATUS = root.CodexRefreshStatus;
  if (!REFRESH_STATUS) {
    throw new Error(
      "Codex refresh status must load before refresh-control.js.",
    );
  }

  const REFRESH_NOW_MESSAGE_TYPE = "pacePets.refreshUsageNow";
  const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000;

  function cooldownRemainingMs(cooldownUntilMs, nowMs = Date.now()) {
    if (!Number.isFinite(cooldownUntilMs) || !Number.isFinite(nowMs)) {
      return 0;
    }

    return Math.max(0, cooldownUntilMs - nowMs);
  }

  function refreshNowMessage() {
    return {
      type: REFRESH_NOW_MESSAGE_TYPE,
    };
  }

  function isRefreshNowMessage(message) {
    return message?.type === REFRESH_NOW_MESSAGE_TYPE;
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
    MANUAL_REFRESH_COOLDOWN_MS,
    REFRESH_NOW_MESSAGE_TYPE,
    cooldownRemainingMs,
    isManualRefreshCooldownResponse,
    isRefreshNowMessage,
    manualRefreshCooldownResponse,
    manualRefreshResponseFailed,
    refreshErrorResponse,
    refreshNowMessage,
    refreshNowResponse,
    responseCooldownUntilMs,
  });
})(globalThis);

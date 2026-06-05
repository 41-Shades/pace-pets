(() => {
  "use strict";

  const COLLECTION_STATUS_TITLE = "Usage collection status";
  const STATUS_TEXT = Object.freeze({
    live: "Live",
    waiting: "Waiting",
    waitingForReading: "Waiting for reading",
    refreshNeeded: "Refresh needed",
    signInNotFound: "ChatGPT sign-in not found",
    checkFailed: "Check failed",
  });
  const SIGN_IN_NOT_FOUND_COPY = "Open ChatGPT to resume checks.";
  const SIGN_IN_NOT_FOUND_DETAIL =
    "Latest check failed because ChatGPT sign-in was not found.";
  const COLLECTION_STATUS_LABELS = Object.freeze({
    [STATUS_TEXT.checkFailed]: "Check failed",
    [STATUS_TEXT.refreshNeeded]: "Refresh needed",
    [STATUS_TEXT.signInNotFound]: "Sign-in needed",
    [STATUS_TEXT.waiting]: "Waiting",
  });
  const MANUAL_REFRESH_DEFAULT_LABEL = "Check ChatGPT usage now";
  const MANUAL_REFRESH_COOLDOWN_PREFIX = "Check again in";
  const MANUAL_REFRESH_FAILURE_VISIBLE_MS = 1800;
  const LAST_COLLECTED_UPDATE_FEEDBACK_MS = 1400;
  const COLLECTION_STATUS_STALE_AFTER_MS = 15 * 60 * 1000;

  function collectionStatusLabelText(text) {
    return COLLECTION_STATUS_LABELS[text] || "";
  }

  function statusTooltipText(title, text, detail = "") {
    return detail ? `${title}: ${text}. ${detail}` : `${title}: ${text}`;
  }

  function isTransientRuntimeMessageError(error) {
    return /(?:message port closed|receiving end does not exist|extension context invalidated)/i.test(
      error?.message || "",
    );
  }

  function warnOptionalPreviewMessageFailure(label, error) {
    if (!isTransientRuntimeMessageError(error)) {
      console.warn(label, error.message);
    }
  }

  function isSignInNotFoundStatus(refreshStatus) {
    return refreshStatus?.ok === false && refreshStatus.authFailure === true;
  }

  function isFailedRefreshStatus(refreshStatus) {
    return (
      refreshStatus?.ok === false &&
      Boolean(refreshStatus.refreshedAt) &&
      !isSignInNotFoundStatus(refreshStatus)
    );
  }

  function isRecentRefreshStatus(refreshStatus) {
    const refreshedMs = PacePetsLogic.dateMs(refreshStatus?.refreshedAt);
    return (
      refreshedMs !== null &&
      Date.now() - refreshedMs <= COLLECTION_STATUS_STALE_AFTER_MS
    );
  }

  function refreshFailureMessage(refreshStatus) {
    return isSignInNotFoundStatus(refreshStatus)
      ? SIGN_IN_NOT_FOUND_DETAIL
      : String(refreshStatus?.message || "Latest usage check failed.").trim();
  }

  function formattedStatusTime(value, formatClockTime) {
    return value ? formatClockTime(value) : "";
  }

  function refreshFailureDetail({
    formatClockTime,
    latest = null,
    refreshStatus,
  }) {
    const attemptText = formattedStatusTime(
      refreshStatus?.refreshedAt,
      formatClockTime,
    );
    const latestText = formattedStatusTime(
      latest?.collectedAt,
      formatClockTime,
    );
    return [
      refreshFailureMessage(refreshStatus),
      refreshStatus?.statusCode ? `HTTP ${refreshStatus.statusCode}` : "",
      attemptText ? `attempt ${attemptText}` : "",
      latestText ? `stored ${latestText}` : "",
    ]
      .filter(Boolean)
      .join("; ");
  }

  globalThis.PacePetsDashboardStatusLogic = Object.freeze({
    COLLECTION_STATUS_TITLE,
    LAST_COLLECTED_UPDATE_FEEDBACK_MS,
    MANUAL_REFRESH_COOLDOWN_PREFIX,
    MANUAL_REFRESH_DEFAULT_LABEL,
    MANUAL_REFRESH_FAILURE_VISIBLE_MS,
    SIGN_IN_NOT_FOUND_COPY,
    SIGN_IN_NOT_FOUND_DETAIL,
    STATUS_TEXT,
    collectionStatusLabelText,
    isFailedRefreshStatus,
    isRecentRefreshStatus,
    isSignInNotFoundStatus,
    refreshFailureDetail,
    statusTooltipText,
    warnOptionalPreviewMessageFailure,
  });
})();

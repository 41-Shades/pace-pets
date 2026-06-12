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
  const EMPTY_HISTORY_TITLE = "No history yet";
  const EMPTY_HISTORY_COPY = "Waiting for the first automatic usage check.";
  const EMPTY_HISTORY_CHART_COPY = "Waiting for local history.";
  const FAILED_HISTORY_COPY = "The latest usage check failed.";
  const COLLECTION_STATUS_LABELS = Object.freeze({
    [STATUS_TEXT.checkFailed]: "Check failed",
    [STATUS_TEXT.refreshNeeded]: "Refresh needed",
    [STATUS_TEXT.signInNotFound]: "Sign-in needed",
    [STATUS_TEXT.waiting]: "Waiting",
  });
  const MANUAL_REFRESH_DEFAULT_LABEL = "Check ChatGPT usage now";
  const MANUAL_REFRESH_COOLDOWN_PREFIX = "Check again in";
  const MANUAL_REFRESH_FAILURE_VISIBLE_MS = 1800;
  const LAST_COLLECTED_UPDATE_FEEDBACK_MS = 2400;
  const COLLECTION_STATUS_STALE_AFTER_MS = 15 * 60 * 1000;

  function collectionStatusLabelText(text) {
    return COLLECTION_STATUS_LABELS[text] || "";
  }

  function statusTooltipText(title, text, detail = "") {
    return detail ? `${title}: ${text}. ${detail}` : `${title}: ${text}`;
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
    return value && typeof formatClockTime === "function"
      ? formatClockTime(value)
      : "";
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

  function collectionStatusState({
    detail = "",
    manualRefresh = false,
    mode = "ok",
    text,
  }) {
    return {
      detail,
      manualRefresh: manualRefresh === true,
      mode,
      text,
    };
  }

  function failedCollectionStatusState({
    formatClockTime,
    latest = null,
    refreshStatus,
  }) {
    if (isSignInNotFoundStatus(refreshStatus)) {
      return collectionStatusState({
        detail: refreshFailureDetail({
          formatClockTime,
          latest,
          refreshStatus,
        }),
        manualRefresh: true,
        mode: "warning",
        text: STATUS_TEXT.signInNotFound,
      });
    }

    if (isFailedRefreshStatus(refreshStatus)) {
      return collectionStatusState({
        detail: refreshFailureDetail({
          formatClockTime,
          latest,
          refreshStatus,
        }),
        manualRefresh: true,
        mode: "error",
        text: STATUS_TEXT.checkFailed,
      });
    }

    return null;
  }

  function staleRefreshCollectionStatusState(refreshStatus) {
    return refreshStatus?.ok === true && !isRecentRefreshStatus(refreshStatus)
      ? collectionStatusState({
          manualRefresh: true,
          mode: "stale",
          text: STATUS_TEXT.refreshNeeded,
        })
      : null;
  }

  function emptyHistoryCollectionState({
    formatClockTime,
    refreshStatus = null,
  } = {}) {
    const failedStatus = failedCollectionStatusState({
      formatClockTime,
      refreshStatus,
    });
    if (failedStatus) {
      return {
        chartCopy: isSignInNotFoundStatus(refreshStatus)
          ? STATUS_TEXT.signInNotFound
          : EMPTY_HISTORY_CHART_COPY,
        paceCopy: isSignInNotFoundStatus(refreshStatus)
          ? SIGN_IN_NOT_FOUND_COPY
          : refreshStatus?.message || FAILED_HISTORY_COPY,
        paceTitle: failedStatus.text,
        status: failedStatus,
      };
    }

    const refreshNeeded =
      staleRefreshCollectionStatusState(refreshStatus) ||
      collectionStatusState({ text: STATUS_TEXT.waiting });
    return {
      chartCopy: EMPTY_HISTORY_CHART_COPY,
      paceCopy: EMPTY_HISTORY_COPY,
      paceTitle: EMPTY_HISTORY_TITLE,
      status: {
        ...refreshNeeded,
        manualRefresh: true,
      },
    };
  }

  function missingWindowCollectionStatusState({
    hasAnySupportedWindow,
    hasResetTiming,
    summaryWindow,
  }) {
    return hasAnySupportedWindow && summaryWindow && hasResetTiming
      ? null
      : collectionStatusState({
          manualRefresh: true,
          mode: "warning",
          text: STATUS_TEXT.waiting,
        });
  }

  function staleWindowCollectionStatusState({
    refreshStatus,
    staleWindow = false,
  }) {
    if (!staleWindow) {
      return null;
    }

    return refreshStatus?.ok === true && isRecentRefreshStatus(refreshStatus)
      ? collectionStatusState({
          mode: "live",
          text: STATUS_TEXT.waitingForReading,
        })
      : collectionStatusState({
          manualRefresh: true,
          mode: "stale",
          text: STATUS_TEXT.refreshNeeded,
        });
  }

  function firstCollectionStatusState(states) {
    return states.find(Boolean) || null;
  }

  function historyCollectionStatusState(options = {}) {
    const status = firstCollectionStatusState([
      failedCollectionStatusState({
        formatClockTime: options.formatClockTime,
        latest: options.latest || null,
        refreshStatus: options.refreshStatus || null,
      }),
      staleRefreshCollectionStatusState(options.refreshStatus || null),
      missingWindowCollectionStatusState({
        hasAnySupportedWindow: options.hasAnySupportedWindow === true,
        hasResetTiming: options.hasResetTiming === true,
        summaryWindow: options.summaryWindow || null,
      }),
      staleWindowCollectionStatusState({
        refreshStatus: options.refreshStatus || null,
        staleWindow: options.staleWindow === true,
      }),
    ]);
    if (status) {
      return status;
    }

    return collectionStatusState({
      manualRefresh: options.manualRefreshLeadWindow === true,
      mode: "live",
      text: STATUS_TEXT.live,
    });
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
    emptyHistoryCollectionState,
    historyCollectionStatusState,
    isFailedRefreshStatus,
    isRecentRefreshStatus,
    isSignInNotFoundStatus,
    refreshFailureDetail,
    statusTooltipText,
  });
})();

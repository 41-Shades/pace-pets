(() => {
  "use strict";

  const REFRESH_SCHEDULE = globalThis.PacePetsRefreshSchedule;
  const PACE_LOGIC = globalThis.PacePetsLogic;
  if (!REFRESH_SCHEDULE || !PACE_LOGIC) {
    throw new Error(
      "Refresh schedule and pace logic must load before dashboard-status-logic.js.",
    );
  }

  const AUTO_CHECKS_STATUS_TOOLTIP =
    REFRESH_SCHEDULE.AUTO_CHECKS_STATUS_TOOLTIP;
  const CHECKS_EVERY_ARIA = REFRESH_SCHEDULE.CHECKS_EVERY_ARIA;
  const COLLECTION_STATUS_TITLE = "Usage collection status";
  const NOTHINGNESS_STATE = PACE_LOGIC.PACE_STATES.nothingness;
  const STATUS_TEXT = Object.freeze({
    accessNeeded: "Access needed",
    live: "Live",
    waiting: "Waiting",
    waitingForReading: "Waiting for reading",
    refreshNeeded: "Refresh needed",
    signInNotFound: "ChatGPT sign-in not found",
    checkFailed: "Check failed",
  });
  const SIGN_IN_NOT_FOUND_DETAIL =
    "Latest check failed because ChatGPT sign-in was not found.";
  const EMPTY_HISTORY_CHART_COPY = "Waiting for local history.";
  const COLLECTION_STATUS_LABELS = Object.freeze({
    [STATUS_TEXT.accessNeeded]: "Access needed",
    [STATUS_TEXT.checkFailed]: "Check failed",
    [STATUS_TEXT.refreshNeeded]: "Refresh needed",
    [STATUS_TEXT.signInNotFound]: "Sign-in needed",
    [STATUS_TEXT.waiting]: "Waiting",
  });
  const MANUAL_REFRESH_DEFAULT_LABEL = "Check now";
  const MANUAL_ACCESS_ACTION_LABEL = "Allow & check";
  const MANUAL_REFRESH_COOLDOWN_PREFIX = "Again in";
  const MANUAL_REFRESH_FAILURE_VISIBLE_MS = 1800;
  const LAST_COLLECTED_UPDATE_FEEDBACK_MS = 2400;
  const COLLECTION_STATUS_STALE_AFTER_MS = 15 * 60 * 1000;

  function collectionStatusLabelText(text) {
    return COLLECTION_STATUS_LABELS[text] || "";
  }

  function statusSummaryText(text, detail = "") {
    const label = collectionStatusLabelText(text) || text;
    return detail ? `${label}. ${detail}` : label;
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
    const refreshedMs = PACE_LOGIC.dateMs(refreshStatus?.refreshedAt);
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

  function refreshResponseMessage(response) {
    return String(response?.message || "").trim();
  }

  function collectionStatusState({
    detail = "",
    manualRefresh = false,
    manualRefreshLabel,
    mode = "ok",
    text,
  }) {
    return {
      detail,
      manualRefresh: manualRefresh === true,
      ...(manualRefreshLabel ? { manualRefreshLabel } : {}),
      mode,
      text,
    };
  }

  function accessRequiredCollectionStatusState(hasChatGptAccess) {
    return hasChatGptAccess === false
      ? collectionStatusState({
          manualRefresh: true,
          manualRefreshLabel: MANUAL_ACCESS_ACTION_LABEL,
          mode: "warning",
          text: STATUS_TEXT.accessNeeded,
        })
      : null;
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
    hasChatGptAccess = true,
    refreshStatus = null,
  } = {}) {
    const accessRequired =
      accessRequiredCollectionStatusState(hasChatGptAccess);
    if (accessRequired) {
      return {
        chartCopy: "Grant access to begin.",
        paceCopy: NOTHINGNESS_STATE.copyByReason.accessRequired,
        paceTitle: NOTHINGNESS_STATE.title,
        status: accessRequired,
      };
    }

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
          ? NOTHINGNESS_STATE.copyByReason.signInNotFound
          : NOTHINGNESS_STATE.copyByReason.checkFailed,
        paceTitle: NOTHINGNESS_STATE.title,
        status: failedStatus,
      };
    }

    const refreshNeeded =
      staleRefreshCollectionStatusState(refreshStatus) ||
      collectionStatusState({ text: STATUS_TEXT.waiting });
    return {
      chartCopy: EMPTY_HISTORY_CHART_COPY,
      paceCopy: NOTHINGNESS_STATE.copyByReason.noHistory,
      paceTitle: NOTHINGNESS_STATE.title,
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
          manualRefresh: true,
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
      accessRequiredCollectionStatusState(options.hasChatGptAccess),
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
    AUTO_CHECKS_STATUS_TOOLTIP,
    CHECKS_EVERY_ARIA,
    COLLECTION_STATUS_TITLE,
    LAST_COLLECTED_UPDATE_FEEDBACK_MS,
    MANUAL_ACCESS_ACTION_LABEL,
    MANUAL_REFRESH_COOLDOWN_PREFIX,
    MANUAL_REFRESH_DEFAULT_LABEL,
    MANUAL_REFRESH_FAILURE_VISIBLE_MS,
    SIGN_IN_NOT_FOUND_DETAIL,
    STATUS_TEXT,
    collectionStatusLabelText,
    emptyHistoryCollectionState,
    historyCollectionStatusState,
    isFailedRefreshStatus,
    isRecentRefreshStatus,
    isSignInNotFoundStatus,
    refreshFailureDetail,
    refreshResponseMessage,
    statusSummaryText,
  });
})();

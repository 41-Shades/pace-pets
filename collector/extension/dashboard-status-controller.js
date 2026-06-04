(() => {
  "use strict";

  const EXTENSION_STORAGE = globalThis.CodexExtensionStorage;
  if (!EXTENSION_STORAGE) {
    throw new Error(
      "Codex storage adapter must load before dashboard-status-controller.js.",
    );
  }
  const REFRESH_CONTROL = globalThis.PacePetsRefreshControl;
  if (!REFRESH_CONTROL) {
    throw new Error(
      "Pace Pets refresh controls must load before dashboard-status-controller.js.",
    );
  }
  const PREVIEW_CONTROL = globalThis.PacePetsPreviewControl;
  if (!PREVIEW_CONTROL) {
    throw new Error(
      "Pace Pets preview controls must load before dashboard-status-controller.js.",
    );
  }

  const COLLECTION_STATUS_TITLE = "Usage collection status";
  const STATUS_TEXT = Object.freeze({
    live: "Live",
    waiting: "Waiting",
    waitingForReading: "Waiting for reading",
    refreshNeeded: "Refresh needed",
    checking: "Checking",
    signInNotFound: "ChatGPT sign-in not found",
    checkFailed: "Check failed",
  });
  const SIGN_IN_NOT_FOUND_COPY = "Open ChatGPT to resume checks.";
  const SIGN_IN_NOT_FOUND_DETAIL =
    "Latest check failed because ChatGPT sign-in was not found.";
  const COLLECTION_STATUS_LABELS = Object.freeze({
    [STATUS_TEXT.checkFailed]: "Check failed",
    [STATUS_TEXT.checking]: "Checking...",
    [STATUS_TEXT.refreshNeeded]: "Refresh needed",
    [STATUS_TEXT.signInNotFound]: "Sign-in needed",
    [STATUS_TEXT.waiting]: "Waiting",
  });
  const MANUAL_REFRESH_DEFAULT_LABEL = "Check ChatGPT usage now";
  const MANUAL_REFRESH_CHECKING_LABEL = "Checking usage...";
  const MANUAL_REFRESH_COOLDOWN_PREFIX = "Check again in";
  const MANUAL_REFRESH_FAILURE_VISIBLE_MS = 1800;
  const COLLECTION_STATUS_STALE_AFTER_MS = 15 * 60 * 1000;

  function statusTooltipText(title, text, detail = "") {
    return detail ? `${title}: ${text}. ${detail}` : `${title}: ${text}`;
  }

  function sendRuntimeMessage(message) {
    return EXTENSION_STORAGE.callbackWithLastError((done) => {
      chrome.runtime.sendMessage(message, done);
    });
  }

  function isTransientRuntimeMessageError(error) {
    return /(?:message port closed|receiving end does not exist|extension context invalidated)/i.test(
      error?.message || "",
    );
  }

  function warnOptionalPreviewMessageFailure(label, error) {
    if (isTransientRuntimeMessageError(error)) {
      return;
    }

    console.warn(label, error.message);
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

  function createController({
    appTooltips,
    elements,
    formatClockTime,
    getCurrentHistory,
    loadDashboard,
    setCurrentRefreshStatus,
  }) {
    let lastCheckedText =
      elements.lastCollectedValue.textContent.trim() || "waiting";
    let collectionStatusText = STATUS_TEXT.live;
    let collectionStatusMode = "ok";
    let collectionStatusTitle = COLLECTION_STATUS_TITLE;
    let collectionStatusDetail = "";
    let manualRefreshAvailable = false;
    let manualRefreshInFlight = false;
    let manualRefreshCooldownUntilMs = 0;
    let manualRefreshCooldownTimer = null;
    let manualRefreshFeedback = null;
    let manualRefreshFeedbackTimer = null;

    function collectionStatusLabelText(text) {
      return COLLECTION_STATUS_LABELS[text] || "";
    }

    function setCollectionStatusLabel(text, mode) {
      const label = collectionStatusLabelText(text);
      elements.collectionStatusLabel.textContent = label;
      elements.collectionStatusLabel.hidden = !label;
      elements.collectionStatusLabel.classList.toggle(
        "stale",
        mode === "stale",
      );
      elements.collectionStatusLabel.classList.toggle(
        "warning",
        mode === "warning",
      );
      elements.collectionStatusLabel.classList.toggle(
        "error",
        mode === "error",
      );
      elements.collectionStatusLabel.classList.toggle(
        "offline",
        mode === "offline",
      );
    }

    function visibleCollectionStatus() {
      if (manualRefreshInFlight) {
        return {
          text: STATUS_TEXT.checking,
          mode: "warning",
          title: COLLECTION_STATUS_TITLE,
          detail: "Checking ChatGPT usage now.",
        };
      }

      if (manualRefreshFeedback) {
        return manualRefreshFeedback;
      }

      return {
        text: collectionStatusText,
        mode: collectionStatusMode,
        title: collectionStatusTitle,
        detail: collectionStatusDetail,
      };
    }

    function manualRefreshCooldownRemainingMs() {
      return Math.max(0, manualRefreshCooldownUntilMs - Date.now());
    }

    function clearManualRefreshCooldownTimer() {
      window.clearTimeout(manualRefreshCooldownTimer);
      manualRefreshCooldownTimer = null;
    }

    function manualRefreshTooltipText() {
      if (manualRefreshInFlight) {
        return MANUAL_REFRESH_CHECKING_LABEL;
      }

      const remainingMs = manualRefreshCooldownRemainingMs();
      if (remainingMs > 0) {
        return `${MANUAL_REFRESH_COOLDOWN_PREFIX} ${Math.ceil(
          remainingMs / 1000,
        )}s`;
      }

      return MANUAL_REFRESH_DEFAULT_LABEL;
    }

    function scheduleManualRefreshCooldownTimer() {
      clearManualRefreshCooldownTimer();
      const remainingMs = manualRefreshCooldownRemainingMs();
      if (remainingMs <= 0) {
        return;
      }

      manualRefreshCooldownTimer = window.setTimeout(
        () => {
          updateManualRefreshButton();
          scheduleManualRefreshCooldownTimer();
        },
        Math.min(1000, remainingMs),
      );
    }

    function updateManualRefreshButton() {
      const button = elements.manualRefreshButton;
      if (!button) {
        return;
      }

      const remainingMs = manualRefreshCooldownRemainingMs();
      const disabled = manualRefreshInFlight || remainingMs > 0;
      button.hidden = !manualRefreshAvailable;
      button.setAttribute("aria-disabled", String(disabled));
      button.classList.toggle("is-checking", manualRefreshInFlight);
      button.setAttribute("aria-label", manualRefreshTooltipText());
      appTooltips.setText(button, manualRefreshTooltipText());

      if (manualRefreshAvailable && remainingMs > 0) {
        scheduleManualRefreshCooldownTimer();
      } else {
        clearManualRefreshCooldownTimer();
      }
    }

    function renderCollectionStatus() {
      const state = visibleCollectionStatus();
      elements.collectionPulse.classList.toggle("live", state.mode === "live");
      elements.collectionPulse.classList.toggle(
        "stale",
        state.mode === "stale",
      );
      elements.collectionPulse.classList.toggle(
        "offline",
        state.mode === "offline",
      );
      elements.collectionPulse.classList.toggle(
        "error",
        state.mode === "error",
      );
      elements.collectionPulse.classList.toggle(
        "warning",
        state.mode === "warning",
      );
      setCollectionStatusLabel(state.text, state.mode);

      const statusText = state.detail
        ? `${state.text}. ${state.detail}`
        : state.text;
      const title = state.title || COLLECTION_STATUS_TITLE;
      const label = `Checked: ${lastCheckedText}. Status: ${statusText}`;
      appTooltips.setText(
        elements.collectionPulse,
        statusTooltipText(title, state.text, state.detail),
      );
      elements.lastCollected.setAttribute("aria-label", label);
      appTooltips.setText(elements.lastCollected, `Status: ${statusText}`);
      updateManualRefreshButton();
    }

    function setStatus(
      text,
      mode = "ok",
      title = COLLECTION_STATUS_TITLE,
      detail = "",
      { manualRefresh = false } = {},
    ) {
      collectionStatusText = text;
      collectionStatusMode = mode;
      collectionStatusTitle = title;
      collectionStatusDetail = detail;
      manualRefreshAvailable = manualRefresh;
      renderCollectionStatus();
    }

    function setLastCollected(value) {
      lastCheckedText = String(value || "waiting");
      elements.lastCollectedValue.textContent = lastCheckedText;
      renderCollectionStatus();
    }

    function statusCodeText(refreshStatus) {
      return refreshStatus?.statusCode
        ? `HTTP ${refreshStatus.statusCode}`
        : "";
    }

    function refreshAttemptText(refreshStatus) {
      return refreshStatus?.refreshedAt
        ? formatClockTime(refreshStatus.refreshedAt)
        : "";
    }

    function refreshFailureDetail(refreshStatus, latest = null) {
      const message = isSignInNotFoundStatus(refreshStatus)
        ? SIGN_IN_NOT_FOUND_DETAIL
        : String(refreshStatus?.message || "Latest usage check failed.").trim();
      const statusCode = statusCodeText(refreshStatus);
      const attemptText = refreshAttemptText(refreshStatus);
      const latestText = latest?.collectedAt
        ? formatClockTime(latest.collectedAt)
        : "";
      const parts = [
        message,
        statusCode,
        attemptText ? `attempt ${attemptText}` : "",
        latestText ? `stored ${latestText}` : "",
      ].filter(Boolean);
      return parts.join("; ");
    }

    function clearManualRefreshFeedback() {
      window.clearTimeout(manualRefreshFeedbackTimer);
      manualRefreshFeedbackTimer = null;
      manualRefreshFeedback = null;
    }

    function latestCurrentSample() {
      const currentHistory = getCurrentHistory();
      return currentHistory
        ? CodexUsageHistory.latestSample(currentHistory)
        : null;
    }

    function manualRefreshFailureDetail(refreshStatus, error = null) {
      if (refreshStatus) {
        return refreshFailureDetail(refreshStatus, latestCurrentSample());
      }

      return error?.message || "Could not request a usage check.";
    }

    function showManualRefreshFailure(refreshStatus, error = null) {
      clearManualRefreshFeedback();
      manualRefreshFeedback = {
        text: STATUS_TEXT.checkFailed,
        mode: "error",
        title: COLLECTION_STATUS_TITLE,
        detail: manualRefreshFailureDetail(refreshStatus, error),
      };
      manualRefreshFeedbackTimer = window.setTimeout(() => {
        manualRefreshFeedback = null;
        manualRefreshFeedbackTimer = null;
        renderCollectionStatus();
      }, MANUAL_REFRESH_FAILURE_VISIBLE_MS);
      renderCollectionStatus();
    }

    function canRunManualRefresh() {
      return (
        manualRefreshAvailable &&
        !manualRefreshInFlight &&
        manualRefreshCooldownRemainingMs() <= 0
      );
    }

    function startManualRefreshAttempt() {
      manualRefreshInFlight = true;
      manualRefreshCooldownUntilMs =
        Date.now() + REFRESH_CONTROL.MANUAL_REFRESH_COOLDOWN_MS;
      clearManualRefreshFeedback();
      renderCollectionStatus();
    }

    function finishManualRefreshAttempt() {
      manualRefreshInFlight = false;
      renderCollectionStatus();
    }

    function applyManualRefreshCooldown(response) {
      if (!Number.isFinite(response?.cooldownRemainingMs)) {
        return;
      }

      manualRefreshCooldownUntilMs =
        Date.now() + Math.max(0, response.cooldownRemainingMs);
    }

    function manualRefreshResponseFailed(response) {
      return (
        response?.refreshStatus?.ok === false ||
        (response?.ok === false &&
          !Number.isFinite(response?.cooldownRemainingMs))
      );
    }

    async function applyManualRefreshResponse(response) {
      const refreshFailed = manualRefreshResponseFailed(response);
      applyManualRefreshCooldown(response);

      if (response?.refreshStatus) {
        setCurrentRefreshStatus(response.refreshStatus);
      }

      await loadDashboard({ refreshWindowPreference: false });

      if (refreshFailed) {
        showManualRefreshFailure(response?.refreshStatus);
        return;
      }

      clearManualRefreshFeedback();
    }

    function handleManualRefreshError(error) {
      setStatus(
        STATUS_TEXT.checkFailed,
        "error",
        COLLECTION_STATUS_TITLE,
        error?.message || "Could not request a usage check.",
        { manualRefresh: true },
      );
      showManualRefreshFailure(null, error);
    }

    async function runManualRefresh() {
      if (!canRunManualRefresh()) {
        return;
      }

      startManualRefreshAttempt();

      try {
        const response = await sendRuntimeMessage({
          type: REFRESH_CONTROL.REFRESH_NOW_MESSAGE_TYPE,
        });
        await applyManualRefreshResponse(response);
      } catch (error) {
        handleManualRefreshError(error);
      } finally {
        finishManualRefreshAttempt();
      }
    }

    function updateToolbarPreviewBadge(stateKey) {
      const message = PREVIEW_CONTROL.previewBadgeMessage(stateKey);
      if (!message) {
        return;
      }

      sendRuntimeMessage(message).catch((error) => {
        warnOptionalPreviewMessageFailure(
          "Codex usage badge preview failed:",
          error,
        );
      });
    }

    function restoreToolbarPreviewBadge() {
      sendRuntimeMessage(PREVIEW_CONTROL.restoreBadgeMessage()).catch(
        (error) => {
          warnOptionalPreviewMessageFailure(
            "Codex usage badge preview restore failed:",
            error,
          );
        },
      );
    }

    return Object.freeze({
      refreshFailureDetail,
      restoreToolbarPreviewBadge,
      runManualRefresh,
      setLastCollected,
      setStatus,
      updateToolbarPreviewBadge,
    });
  }

  globalThis.PacePetsDashboardStatus = Object.freeze({
    COLLECTION_STATUS_TITLE,
    SIGN_IN_NOT_FOUND_COPY,
    STATUS_TEXT,
    createController,
    isFailedRefreshStatus,
    isRecentRefreshStatus(refreshStatus) {
      const refreshedMs = PacePetsLogic.dateMs(refreshStatus?.refreshedAt);
      return (
        refreshedMs !== null &&
        Date.now() - refreshedMs <= COLLECTION_STATUS_STALE_AFTER_MS
      );
    },
    isSignInNotFoundStatus,
  });
})();

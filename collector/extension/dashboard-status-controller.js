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
  const STATUS_LOGIC = globalThis.PacePetsDashboardStatusLogic;
  if (!STATUS_LOGIC) {
    throw new Error(
      "Pace Pets dashboard status logic must load before dashboard-status-controller.js.",
    );
  }

  function sendRuntimeMessage(message) {
    return EXTENSION_STORAGE.callbackWithLastError((done) => {
      chrome.runtime.sendMessage(message, done);
    });
  }

  class DashboardStatusController {
    constructor({
      appTooltips,
      elements,
      formatClockTime,
      getCurrentHistory,
      loadDashboard,
      setCurrentRefreshStatus,
    }) {
      this.appTooltips = appTooltips;
      this.elements = elements;
      this.formatClockTime = formatClockTime;
      this.getCurrentHistory = getCurrentHistory;
      this.loadDashboard = loadDashboard;
      this.setCurrentRefreshStatus = setCurrentRefreshStatus;
      this.lastCheckedText =
        elements.lastCollectedValue.textContent.trim() || "waiting";
      this.lastCheckedFeedbackKey = null;
      this.collectionStatusText = STATUS_LOGIC.STATUS_TEXT.live;
      this.collectionStatusMode = "ok";
      this.collectionStatusTitle = STATUS_LOGIC.COLLECTION_STATUS_TITLE;
      this.collectionStatusDetail = "";
      this.manualRefreshAvailable = false;
      this.manualRefreshInFlight = false;
      this.manualRefreshCooldownUntilMs = 0;
      this.manualRefreshCooldownTimer = null;
      this.manualRefreshFeedback = null;
      this.manualRefreshFeedbackTimer = null;
      this.lastCollectedUpdateFeedbackTimer = null;
    }

    setCollectionStatusLabel(text, mode) {
      const label = STATUS_LOGIC.collectionStatusLabelText(text);
      this.elements.collectionStatusLabel.textContent = label;
      this.elements.collectionStatusLabel.hidden = !label;
      for (const state of ["stale", "warning", "error", "offline"]) {
        this.elements.collectionStatusLabel.classList.toggle(
          state,
          mode === state,
        );
      }
    }

    visibleCollectionStatus() {
      return (
        this.manualRefreshFeedback || {
          text: this.collectionStatusText,
          mode: this.collectionStatusMode,
          title: this.collectionStatusTitle,
          detail: this.collectionStatusDetail,
        }
      );
    }

    manualRefreshCooldownRemainingMs() {
      return Math.max(0, this.manualRefreshCooldownUntilMs - Date.now());
    }

    clearManualRefreshCooldownTimer() {
      window.clearTimeout(this.manualRefreshCooldownTimer);
      this.manualRefreshCooldownTimer = null;
    }

    manualRefreshTooltipText() {
      const remainingMs = this.manualRefreshCooldownRemainingMs();
      if (remainingMs > 0) {
        return `${STATUS_LOGIC.MANUAL_REFRESH_COOLDOWN_PREFIX} ${Math.ceil(
          remainingMs / 1000,
        )}s`;
      }

      return STATUS_LOGIC.MANUAL_REFRESH_DEFAULT_LABEL;
    }

    scheduleManualRefreshCooldownTimer() {
      this.clearManualRefreshCooldownTimer();
      const remainingMs = this.manualRefreshCooldownRemainingMs();
      if (remainingMs <= 0) {
        return;
      }

      this.manualRefreshCooldownTimer = window.setTimeout(
        () => {
          this.updateManualRefreshButton();
          this.scheduleManualRefreshCooldownTimer();
        },
        Math.min(1000, remainingMs),
      );
    }

    updateManualRefreshButton() {
      const button = this.elements.manualRefreshButton;
      if (!button) {
        return;
      }

      const remainingMs = this.manualRefreshCooldownRemainingMs();
      const disabled = this.manualRefreshInFlight || remainingMs > 0;
      const tooltipText = this.manualRefreshTooltipText();
      button.hidden = !this.manualRefreshAvailable;
      button.setAttribute("aria-disabled", String(disabled));
      button.setAttribute("aria-label", tooltipText);
      this.appTooltips.setText(button, tooltipText);

      if (this.manualRefreshAvailable && remainingMs > 0) {
        this.scheduleManualRefreshCooldownTimer();
      } else {
        this.clearManualRefreshCooldownTimer();
      }
    }

    renderCollectionStatus() {
      const state = this.visibleCollectionStatus();
      for (const mode of ["live", "stale", "offline", "error", "warning"]) {
        this.elements.collectionPulse.classList.toggle(
          mode,
          state.mode === mode,
        );
      }
      this.setCollectionStatusLabel(state.text, state.mode);

      const statusText = state.detail
        ? `${state.text}. ${state.detail}`
        : state.text;
      const title = state.title || STATUS_LOGIC.COLLECTION_STATUS_TITLE;
      this.appTooltips.setText(
        this.elements.collectionPulse,
        STATUS_LOGIC.statusTooltipText(title, state.text, state.detail),
      );
      this.elements.lastCollected.setAttribute(
        "aria-label",
        `Checked: ${this.lastCheckedText}. Status: ${statusText}`,
      );
      this.appTooltips.setText(
        this.elements.lastCollected,
        `Status: ${statusText}`,
      );
      this.updateManualRefreshButton();
    }

    setStatus(
      text,
      mode = "ok",
      title = STATUS_LOGIC.COLLECTION_STATUS_TITLE,
      detail = "",
      { manualRefresh = false } = {},
    ) {
      this.collectionStatusText = text;
      this.collectionStatusMode = mode;
      this.collectionStatusTitle = title;
      this.collectionStatusDetail = detail;
      this.manualRefreshAvailable = manualRefresh;
      this.renderCollectionStatus();
    }

    showLastCollectedUpdateFeedback() {
      const value = this.elements.lastCollectedValue;
      if (!value) {
        return;
      }

      window.clearTimeout(this.lastCollectedUpdateFeedbackTimer);
      value.classList.remove("is-updated");
      void value.offsetWidth;
      value.classList.add("is-updated");
      this.lastCollectedUpdateFeedbackTimer = window.setTimeout(() => {
        value.classList.remove("is-updated");
        this.lastCollectedUpdateFeedbackTimer = null;
      }, STATUS_LOGIC.LAST_COLLECTED_UPDATE_FEEDBACK_MS);
    }

    setLastCollected(value, feedbackKey = value) {
      const nextCheckedText = String(value || "waiting");
      const nextFeedbackKey = String(feedbackKey || nextCheckedText);
      const changed =
        this.lastCheckedFeedbackKey !== null &&
        nextFeedbackKey !== this.lastCheckedFeedbackKey;
      this.lastCheckedText = nextCheckedText;
      this.lastCheckedFeedbackKey = nextFeedbackKey;
      this.elements.lastCollectedValue.textContent = this.lastCheckedText;
      if (changed) {
        this.showLastCollectedUpdateFeedback();
      }
      this.renderCollectionStatus();
    }

    refreshFailureDetail(refreshStatus, latest = null) {
      return STATUS_LOGIC.refreshFailureDetail({
        formatClockTime: this.formatClockTime,
        latest,
        refreshStatus,
      });
    }

    clearManualRefreshFeedback() {
      window.clearTimeout(this.manualRefreshFeedbackTimer);
      this.manualRefreshFeedbackTimer = null;
      this.manualRefreshFeedback = null;
    }

    latestCurrentSample() {
      const currentHistory = this.getCurrentHistory();
      return currentHistory
        ? CodexUsageHistory.latestSample(currentHistory)
        : null;
    }

    manualRefreshFailureDetail(refreshStatus, error = null) {
      return refreshStatus
        ? this.refreshFailureDetail(refreshStatus, this.latestCurrentSample())
        : error?.message || "Could not request a usage check.";
    }

    showManualRefreshFailure(refreshStatus, error = null) {
      this.clearManualRefreshFeedback();
      this.manualRefreshFeedback = {
        text: STATUS_LOGIC.STATUS_TEXT.checkFailed,
        mode: "error",
        title: STATUS_LOGIC.COLLECTION_STATUS_TITLE,
        detail: this.manualRefreshFailureDetail(refreshStatus, error),
      };
      this.manualRefreshFeedbackTimer = window.setTimeout(() => {
        this.manualRefreshFeedback = null;
        this.manualRefreshFeedbackTimer = null;
        this.renderCollectionStatus();
      }, STATUS_LOGIC.MANUAL_REFRESH_FAILURE_VISIBLE_MS);
      this.renderCollectionStatus();
    }

    canRunManualRefresh() {
      return (
        this.manualRefreshAvailable &&
        !this.manualRefreshInFlight &&
        this.manualRefreshCooldownRemainingMs() <= 0
      );
    }

    startManualRefreshAttempt() {
      this.manualRefreshInFlight = true;
      this.manualRefreshCooldownUntilMs =
        Date.now() + REFRESH_CONTROL.MANUAL_REFRESH_COOLDOWN_MS;
      this.clearManualRefreshFeedback();
      this.renderCollectionStatus();
    }

    finishManualRefreshAttempt() {
      this.manualRefreshInFlight = false;
      this.renderCollectionStatus();
    }

    applyManualRefreshCooldown(response) {
      if (Number.isFinite(response?.cooldownRemainingMs)) {
        this.manualRefreshCooldownUntilMs =
          Date.now() + Math.max(0, response.cooldownRemainingMs);
      }
    }

    manualRefreshResponseFailed(response) {
      return (
        response?.refreshStatus?.ok === false ||
        (response?.ok === false &&
          !Number.isFinite(response?.cooldownRemainingMs))
      );
    }

    async applyManualRefreshResponse(response) {
      const refreshFailed = this.manualRefreshResponseFailed(response);
      this.applyManualRefreshCooldown(response);

      if (response?.refreshStatus) {
        this.setCurrentRefreshStatus(response.refreshStatus);
      }

      await this.loadDashboard({ refreshWindowPreference: false });

      if (refreshFailed) {
        this.showManualRefreshFailure(response?.refreshStatus);
        return;
      }

      this.clearManualRefreshFeedback();
    }

    handleManualRefreshError(error) {
      this.setStatus(
        STATUS_LOGIC.STATUS_TEXT.checkFailed,
        "error",
        STATUS_LOGIC.COLLECTION_STATUS_TITLE,
        error?.message || "Could not request a usage check.",
        { manualRefresh: true },
      );
      this.showManualRefreshFailure(null, error);
    }

    async runManualRefresh() {
      if (!this.canRunManualRefresh()) {
        return;
      }

      this.startManualRefreshAttempt();

      try {
        const response = await sendRuntimeMessage({
          type: REFRESH_CONTROL.REFRESH_NOW_MESSAGE_TYPE,
        });
        await this.applyManualRefreshResponse(response);
      } catch (error) {
        this.handleManualRefreshError(error);
      } finally {
        this.finishManualRefreshAttempt();
      }
    }
  }

  function createController(options) {
    const controller = new DashboardStatusController(options);
    return Object.freeze({
      refreshFailureDetail: controller.refreshFailureDetail.bind(controller),
      runManualRefresh: controller.runManualRefresh.bind(controller),
      setLastCollected: controller.setLastCollected.bind(controller),
      setStatus: controller.setStatus.bind(controller),
    });
  }

  globalThis.PacePetsDashboardStatus = Object.freeze({
    COLLECTION_STATUS_TITLE: STATUS_LOGIC.COLLECTION_STATUS_TITLE,
    SIGN_IN_NOT_FOUND_COPY: STATUS_LOGIC.SIGN_IN_NOT_FOUND_COPY,
    STATUS_TEXT: STATUS_LOGIC.STATUS_TEXT,
    createController,
    isFailedRefreshStatus: STATUS_LOGIC.isFailedRefreshStatus,
    isRecentRefreshStatus: STATUS_LOGIC.isRecentRefreshStatus,
    isSignInNotFoundStatus: STATUS_LOGIC.isSignInNotFoundStatus,
  });
})();

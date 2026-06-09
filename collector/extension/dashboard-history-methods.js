(() => {
  "use strict";

  const App = globalThis.PacePetsDashboardApp;
  if (!App) {
    throw new Error(
      "Pace Pets dashboard app core must load before dashboard-history-methods.js.",
    );
  }

  Object.assign(App.prototype, {
    windowsForSample(sample) {
      return sample?.windows && typeof sample.windows === "object"
        ? sample.windows
        : {};
    },

    paceRatioForWindow(windowData) {
      return PacePetsLogic.paceRatioForValues(
        windowData?.remainingPercent,
        this.DASHBOARD_TIME.timeRemainingPercent(windowData),
      );
    },

    alternatePaceRatioSummary(windows, activeKey) {
      const comparisonKey = this.USAGE_WINDOWS.alternateWindowKey(activeKey);
      if (!comparisonKey || !windows[comparisonKey]) {
        return null;
      }

      const paceRatio = this.paceRatioForWindow(windows[comparisonKey]);
      const label = `${this.WINDOW_SPECS[comparisonKey].badge}:`;
      if (paceRatio === null) {
        return { className: "", label, value: "--" };
      }

      return {
        className:
          PacePetsLogic.paceStatePresentationForRatio(paceRatio).className,
        label,
        value: PacePetsLogic.formatPaceRatioValue(paceRatio),
      };
    },

    setLatestMetadata(latest, refreshStatus = null) {
      const checkedAt = refreshStatus?.refreshedAt || latest?.collectedAt;
      const checkedValue = checkedAt
        ? this.DASHBOARD_TIME.formatClockTime(checkedAt)
        : "waiting";
      this.dashboardStatus.setLastCollected(
        checkedValue,
        checkedAt || checkedValue,
      );
    },

    renderSummaryWindow(windowKey, windowData, windows = {}, history) {
      const spec = this.WINDOW_SPECS[windowKey];
      const atMs = Date.now();
      const resetMs = this.DASHBOARD_TIME.dateMs(windowData?.resetsAt);
      const timePercent = this.DASHBOARD_TIME.timeRemainingPercent(
        windowData,
        atMs,
      );
      const hasResetTiming =
        resetMs !== null &&
        this.DASHBOARD_TIME.windowStartMs(windowData) !== null;
      const staleWindow = this.DASHBOARD_TIME.isResetWindowStale(
        windowData,
        atMs,
      );
      const resetCountdownDisplaysZero =
        this.DASHBOARD_TIME.resetCountdownDisplaysZero(
          windowData?.resetsAt,
          atMs,
        );

      this.elements.priorResetLabel.textContent = spec.priorResetLabel;
      this.elements.scheduledResetLabel.textContent = spec.scheduledResetLabel;
      this.elements.resetWindowCard.dataset.windowKey = windowKey;
      this.paceView.setPercent(
        this.elements.usagePercent,
        this.elements.usageBar,
        windowData?.remainingPercent,
      );
      this.paceView.setPercent(
        this.elements.timePercent,
        this.elements.timeBar,
        timePercent,
      );
      this.DASHBOARD_TIME.setResetParts(this.elements, windowData, spec, atMs);
      this.elements.resetsIn.textContent = this.DASHBOARD_TIME.resetCountdown(
        windowData?.resetsAt,
        atMs,
      );
      const paceSummary = this.paceView.renderPaceSummary(
        windowData,
        timePercent,
        staleWindow,
        this.alternatePaceRatioSummary(windows, windowKey),
        {
          allowPerfectZero: PacePetsLogic.allowsPerfectZeroForWindow(
            history,
            windowKey,
            windowData,
          ),
          resetCountdownDisplaysZero,
          waitingForReadingText: this.STATUS_TEXT.waitingForReading,
        },
      );
      if (paceSummary?.resetCountdownOverride) {
        this.elements.resetsIn.textContent = paceSummary.resetCountdownOverride;
      }

      return { hasResetTiming, staleWindow };
    },

    emptyHistoryState(refreshStatus) {
      if (this.DASHBOARD_STATUS.isSignInNotFoundStatus(refreshStatus)) {
        return {
          statusText: this.STATUS_TEXT.signInNotFound,
          statusMode: "warning",
          statusDetail:
            this.dashboardStatus.refreshFailureDetail(refreshStatus),
          paceTitle: this.STATUS_TEXT.signInNotFound,
          paceCopy: this.SIGN_IN_NOT_FOUND_COPY,
          chartCopy: this.STATUS_TEXT.signInNotFound,
        };
      }

      if (this.DASHBOARD_STATUS.isFailedRefreshStatus(refreshStatus)) {
        return {
          statusText: this.STATUS_TEXT.checkFailed,
          statusMode: "error",
          statusDetail:
            this.dashboardStatus.refreshFailureDetail(refreshStatus),
          paceTitle: this.STATUS_TEXT.checkFailed,
          paceCopy: refreshStatus.message || "The latest usage check failed.",
          chartCopy: "Waiting for local history.",
        };
      }

      return this.defaultEmptyHistoryState(refreshStatus);
    },

    defaultEmptyHistoryState(refreshStatus) {
      const refreshNeeded =
        refreshStatus?.ok === true &&
        !this.DASHBOARD_STATUS.isRecentRefreshStatus(refreshStatus);
      return {
        statusText: refreshNeeded
          ? this.STATUS_TEXT.refreshNeeded
          : this.STATUS_TEXT.waiting,
        statusMode: refreshNeeded ? "stale" : "ok",
        statusDetail: "",
        paceTitle: "No history yet",
        paceCopy: "Waiting for the first automatic usage check.",
        chartCopy: "Waiting for local history.",
      };
    },

    renderEmptyHistory(refreshStatus = null) {
      const windowKey = this.selectedSupportedWindowKey();
      const spec = this.WINDOW_SPECS[windowKey];
      const state = this.emptyHistoryState(refreshStatus);
      this.dashboardStatus.setStatus(
        state.statusText,
        state.statusMode,
        this.COLLECTION_STATUS_TITLE,
        state.statusDetail,
        { manualRefresh: true },
      );
      this.renderWindowControls(windowKey);
      this.elements.priorResetLabel.textContent = spec.priorResetLabel;
      this.elements.scheduledResetLabel.textContent = spec.scheduledResetLabel;
      this.elements.resetWindowCard.dataset.windowKey = windowKey;
      this.paceView.setPercent(
        this.elements.usagePercent,
        this.elements.usageBar,
        null,
      );
      this.paceView.setPercent(
        this.elements.timePercent,
        this.elements.timeBar,
        null,
      );
      this.DASHBOARD_TIME.setResetParts(this.elements, null, spec);
      this.elements.resetsIn.textContent = "--";
      this.paceView.setPaceSummary({
        copy: state.paceCopy,
        level: this.paceView.mutedClassName,
        remainingPercent: null,
        timePercent: null,
        title: state.paceTitle,
      });
      this.usageChartView.setEmpty(state.chartCopy);
      this.setLatestMetadata(null, refreshStatus);
      this.paceView.refreshForcedPaceStateOverride();
    },

    renderHistoryLoadFailure() {
      const windowKey = this.selectedSupportedWindowKey();
      const spec = this.WINDOW_SPECS[windowKey];
      this.dashboardStatus.setStatus(this.STATUS_TEXT.checkFailed, "error");
      this.renderWindowControls(windowKey);
      this.elements.priorResetLabel.textContent = spec.priorResetLabel;
      this.elements.scheduledResetLabel.textContent = spec.scheduledResetLabel;
      this.elements.resetWindowCard.dataset.windowKey = windowKey;
      this.paceView.setPercent(
        this.elements.usagePercent,
        this.elements.usageBar,
        null,
      );
      this.paceView.setPercent(
        this.elements.timePercent,
        this.elements.timeBar,
        null,
      );
      this.DASHBOARD_TIME.setResetParts(this.elements, null, spec);
      this.elements.resetsIn.textContent = "--";
      this.paceView.setPaceSummary({
        copy: "Could not read local history.",
        level: this.paceView.mutedClassName,
        remainingPercent: null,
        timePercent: null,
        title: this.STATUS_TEXT.checkFailed,
      });
      this.usageChartView.setEmpty("Could not read local history.");
      this.paceView.refreshForcedPaceStateOverride();
    },

    isManualRefreshLeadWindow(windowKey, windowData, atMs = Date.now()) {
      if (this.currentManualRefreshLeadWindow) {
        return true;
      }

      const leadWindowMs = this.manualRefreshLeadWindowMs(windowKey);
      const resetMs = this.DASHBOARD_TIME.dateMs(windowData?.resetsAt);
      return (
        leadWindowMs !== null &&
        resetMs !== null &&
        resetMs > atMs &&
        resetMs - atMs <= leadWindowMs
      );
    },

    failedHistoryStatus(refreshStatus, latest) {
      if (this.DASHBOARD_STATUS.isSignInNotFoundStatus(refreshStatus)) {
        return {
          text: this.STATUS_TEXT.signInNotFound,
          mode: "warning",
          detail: this.dashboardStatus.refreshFailureDetail(
            refreshStatus,
            latest,
          ),
          manualRefresh: true,
        };
      }
      if (this.DASHBOARD_STATUS.isFailedRefreshStatus(refreshStatus)) {
        return {
          text: this.STATUS_TEXT.checkFailed,
          mode: "error",
          detail: this.dashboardStatus.refreshFailureDetail(
            refreshStatus,
            latest,
          ),
          manualRefresh: true,
        };
      }
      return null;
    },

    staleRefreshStatus(refreshStatus) {
      if (
        refreshStatus?.ok === true &&
        !this.DASHBOARD_STATUS.isRecentRefreshStatus(refreshStatus)
      ) {
        return {
          text: this.STATUS_TEXT.refreshNeeded,
          mode: "stale",
          detail: "",
          manualRefresh: true,
        };
      }
      return null;
    },

    missingWindowStatus(hasAnySupportedWindow, summaryWindow, summaryState) {
      if (
        hasAnySupportedWindow &&
        summaryWindow &&
        summaryState.hasResetTiming
      ) {
        return null;
      }
      return {
        text: this.STATUS_TEXT.waiting,
        mode: "warning",
        detail: "",
        manualRefresh: true,
      };
    },

    staleWindowStatus(refreshStatus, summaryState) {
      if (!summaryState.staleWindow) {
        return null;
      }
      if (
        refreshStatus?.ok === true &&
        this.DASHBOARD_STATUS.isRecentRefreshStatus(refreshStatus)
      ) {
        return {
          text: this.STATUS_TEXT.waitingForReading,
          mode: "live",
          detail: "",
        };
      }
      return {
        text: this.STATUS_TEXT.refreshNeeded,
        mode: "stale",
        detail: "",
        manualRefresh: true,
      };
    },

    historyStatusState(context) {
      return (
        this.failedHistoryStatus(context.refreshStatus, context.latest) ||
        this.staleRefreshStatus(context.refreshStatus) ||
        this.missingWindowStatus(
          context.hasAnySupportedWindow,
          context.summaryWindow,
          context.summaryState,
        ) ||
        this.staleWindowStatus(context.refreshStatus, context.summaryState) || {
          text: this.STATUS_TEXT.live,
          mode: "live",
          detail: "",
          manualRefresh: this.isManualRefreshLeadWindow(
            context.summaryWindowKey,
            context.summaryWindow,
          ),
        }
      );
    },

    applyHistoryStatus(state) {
      this.dashboardStatus.setStatus(
        state.text,
        state.mode,
        this.COLLECTION_STATUS_TITLE,
        state.detail,
        { manualRefresh: state.manualRefresh === true },
      );
    },

    renderHistory(history, refreshStatus = null, { refreshChart = true } = {}) {
      const latest = CodexUsageHistory.latestSample(history);
      if (!latest) {
        this.renderEmptyHistory(refreshStatus);
        return;
      }

      const windows = this.windowsForSample(latest);
      const summaryWindowKey = this.selectedSupportedWindowKey();
      const summaryWindow = windows[summaryWindowKey];
      this.renderWindowControls(summaryWindowKey);
      const summaryState = this.renderSummaryWindow(
        summaryWindowKey,
        summaryWindow,
        windows,
        history,
      );
      this.applyHistoryStatus(
        this.historyStatusState({
          refreshStatus,
          latest,
          hasAnySupportedWindow: this.USAGE_WINDOWS.WINDOW_KEYS.some(
            (windowKey) => windows[windowKey],
          ),
          summaryWindowKey,
          summaryWindow,
          summaryState,
        }),
      );
      if (refreshChart) {
        this.usageChartView.renderHistory({
          hasResetTiming: summaryState.hasResetTiming,
          history,
          summaryWindowKey,
          summaryWindow,
        });
      }
      this.setLatestMetadata(latest, refreshStatus);
      this.paceView.refreshForcedPaceStateOverride();
    },
  });
})();

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

    applyPaceSummaryResetCountdown(paceSummary, applyPaceSummary) {
      if (!applyPaceSummary || !paceSummary?.resetCountdownOverride) {
        return;
      }

      this.elements.resetsIn.textContent = paceSummary.resetCountdownOverride;
      this.elements.paceBurnoutIn.textContent =
        paceSummary.resetCountdownOverride;
    },

    renderSummaryWindowPace({
      applyPaceSummary,
      history,
      resetCountdownDisplaysZero,
      staleWindow,
      timePercent,
      windowData,
      windowKey,
      windows,
    }) {
      const paceSummary = this.paceView.renderPaceSummary(
        windowData,
        timePercent,
        staleWindow,
        this.alternatePaceRatioSummary(windows, windowKey),
        {
          applySummary: applyPaceSummary,
          allowPerfectZero: PacePetsLogic.allowsPerfectZeroForWindow(
            history,
            windowKey,
            windowData,
          ),
          resetCountdownDisplaysZero,
          waitingForReadingText: this.STATUS_TEXT.waitingForReading,
        },
      );
      this.applyPaceSummaryResetCountdown(paceSummary, applyPaceSummary);
    },

    renderSummaryWindow(
      windowKey,
      windowData,
      windows = {},
      history,
      { applyPaceSummary = true } = {},
    ) {
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
      this.elements.paceBurnoutIn.textContent =
        this.DASHBOARD_TIME.paceBurnoutCountdown(windowData, atMs);
      this.renderSummaryWindowPace({
        applyPaceSummary,
        history,
        resetCountdownDisplaysZero,
        staleWindow,
        timePercent,
        windowData,
        windowKey,
        windows,
      });

      return { hasResetTiming, staleWindow };
    },

    renderEmptyHistory(refreshStatus = null) {
      const windowKey = this.selectedSupportedWindowKey();
      const spec = this.WINDOW_SPECS[windowKey];
      const state = this.DASHBOARD_STATUS.emptyHistoryCollectionState({
        formatClockTime: this.DASHBOARD_TIME.formatClockTime,
        refreshStatus,
      });
      this.applyHistoryStatus(state.status);
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
      this.elements.paceBurnoutIn.textContent = "--";
      if (!this.paceView.hasForcedPaceStateOverride()) {
        this.paceView.setPaceSummary({
          copy: state.paceCopy,
          level: this.paceView.mutedClassName,
          remainingPercent: null,
          timePercent: null,
          title: state.paceTitle,
        });
      }
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
      this.elements.paceBurnoutIn.textContent = "--";
      if (!this.paceView.hasForcedPaceStateOverride()) {
        this.paceView.setPaceSummary({
          copy: "Could not read local history.",
          level: this.paceView.mutedClassName,
          remainingPercent: null,
          timePercent: null,
          title: this.STATUS_TEXT.checkFailed,
        });
      }
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
      const forcedPaceStateOverrideActive =
        this.paceView.hasForcedPaceStateOverride();
      const summaryState = this.renderSummaryWindow(
        summaryWindowKey,
        summaryWindow,
        windows,
        history,
        { applyPaceSummary: !forcedPaceStateOverrideActive },
      );
      this.applyHistoryStatus(
        this.DASHBOARD_STATUS.historyCollectionStatusState({
          formatClockTime: this.DASHBOARD_TIME.formatClockTime,
          refreshStatus,
          latest,
          hasAnySupportedWindow: this.USAGE_WINDOWS.WINDOW_KEYS.some(
            (windowKey) => windows[windowKey],
          ),
          hasResetTiming: summaryState.hasResetTiming,
          manualRefreshLeadWindow: this.isManualRefreshLeadWindow(
            summaryWindowKey,
            summaryWindow,
          ),
          summaryWindow,
          staleWindow: summaryState.staleWindow,
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

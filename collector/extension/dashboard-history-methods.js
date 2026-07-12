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

    setPaceBurnoutMetrics(windowData, atMs) {
      this.elements.paceBurnoutIn.textContent =
        this.DASHBOARD_TIME.paceBurnoutCountdown(windowData, atMs);
    },

    clearPaceBurnoutMetrics() {
      this.elements.paceBurnoutIn.textContent = "--";
    },

    setResetBudgetRate(windowData, atMs) {
      const rate = this.DASHBOARD_TIME.resetBudgetRate(windowData, atMs);
      this.elements.resetBudgetRateValue.textContent = rate.value;
      this.elements.resetBudgetRateUnit.textContent = rate.unit;
      this.elements.resetBudgetRate.hidden = rate.value === "--";
    },

    clearResetBudgetRate() {
      this.elements.resetBudgetRateValue.textContent = "--";
      this.elements.resetBudgetRateUnit.textContent = "";
      this.elements.resetBudgetRate.hidden = true;
    },

    applyPaceSummaryResetCountdown(paceSummary, applyPaceSummary) {
      if (!applyPaceSummary || !paceSummary?.resetCountdownOverride) {
        return;
      }

      this.elements.resetsIn.textContent = paceSummary.resetCountdownOverride;
      this.elements.paceBurnoutIn.textContent =
        paceSummary.resetCountdownOverride;
      this.clearResetBudgetRate();
    },

    renderSummaryWindowPace({
      applyPaceSummary,
      history,
      resetCountdownDisplaysZero,
      staleWindow,
      timePercent,
      heldZeroStateKey,
      renderAtMs,
      windowData,
      windowKey,
      windows,
    }) {
      const paceSummary = this.paceView.renderPaceSummary(
        windowData,
        timePercent,
        staleWindow,
        this.alternatePaceRatioSummary(windows, windowKey, history, renderAtMs),
        {
          applySummary: applyPaceSummary,
          allowPerfectZero: PacePetsLogic.allowsPerfectZeroForWindow(
            history,
            windowKey,
            windowData,
          ),
          heldZeroStateKey,
          resetCountdownDisplaysZero,
        },
      );
      this.applyPaceSummaryResetCountdown(paceSummary, applyPaceSummary);
      return paceSummary;
    },

    renderSummaryWindow(
      windowKey,
      windowData,
      windows = {},
      history,
      {
        applyPaceSummary = true,
        heldZeroStateKey = null,
        renderAtMs = Date.now(),
      } = {},
    ) {
      const spec = this.WINDOW_SPECS[windowKey];
      const timing = this.summaryWindowTiming(windowData, renderAtMs);

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
        timing.timePercent,
      );
      this.DASHBOARD_TIME.setResetParts(
        this.elements,
        windowData,
        spec,
        renderAtMs,
      );
      this.elements.resetsIn.textContent = this.DASHBOARD_TIME.resetCountdown(
        windowData?.resetsAt,
        renderAtMs,
      );
      this.setResetBudgetRate(windowData, renderAtMs);
      this.setPaceBurnoutMetrics(windowData, renderAtMs);
      const paceSummary = this.renderSummaryWindowPace({
        applyPaceSummary,
        history,
        resetCountdownDisplaysZero: timing.resetCountdownDisplaysZero,
        staleWindow: timing.staleWindow,
        timePercent: timing.timePercent,
        heldZeroStateKey,
        renderAtMs,
        windowData,
        windowKey,
        windows,
      });

      return {
        hasResetTiming: timing.hasResetTiming,
        heldZeroState: paceSummary?.heldZeroState === true,
        staleWindow: timing.staleWindow,
      };
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
      this.clearResetBudgetRate();
      this.clearPaceBurnoutMetrics();
      if (!this.paceView.hasForcedPaceStateOverride()) {
        this.paceView.setPaceSummary({
          copy: state.paceCopy,
          level: this.paceView.nothingnessClassName,
          remainingPercent: null,
          timePercent: null,
          title: state.paceTitle,
        });
      }
      this.usageChartView.renderEmptyData({ windowData: null, windowKey });
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
      this.clearResetBudgetRate();
      this.clearPaceBurnoutMetrics();
      if (!this.paceView.hasForcedPaceStateOverride()) {
        this.paceView.setPaceSummary({
          copy: PacePetsLogic.PACE_STATES.nothingness.copyByReason.checkFailed,
          level: this.paceView.nothingnessClassName,
          remainingPercent: null,
          timePercent: null,
          title: this.paceView.nothingnessTitle,
        });
      }
      this.usageChartView.renderEmptyData({ windowData: null, windowKey });
      this.paceView.refreshForcedPaceStateOverride();
      this.completeHistoryPresentation();
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

    completeHistoryPresentation() {
      if (
        this.dashboardStateMutationInProgress ||
        this.dashboardStateLoader?.isLoading?.()
      ) {
        return;
      }
      this.dashboardPresentationAuthoritative = true;
      this.initialDashboardLoadComplete = true;
      this.paceView.playPendingSpecialTransition?.();
    },

    renderHistory(history, refreshStatus = null, { refreshChart = true } = {}) {
      const renderAtMs = Date.now();
      const latest = CodexUsageHistory.latestSample(history);
      if (!latest) {
        this.renderEmptyHistory(refreshStatus);
        this.scheduleNextDashboardRefresh?.(renderAtMs);
        this.completeHistoryPresentation();
        return;
      }

      const windows = this.windowsForSample(latest);
      const summaryWindowKey = this.selectedSupportedWindowKey();
      const summaryWindow = windows[summaryWindowKey];
      const heldZeroStates = this.updateCurrentHeldZeroStates(
        history,
        refreshStatus,
        windows,
        renderAtMs,
      );
      const heldZeroStateKey =
        globalThis.PacePetsHeldZeroState.stateKeyForWindow(
          heldZeroStates,
          summaryWindowKey,
          summaryWindow,
        );
      this.renderWindowControls(summaryWindowKey);
      const forcedPaceStateOverrideActive =
        this.paceView.hasForcedPaceStateOverride();
      const summaryState = this.renderSummaryWindow(
        summaryWindowKey,
        summaryWindow,
        windows,
        history,
        {
          applyPaceSummary: !forcedPaceStateOverrideActive,
          heldZeroStateKey,
          renderAtMs,
        },
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
            renderAtMs,
          ),
          summaryWindow,
          staleWindow:
            summaryState.staleWindow && summaryState.heldZeroState !== true,
        }),
      );
      if (refreshChart) {
        this.usageChartView.renderHistory({
          atMs: renderAtMs,
          hasResetTiming: summaryState.hasResetTiming,
          history,
          summaryWindowKey,
          summaryWindow,
        });
      } else {
        this.usageChartView.refreshHistoryLivePoint({
          atMs: renderAtMs,
          summaryWindowKey,
          summaryWindow,
        });
      }
      this.setLatestMetadata(latest, refreshStatus);
      this.paceView.refreshForcedPaceStateOverride();
      this.scheduleNextDashboardRefresh?.(renderAtMs);
      this.completeHistoryPresentation();
    },
  });
})();

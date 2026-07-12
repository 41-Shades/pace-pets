(() => {
  "use strict";

  const App = globalThis.PacePetsDashboardApp;
  if (!App) {
    throw new Error(
      "Pace Pets dashboard app core must load before dashboard-history-timing-methods.js.",
    );
  }

  Object.assign(App.prototype, {
    alternatePaceRatioSummary(windows, activeKey, history, atMs = Date.now()) {
      const comparisonKey = this.USAGE_WINDOWS.alternateWindowKey(activeKey);
      if (!comparisonKey || !windows[comparisonKey]) {
        return null;
      }

      const presentation = PacePetsLogic.pacePresentationForWindow(
        windows[comparisonKey],
        {
          allowPerfectZero: PacePetsLogic.allowsPerfectZeroForWindow(
            history,
            comparisonKey,
            windows[comparisonKey],
          ),
          atMs,
        },
      );
      const label = `${this.WINDOW_SPECS[comparisonKey].badge}:`;
      if (presentation.displayRatio === null) {
        return { className: "", label, value: "--" };
      }

      return {
        className: presentation.state.className,
        label,
        value: PacePetsLogic.formatPaceRatioValue(presentation.displayRatio),
      };
    },

    presentedStateKeysByWindow(history, windows, atMs) {
      return Object.fromEntries(
        this.USAGE_WINDOWS.WINDOW_KEYS.filter(
          (windowKey) => windows[windowKey],
        ).map((windowKey) => [
          windowKey,
          PacePetsLogic.pacePresentationForWindow(windows[windowKey], {
            allowPerfectZero: PacePetsLogic.allowsPerfectZeroForWindow(
              history,
              windowKey,
              windows[windowKey],
            ),
            atMs,
          }).state.key,
        ]),
      );
    },

    updateCurrentHeldZeroStates(history, refreshStatus, windows, atMs) {
      const previous =
        globalThis.PacePetsHeldZeroState.mergeHeldZeroStatesForWindows(
          windows,
          this.currentHeldZeroStates,
          refreshStatus?.heldZeroStates,
        );
      this.currentHeldZeroStates =
        globalThis.PacePetsHeldZeroState.nextHeldZeroStates(
          previous,
          windows,
          this.presentedStateKeysByWindow(history, windows, atMs),
          atMs,
        );
      return this.currentHeldZeroStates;
    },

    summaryWindowHasResetTiming(windowData, resetMs) {
      return (
        resetMs !== null &&
        this.DASHBOARD_TIME.windowStartMs(windowData) !== null
      );
    },

    summaryWindowTiming(windowData, renderAtMs) {
      const resetMs = this.DASHBOARD_TIME.dateMs(windowData?.resetsAt);
      const staleWindow = this.DASHBOARD_TIME.isResetWindowStale(
        windowData,
        renderAtMs,
      );
      const timePercent = this.DASHBOARD_TIME.timeRemainingPercent(
        windowData,
        renderAtMs,
      );
      return {
        hasResetTiming: this.summaryWindowHasResetTiming(windowData, resetMs),
        resetCountdownDisplaysZero:
          this.DASHBOARD_TIME.resetCountdownDisplaysZero(
            windowData?.resetsAt,
            renderAtMs,
          ),
        staleWindow,
        timePercent,
      };
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
  });
})();

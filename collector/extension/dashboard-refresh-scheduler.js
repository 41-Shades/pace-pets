(() => {
  "use strict";

  const MAX_REFRESH_DELAY_MS = 60 * 1000;
  const MIN_REFRESH_DELAY_MS = 50;
  const MS_PER_MINUTE = 60 * 1000;
  const App = globalThis.PacePetsDashboardApp;
  if (!App) {
    throw new Error(
      "Pace Pets dashboard app core must load before dashboard-refresh-scheduler.js.",
    );
  }

  function countdownBucket(windowData, atMs) {
    const resetMs = PacePetsLogic.dateMs(windowData?.resetsAt);
    if (resetMs === null) {
      return "missing";
    }
    const remainingMs = resetMs - atMs;
    return remainingMs <= 0 ? "ended" : Math.floor(remainingMs / MS_PER_MINUTE);
  }

  function stateKeyForWindow(context, windowKey, atMs) {
    const windowData = context.windows[windowKey];
    if (!windowData) {
      return "missing";
    }
    return PacePetsLogic.pacePresentationForWindow(windowData, {
      allowPerfectZero: context.allowPerfectZeroByKey[windowKey],
      atMs,
    }).state.key;
  }

  function manualRefreshLeadActive(context, windowData, atMs) {
    if (context.manualRefreshLeadForced) {
      return true;
    }
    const resetMs = PacePetsLogic.dateMs(windowData?.resetsAt);
    return (
      context.manualRefreshLeadWindowMs !== null &&
      resetMs !== null &&
      resetMs > atMs &&
      resetMs - atMs <= context.manualRefreshLeadWindowMs
    );
  }

  function presentationSignature(context, atMs) {
    const selectedWindow = context.windows[context.selectedWindowKey];
    const timeDisplayPercent = PacePetsLogic.roundedDisplayPercent(
      PacePetsLogic.timeRemainingPercentAt(selectedWindow, atMs),
    );
    return [
      timeDisplayPercent,
      countdownBucket(selectedWindow, atMs),
      PacePetsLogic.isResetWindowStale(selectedWindow, atMs),
      manualRefreshLeadActive(context, selectedWindow, atMs),
      stateKeyForWindow(context, context.selectedWindowKey, atMs),
      stateKeyForWindow(context, context.alternateWindowKey, atMs),
    ].join("|");
  }

  function firstSignatureChangeDelay(context, atMs) {
    const initialSignature = presentationSignature(context, atMs);
    if (
      presentationSignature(context, atMs + MAX_REFRESH_DELAY_MS) ===
      initialSignature
    ) {
      return MAX_REFRESH_DELAY_MS;
    }

    let low = 1;
    let high = MAX_REFRESH_DELAY_MS;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (presentationSignature(context, atMs + middle) === initialSignature) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return Math.max(MIN_REFRESH_DELAY_MS, low);
  }

  Object.assign(App.prototype, {
    dashboardRefreshContext() {
      const history = this.currentHistory;
      const latest = CodexUsageHistory.latestSample(history);
      const windows = this.windowsForSample(latest);
      const selectedWindowKey = this.selectedAvailableWindowKey();
      const alternateWindowKey =
        this.USAGE_WINDOWS.alternateWindowKey(selectedWindowKey);
      const windowKeys = [selectedWindowKey, alternateWindowKey].filter(
        (windowKey) => windowKey && windows[windowKey],
      );
      return {
        allowPerfectZeroByKey: Object.fromEntries(
          windowKeys.map((windowKey) => [
            windowKey,
            PacePetsLogic.allowsPerfectZeroForWindow(
              history,
              windowKey,
              windows[windowKey],
            ),
          ]),
        ),
        alternateWindowKey,
        manualRefreshLeadForced: this.currentManualRefreshLeadWindow === true,
        manualRefreshLeadWindowMs:
          this.manualRefreshLeadWindowMs(selectedWindowKey),
        selectedWindowKey,
        windows,
      };
    },

    nextDashboardRefreshDelay(atMs = Date.now()) {
      return firstSignatureChangeDelay(this.dashboardRefreshContext(), atMs);
    },

    clearDashboardRefreshTimer() {
      globalThis.clearTimeout(this.dashboardRefreshTimer);
      this.dashboardRefreshTimer = null;
      this.dashboardRefreshGeneration += 1;
    },

    scheduleNextDashboardRefresh(atMs = Date.now()) {
      this.clearDashboardRefreshTimer();
      if (globalThis.document?.hidden === true) {
        return null;
      }

      const delayMs = this.nextDashboardRefreshDelay(atMs);
      const generation = this.dashboardRefreshGeneration;
      this.dashboardRefreshTimer = globalThis.setTimeout(() => {
        this.runScheduledDashboardRefresh(generation);
      }, delayMs);
      return delayMs;
    },

    async runScheduledDashboardRefresh(generation) {
      if (
        generation !== this.dashboardRefreshGeneration ||
        globalThis.document?.hidden === true
      ) {
        return false;
      }

      this.dashboardRefreshTimer = null;
      try {
        await this.refreshDashboardTimeSensitiveViews();
        return true;
      } catch (error) {
        this.renderHistoryLoadFailure(error);
        return false;
      } finally {
        if (
          generation === this.dashboardRefreshGeneration &&
          this.dashboardRefreshTimer === null &&
          globalThis.document?.hidden !== true
        ) {
          this.scheduleNextDashboardRefresh();
        }
      }
    },
  });
})();

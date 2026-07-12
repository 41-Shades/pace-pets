(() => {
  "use strict";

  const App = globalThis.PacePetsDashboardApp;
  if (!App) {
    throw new Error(
      "Dashboard app core must load before dashboard-state-methods.js.",
    );
  }

  Object.assign(App.prototype, {
    async readDeveloperOptions() {
      try {
        const items = await this.EXTENSION_STORAGE.getLocal(
          this.DEVELOPER_OPTIONS_STORAGE_KEY,
        );
        return this.DEVELOPER_OPTIONS.developerOptionsFromStorageItems(items);
      } catch (error) {
        console.warn("Could not read developer options:", error.message);
        return this.DEVELOPER_OPTIONS.normalizeDeveloperOptions(null);
      }
    },

    async readDashboardState({ refreshWindowSelection = true } = {}) {
      const [history, refreshStatus, dashboardWindowKey, developerOptions] =
        await Promise.all([
          CodexUsageHistory.readHistory(),
          CodexUsageHistory.readRefreshStatus(),
          refreshWindowSelection
            ? this.readDashboardWindowKey()
            : Promise.resolve(null),
          this.readDeveloperOptions(),
        ]);

      return Object.freeze({
        dashboardWindowKey,
        developerOptions,
        history,
        refreshStatus,
        refreshWindowSelection,
      });
    },

    applyDashboardState({
      dashboardWindowKey,
      developerOptions,
      history,
      refreshStatus,
      refreshWindowSelection,
    }) {
      if (refreshWindowSelection) {
        this.selectedWindowKey = dashboardWindowKey;
        this.storeSessionWindowKey(dashboardWindowKey);
      }
      this.currentCheckerboardRevealWhiteTransparent =
        developerOptions.checkerboardRevealWhiteTransparent;
      this.currentBrakeIntensityPreview =
        developerOptions.brakeIntensityPreview;
      this.currentForcedPaceStateKey = developerOptions.forcedPaceStateKey;
      this.currentManualRefreshLeadWindow =
        developerOptions.manualRefreshLeadWindow;
      this.currentMaxPoolFill = developerOptions.maxPoolFill;
      this.currentRailHidden = developerOptions.railHidden;
      this.currentResetExhaustedPreview =
        developerOptions.resetExhaustedPreview;
      this.currentSplatTimeRemainingPreview =
        developerOptions.splatTimeRemainingPreview;
      this.currentSprintIntensityPreview =
        developerOptions.sprintIntensityPreview;
      this.currentHistory = history;
      this.currentRefreshStatus = refreshStatus;
      this.renderResetExhaustedPreview();
      this.paceView.renderStateRail();
      this.renderHistory(this.currentHistory, this.currentRefreshStatus);
    },

    async clearLocalUsageData() {
      const priorPresentationAuthoritative =
        this.dashboardPresentationAuthoritative;
      this.dashboardPresentationAuthoritative = false;
      this.dashboardStateMutationInProgress = true;
      this.dashboardStateLoader.invalidate();
      let response;
      try {
        response = await this.EXTENSION_STORAGE.callbackWithLastError(
          (done) => {
            chrome.runtime.sendMessage(
              this.REFRESH_CONTROL.clearUsageDataMessage(),
              done,
            );
          },
        );
        if (!response?.ok) {
          throw new Error(
            response?.message ||
              this.REFRESH_CONTROL.CLEAR_USAGE_DATA_FAILURE_MESSAGE,
          );
        }
      } catch (error) {
        this.dashboardStateMutationInProgress = false;
        await this.recoverFailedClear(priorPresentationAuthoritative);
        throw error;
      }

      try {
        this.commitClearedDashboardState(response);
      } finally {
        this.dashboardStateMutationInProgress = false;
      }
      this.completeHistoryPresentation();
    },

    commitClearedDashboardState(response) {
      this.dashboardStateLoader.invalidate();
      this.currentHeldZeroStates = {};
      this.currentHistory = CodexUsageHistory.normalizeHistory(
        response.history,
      );
      this.currentRefreshStatus = CodexUsageHistory.normalizeRefreshStatus(
        response.refreshStatus,
      );
      this.renderHistory(this.currentHistory, this.currentRefreshStatus);
    },

    async recoverFailedClear(priorPresentationAuthoritative) {
      try {
        await this.loadDashboard();
        return;
      } catch {
        // The prior presentation remains the only safe local recovery option.
      }
      if (
        priorPresentationAuthoritative &&
        !this.dashboardStateLoader.isLoading()
      ) {
        this.completeHistoryPresentation();
      }
    },

    async loadDashboard(options) {
      this.dashboardPresentationAuthoritative = false;
      const committed = await this.dashboardStateLoader.load(options);
      if (committed) {
        this.completeHistoryPresentation();
      }
      return committed;
    },
  });
})();

(() => {
  "use strict";

  const DASHBOARD_STATUS_REFRESH_INTERVAL_MS = 60 * 1000;
  const MS_PER_MINUTE = 60 * 1000;

  class PacePetsDashboardApp {
    constructor({ dependencies, elements }) {
      Object.assign(this, dependencies);
      this.elements = elements;
      this.DEFAULT_WINDOW_KEY = this.USAGE_WINDOWS.DEFAULT_WINDOW_KEY;
      this.BADGE_WINDOW_STORAGE_KEY =
        this.USAGE_WINDOWS.BADGE_WINDOW_STORAGE_KEY;
      this.DASHBOARD_WINDOW_SESSION_KEY =
        this.DASHBOARD_PREFERENCES.DASHBOARD_WINDOW_SESSION_KEY;
      this.DEVELOPER_OPTIONS_STORAGE_KEY = this.DEVELOPER_OPTIONS.STORAGE_KEY;
      this.COLLECTION_STATUS_TITLE =
        this.DASHBOARD_STATUS.COLLECTION_STATUS_TITLE;
      this.STATUS_TEXT = this.DASHBOARD_STATUS.STATUS_TEXT;
      this.SIGN_IN_NOT_FOUND_COPY =
        this.DASHBOARD_STATUS.SIGN_IN_NOT_FOUND_COPY;
      this.WINDOW_SPECS = this.USAGE_WINDOWS.WINDOW_SPECS;
      this.currentHistory = null;
      this.currentRefreshStatus = null;
      this.currentForcedPaceStateKey = null;
      this.currentManualRefreshLeadWindow = false;
      this.currentMaxPoolFill = false;
      this.currentResetExhaustedPreview = false;
      this.currentSingularityBlackHoleVersion =
        this.DEVELOPER_OPTIONS.DEFAULT_SINGULARITY_BLACK_HOLE_VERSION;
      this.currentSprintIntensityPreview = null;
      this.selectedWindowKey = this.DEFAULT_WINDOW_KEY;
      this.createControllers();
      this.applyProductMetadata();
    }

    createControllers() {
      this.appTooltips = this.APP_TOOLTIPS.createController({
        tooltipElement: this.elements.appTooltip,
      });
      this.earlyReset = this.EARLY_RESET.createController({
        button: this.elements.earlyResetButton,
        hideTooltip: this.appTooltips.hide,
        popover: this.elements.earlyResetPopover,
        popoverText: this.elements.earlyResetPopoverText,
      });
      this.usageChartView = this.DASHBOARD_CHART.createRenderer({
        chartCanvas: this.elements.chartCanvas,
        chartFrame: this.elements.chartFrame,
        chartState: this.elements.chartState,
        windowSpecs: this.WINDOW_SPECS,
      });
      this.shellControls = this.SHELL_CONTROLS.createController({
        appTooltips: this.appTooltips,
        earlyReset: this.earlyReset,
        elements: this.elements,
        refreshThemeSensitiveViews: () => this.refreshThemeSensitiveViews(),
      });
      this.createStatusAndPaceControllers();
    }

    createStatusAndPaceControllers() {
      this.dashboardStatus = this.DASHBOARD_STATUS.createController({
        appTooltips: this.appTooltips,
        elements: this.elements,
        formatClockTime: this.DASHBOARD_TIME.formatClockTime,
        getCurrentHistory: () => this.currentHistory,
        loadDashboard: (options) => this.loadDashboard(options),
        setCurrentRefreshStatus: (refreshStatus) => {
          this.currentRefreshStatus = refreshStatus;
        },
      });
      this.paceView = this.DASHBOARD_PACE.createController({
        defaultWindowKey: this.DEFAULT_WINDOW_KEY,
        elements: this.elements,
        getCurrentForcedPaceStateKey: () => this.currentForcedPaceStateKey,
        getCurrentHistory: () => this.currentHistory,
        getCurrentMaxPoolFill: () => this.currentMaxPoolFill,
        getCurrentRefreshStatus: () => this.currentRefreshStatus,
        getCurrentSingularityBlackHoleVersion: () =>
          this.currentSingularityBlackHoleVersion,
        getCurrentSprintIntensityPreview: () =>
          this.currentSprintIntensityPreview,
        getSelectedWindowKey: () => this.selectedWindowKey,
        renderHistory: (history, refreshStatus, options) =>
          this.renderHistory(history, refreshStatus, options),
        selectedSupportedWindowKey: () => this.selectedSupportedWindowKey(),
        usageChartView: this.usageChartView,
        windowSpecs: this.WINDOW_SPECS,
      });
    }

    applyProductMetadata() {
      const manifest = chrome.runtime.getManifest();
      document.title = this.PRODUCT_METADATA.NAME;
      this.elements.usageTitle.textContent = this.PRODUCT_METADATA.NAME;
      this.elements.usageDescription.textContent =
        this.PRODUCT_METADATA.DASHBOARD_DESCRIPTION;
      this.elements.collectorVersion.textContent = `v${manifest.version}`;
    }

    normalizedWindowKey(value) {
      return this.USAGE_WINDOWS.normalizeWindowKey(value);
    }

    readSessionWindowKey() {
      const result = this.DASHBOARD_PREFERENCES.readDashboardWindowPreference();
      if (result.error) {
        console.warn(
          "Could not read dashboard window preference:",
          result.error.message,
        );
      }
      return result.value;
    }

    storeSessionWindowKey(windowKey) {
      const result =
        this.DASHBOARD_PREFERENCES.storeDashboardWindowPreference(windowKey);
      if (result.error) {
        console.warn(
          "Could not store dashboard window preference:",
          result.error.message,
        );
      }
    }

    async readBadgeWindowKey() {
      try {
        const items = await this.EXTENSION_STORAGE.getLocal(
          this.BADGE_WINDOW_STORAGE_KEY,
        );
        return this.normalizedWindowKey(items[this.BADGE_WINDOW_STORAGE_KEY]);
      } catch (error) {
        console.warn("Could not read badge window preference:", error.message);
        return this.DEFAULT_WINDOW_KEY;
      }
    }

    async readDashboardWindowKey() {
      const sessionWindowKey = this.readSessionWindowKey();
      if (sessionWindowKey) {
        return sessionWindowKey;
      }

      const badgeWindowKey = await this.readBadgeWindowKey();
      this.storeSessionWindowKey(badgeWindowKey);
      return badgeWindowKey;
    }

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
    }

    selectedSupportedWindowKey() {
      if (this.USAGE_WINDOWS.isSupportedWindowKey(this.selectedWindowKey)) {
        return this.selectedWindowKey;
      }

      this.selectedWindowKey = this.DEFAULT_WINDOW_KEY;
      return this.DEFAULT_WINDOW_KEY;
    }

    renderWindowControls(activeKey) {
      const nextKey = this.USAGE_WINDOWS.alternateWindowKey(activeKey);
      this.elements.windowToggle.disabled = !nextKey;
      this.elements.windowToggle.dataset.nextWindowKey = nextKey || "";
      this.appTooltips.setText(
        this.elements.windowToggle,
        nextKey ? "Toggle time window (T)" : "",
      );
      this.elements.windowToggle.setAttribute(
        "aria-label",
        nextKey
          ? `Usage window ${this.WINDOW_SPECS[activeKey].badge}. Switch to ${this.WINDOW_SPECS[nextKey].badge}.`
          : `Usage window ${this.WINDOW_SPECS[activeKey].badge}.`,
      );

      this.elements.windowOptions.forEach((option) => {
        const windowKey = option.dataset.windowKey;
        const active = windowKey === activeKey;
        option.classList.toggle("active", active);
        option.classList.remove("unavailable");
        option.setAttribute("aria-current", active ? "true" : "false");
      });
    }

    async loadDashboard({ refreshWindowSelection = true } = {}) {
      const [history, refreshStatus, dashboardWindowKey, developerOptions] =
        await Promise.all([
          CodexUsageHistory.readHistory(),
          CodexUsageHistory.readRefreshStatus(),
          refreshWindowSelection
            ? this.readDashboardWindowKey()
            : Promise.resolve(null),
          this.readDeveloperOptions(),
        ]);
      if (refreshWindowSelection) {
        this.selectedWindowKey = dashboardWindowKey;
      }
      this.currentForcedPaceStateKey = developerOptions.forcedPaceStateKey;
      this.currentManualRefreshLeadWindow =
        developerOptions.manualRefreshLeadWindow;
      this.currentMaxPoolFill = developerOptions.maxPoolFill;
      this.currentResetExhaustedPreview =
        developerOptions.resetExhaustedPreview;
      this.currentSingularityBlackHoleVersion =
        developerOptions.singularityBlackHoleVersion;
      this.currentSprintIntensityPreview =
        developerOptions.sprintIntensityPreview;
      this.currentHistory = history;
      this.currentRefreshStatus = refreshStatus;
      this.renderResetExhaustedPreview();
      this.paceView.renderStateRail();
      this.renderHistory(this.currentHistory, this.currentRefreshStatus);
    }

    async refreshDashboardTimeSensitiveViews() {
      if (!this.currentHistory) {
        await this.loadDashboard();
        return;
      }

      this.renderHistory(this.currentHistory, this.currentRefreshStatus, {
        refreshChart: false,
      });
    }

    refreshThemeSensitiveViews() {
      this.loadDashboard().catch((error) =>
        this.renderHistoryLoadFailure(error),
      );
      this.paceView.renderStateRail();
    }

    toggleUsageWindow() {
      const windowKey = this.elements.windowToggle.dataset.nextWindowKey;
      if (
        !this.USAGE_WINDOWS.isSupportedWindowKey(windowKey) ||
        this.elements.windowToggle.disabled
      ) {
        return false;
      }

      this.selectedWindowKey = windowKey;
      this.storeSessionWindowKey(windowKey);
      this.loadDashboard({ refreshWindowSelection: false }).catch((error) =>
        this.renderHistoryLoadFailure(error),
      );
      return true;
    }

    start() {
      this.bindEvents();
      window.setInterval(() => {
        this.refreshDashboardTimeSensitiveViews().catch((error) =>
          this.renderHistoryLoadFailure(error),
        );
      }, DASHBOARD_STATUS_REFRESH_INTERVAL_MS);
      this.loadDashboard().catch((error) =>
        this.renderHistoryLoadFailure(error),
      );
    }

    manualRefreshLeadWindowMs(windowKey) {
      const leadMinutes =
        this.WINDOW_SPECS[windowKey]?.manualRefreshLeadMinutes;
      return Number.isFinite(leadMinutes) && leadMinutes > 0
        ? leadMinutes * MS_PER_MINUTE
        : null;
    }
  }

  globalThis.PacePetsDashboardApp = PacePetsDashboardApp;
})();

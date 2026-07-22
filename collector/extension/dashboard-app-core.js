(() => {
  "use strict";

  const AUDIO_PRELOAD_FAILURE_WARNING =
    "Could not preload dashboard transition audio.";
  const INITIAL_AUDIO_PREPARATION_FAILURE_WARNING =
    "Could not prepare initial dashboard audio.";
  const INITIAL_AUDIO_RESUME_WAIT_MS = 250;
  const INITIAL_SPECIAL_TRANSITION_AUDIO_TIMELINES = Object.freeze(["bigBang"]);
  const MS_PER_MINUTE = 60 * 1000;
  const PRELOAD_AUDIO_TIMELINES = Object.freeze(["bigBang", "brakeExtreme"]);
  const DASHBOARD_STATE_LOADER = globalThis.PacePetsDashboardStateLoader;
  if (!DASHBOARD_STATE_LOADER) {
    throw new Error(
      "Dashboard state loader must load before dashboard-app-core.js.",
    );
  }

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
      this.WINDOW_SPECS = this.USAGE_WINDOWS.WINDOW_SPECS;
      this.currentHistory = null;
      this.currentHeldZeroStates = {};
      this.currentRefreshStatus = null;
      this.dashboardPresentationAuthoritative = true;
      this.dashboardRefreshGeneration = 0;
      this.dashboardRefreshTimer = null;
      this.dashboardStateMutationInProgress = false;
      this.currentCheckerboardRevealWhiteTransparent = false;
      this.currentBrakeIntensityPreview = null;
      this.currentForcedPaceStateKey = null;
      this.currentManualRefreshLeadWindow = false;
      this.currentMaxPoolFill = false;
      this.currentRailHidden = false;
      this.currentResetExhaustedPreview = false;
      this.currentResetExhaustedSplatActive = false;
      this.currentSplatTimeRemainingPreview = null;
      this.currentSprintIntensityPreview = null;
      this.initialDashboardLoadComplete = true;
      this.initialSpecialTransitionAudioAllowed = true;
      this.initialSpecialTransitionPreparationComplete = true;
      this.resetExhaustedArmAnimationFrame = null;
      this.resetExhaustedPreviewRepeatTimer = null;
      this.resetExhaustedSplatLaunchTimer = null;
      this.resetExhaustedSplatRepeatTimer = null;
      this.resetExhaustedSequenceStartTimer = null;
      this.selectedWindowKey = this.DEFAULT_WINDOW_KEY;
      this.dashboardStateLoader = DASHBOARD_STATE_LOADER.createController({
        applyState: (state) => this.applyDashboardState(state),
        readState: (options) => this.readDashboardState(options),
      });
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
      this.audioControl = this.DASHBOARD_AUDIO_CONTROL.createController({
        appTooltips: this.appTooltips,
        button: this.elements.audioToggle,
        volumeSlider: this.elements.audioVolume,
      });
      this.transitionAudio = this.DASHBOARD_TRANSITION_AUDIO.createController({
        audioManager: this.audioControl.audioManager(),
      });
      this.audioControl.audioManager().addStatusChangeListener?.(() => {
        this.preloadTransitionAudio().catch(() => {
          console.warn(AUDIO_PRELOAD_FAILURE_WARNING);
        });
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
        onMotionPreferenceChanged: () => this.handleMotionPreferenceChanged(),
        refreshThemeSensitiveViews: () => this.refreshThemeSensitiveViews(),
      });
      this.createStatusAndPaceControllers();
    }

    createStatusAndPaceControllers() {
      this.dashboardStatus = this.DASHBOARD_STATUS.createController({
        appTooltips: this.appTooltips,
        completeHistoryPresentation: () => this.completeHistoryPresentation(),
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
        getCurrentCheckerboardRevealWhiteTransparent: () =>
          this.currentCheckerboardRevealWhiteTransparent,
        getCurrentBrakeIntensityPreview: () =>
          this.currentBrakeIntensityPreview,
        getCurrentForcedPaceStateKey: () => this.currentForcedPaceStateKey,
        getCurrentHistory: () => this.currentHistory,
        getCurrentMaxPoolFill: () => this.currentMaxPoolFill,
        getCurrentRailHidden: () => this.currentRailHidden,
        getCurrentRefreshStatus: () => this.currentRefreshStatus,
        getCurrentSplatTimeRemainingPreview: () =>
          this.currentSplatTimeRemainingPreview,
        getCurrentSprintIntensityPreview: () =>
          this.currentSprintIntensityPreview,
        getSelectedWindowKey: () => this.selectedWindowKey,
        motionPreferenceEnabled: () => this.motionPreferenceEnabled(),
        onPaceStateChanged: (details) => this.handlePaceStateChanged?.(details),
        renderHistory: (history, refreshStatus, options) =>
          this.renderHistory(history, refreshStatus, options),
        selectedSupportedWindowKey: () => this.selectedSupportedWindowKey(),
        specialTransitionAudioAllowed: () =>
          this.initialSpecialTransitionAudioAllowed,
        specialTransitionAudioReady: () =>
          this.initialSpecialTransitionPreparationComplete,
        specialTransitionStateReady: () =>
          this.dashboardPresentationAuthoritative &&
          !this.dashboardStateMutationInProgress &&
          !this.dashboardStateLoader.isLoading(),
        specialTransitionUsesStartupAudioOutcome: () =>
          !this.initialDashboardLoadComplete,
        transitionAudio: this.transitionAudio,
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
      return this.USAGE_WINDOWS.normalizeSelectableWindowKey(value);
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

    motionPreferenceEnabled() {
      return this.DASHBOARD_PREFERENCES.motionPreferenceEnabled();
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

      return this.readBadgeWindowKey();
    }

    selectedSupportedWindowKey() {
      if (this.USAGE_WINDOWS.isSelectableWindowKey(this.selectedWindowKey)) {
        return this.selectedWindowKey;
      }

      this.selectedWindowKey = this.DEFAULT_WINDOW_KEY;
      return this.DEFAULT_WINDOW_KEY;
    }

    renderWindowControls(activeKey) {
      const nextKey = this.USAGE_WINDOWS.alternateWindowKey(activeKey);
      const nextSelectable = this.USAGE_WINDOWS.isSelectableWindowKey(nextKey);
      const unavailableReason = nextKey
        ? this.WINDOW_SPECS[nextKey].unavailableReason
        : null;
      this.elements.windowToggle.disabled = false;
      this.elements.windowToggle.dataset.nextWindowKey = nextSelectable
        ? nextKey
        : "";
      this.elements.windowToggle.setAttribute(
        "aria-disabled",
        String(!nextSelectable),
      );
      this.appTooltips.setText(
        this.elements.windowToggle,
        nextSelectable ? "Toggle time window (T)" : unavailableReason || "",
      );
      this.elements.windowToggle.setAttribute(
        "aria-label",
        nextSelectable
          ? `Usage window ${this.WINDOW_SPECS[activeKey].badge}. Switch to ${this.WINDOW_SPECS[nextKey].badge}.`
          : `Usage window ${this.WINDOW_SPECS[activeKey].badge}. ${unavailableReason || "No alternate window available."}`,
      );

      this.elements.windowOptions.forEach((option) => {
        const windowKey = option.dataset.windowKey;
        const active = windowKey === activeKey;
        const selectable = this.USAGE_WINDOWS.isSelectableWindowKey(windowKey);
        option.classList.toggle("active", active);
        option.classList.toggle("unavailable", !selectable);
        option.setAttribute("aria-current", active ? "true" : "false");
        option.setAttribute("aria-disabled", String(!selectable));
      });
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

    handleMotionPreferenceChanged() {
      this.appTooltips.hide();
      this.paceView.stopMotionEffects?.();
      this.clearResetExhaustedSplatTimers?.();
      this.currentResetExhaustedSplatActive = false;
      this.renderResetExhaustedPreview();
      this.refreshDashboardTimeSensitiveViews().catch((error) =>
        this.renderHistoryLoadFailure(error),
      );
    }

    toggleUsageWindow() {
      const windowKey = this.elements.windowToggle.dataset.nextWindowKey;
      if (
        !this.USAGE_WINDOWS.isSelectableWindowKey(windowKey) ||
        this.elements.windowToggle.getAttribute("aria-disabled") === "true"
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

    preloadTransitionAudio(timelineIds = PRELOAD_AUDIO_TIMELINES) {
      return Promise.all(
        timelineIds.map((timelineId) =>
          this.transitionAudio.preloadTimeline(timelineId),
        ),
      );
    }

    async prepareAudioForInitialDashboardRender() {
      const result = await this.audioControl.loadPreference({
        resumeIfNeeded: true,
        resumeWaitMs: INITIAL_AUDIO_RESUME_WAIT_MS,
      });
      if (result.error) {
        throw new Error(INITIAL_AUDIO_PREPARATION_FAILURE_WARNING);
      }
      if (result.status !== this.DASHBOARD_AUDIO_CONTROL.STATUS_READY) {
        return false;
      }

      await this.preloadTransitionAudio(
        INITIAL_SPECIAL_TRANSITION_AUDIO_TIMELINES,
      );
      return true;
    }

    beginInitialSpecialTransitionPreparation() {
      this.initialSpecialTransitionAudioAllowed = false;
      this.initialSpecialTransitionPreparationComplete = false;
      this.initialSpecialTransitionPreparation = Promise.resolve()
        .then(() => this.prepareAudioForInitialDashboardRender())
        .then((audioAllowed) => {
          this.initialSpecialTransitionAudioAllowed = audioAllowed === true;
        })
        .catch(() => {
          console.warn(INITIAL_AUDIO_PREPARATION_FAILURE_WARNING);
        })
        .finally(() => {
          this.initialSpecialTransitionPreparationComplete = true;
          this.paceView.playPendingSpecialTransition?.();
        });
      return this.initialSpecialTransitionPreparation;
    }

    loadInitialDashboard() {
      this.initialDashboardLoadComplete = false;
      this.beginInitialSpecialTransitionPreparation();
      return this.loadDashboard().catch((error) => {
        this.initialDashboardLoadComplete = true;
        throw error;
      });
    }

    start() {
      this.bindEvents();
      this.scheduleNextDashboardRefresh();
      this.loadInitialDashboard().catch((error) =>
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

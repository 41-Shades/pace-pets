(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  if (!DATA) {
    throw new Error(
      "Pace Pets dashboard pace data must load before dashboard-pace-core.js.",
    );
  }
  const PREVIEW_CONTROL = globalThis.PacePetsPreviewControl;
  if (!PREVIEW_CONTROL) {
    throw new Error(
      "Pace Pets preview controls must load before dashboard-pace-core.js.",
    );
  }

  function randomIntegerInRange([min, max]) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  class DashboardPaceController {
    constructor(options) {
      Object.assign(this, options);
      this.paceIconEffectCleanups = new WeakMap();
      this.lastForcedPaceStateKey = null;
      this.perfectZeroEclipseIcon = null;
      this.perfectZeroPageBackgroundScene = null;
      this.singularityTransitionInFlight = false;
      this.singularityTransitionPending = false;
      this.singularityTransitionRunId = 0;
      this.singularityTransitionScene = null;
      this.splatMaxBouncePreviewTimer = null;
      this.syncMonkEscapeEnteredAtMs = null;
      this.syncMonkEscapeLaunchedForEnteredAtMs = null;
      this.syncMonkEscapeLaunchTimer = null;
      this.syncMonkEscapeScene = null;
      this.syncSunburstPageBackgroundScene = null;
      this.syncSunburstPageBackgroundStartedAtMs = null;
      this.syncSunburstPageBackgroundStopTimer = null;
    }

    randomIntegerInRange(range) {
      return randomIntegerInRange(range);
    }

    setPercent(element, bar, value) {
      if (value === null || value === undefined || !Number.isFinite(value)) {
        element.textContent = "--%";
        bar.style.width = "0%";
        return;
      }

      const bounded = Math.max(0, Math.min(100, value));
      element.textContent = `${Math.round(bounded)}%`;
      bar.style.width = `${bounded}%`;
    }

    setPreviewPercentPair(percentPair) {
      if (!percentPair) {
        this.setPercent(
          this.elements.usagePercent,
          this.elements.usageBar,
          null,
        );
        this.setPercent(this.elements.timePercent, this.elements.timeBar, null);
        return;
      }

      this.setPercent(
        this.elements.usagePercent,
        this.elements.usageBar,
        percentPair.remainingPercent,
      );
      this.setPercent(
        this.elements.timePercent,
        this.elements.timeBar,
        percentPair.timePercent,
      );
    }

    selectedSummaryWindowForChartPreview() {
      const latest = CodexUsageHistory.latestSample(this.getCurrentHistory());
      const windows =
        latest?.windows && typeof latest.windows === "object"
          ? latest.windows
          : {};
      return windows[this.selectedSupportedWindowKey()] || null;
    }

    previewWindowForState(stateKey) {
      const windowKey = this.selectedSupportedWindowKey();
      return PREVIEW_CONTROL.forcedPreviewWindowForState(stateKey, {
        durationMinutes: this.windowSpecs[windowKey]?.durationMinutes,
        sprintIntensityPreview: this.getCurrentSprintIntensityPreview?.(),
        windowData: this.selectedSummaryWindowForChartPreview(),
      });
    }

    previewChartPaceRatioForState(stateKey, paceRatio) {
      return stateKey === DATA.PACE_STATES.perfectZero.key ||
        stateKey === DATA.PACE_STATES.singularity.key
        ? PacePetsLogic.PERFECT_PACE_RATIO
        : paceRatio;
    }

    renderPreviewChart(stateKey, paceRatio, previewWindow) {
      if (!previewWindow?.windowData || paceRatio === null) {
        return;
      }

      this.usageChartView.renderPreview({
        atMs: previewWindow.atMs,
        paceRatio: this.previewChartPaceRatioForState(stateKey, paceRatio),
        summaryWindowKey: this.selectedSupportedWindowKey(),
        windowData: previewWindow.windowData,
      });
    }

    forcedPaceRatioForState(stateKey) {
      return PREVIEW_CONTROL.forcedPaceRatioForState(stateKey, {
        sprintIntensityPreview: this.getCurrentSprintIntensityPreview?.(),
      });
    }

    paceStateForClassName(className) {
      return PacePetsLogic.paceStateForClassName(className);
    }

    paceStateForKey(stateKey) {
      return DATA.PACE_STATES[stateKey] || null;
    }

    forcedPaceState() {
      const currentForcedPaceStateKey = this.getCurrentForcedPaceStateKey();
      return currentForcedPaceStateKey
        ? this.paceStateForKey(currentForcedPaceStateKey)
        : null;
    }
  }

  globalThis.PacePetsDashboardPaceController = DashboardPaceController;
})();

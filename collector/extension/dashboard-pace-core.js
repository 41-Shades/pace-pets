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
      this.activePacePreviewKey = null;
      this.pacePreviewRestoreSnapshot = null;
      this.pacePreviewRestoreTimer = null;
      this.paceIconEffectCleanups = new WeakMap();
      this.perfectZeroPageBackgroundScene = null;
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

    previewChartPaceRatioForState(stateKey, paceRatio) {
      return stateKey === DATA.PACE_STATES.perfectZero.key ||
        stateKey === DATA.DASHBOARD_RAIL_STATES.singularity.key
        ? PacePetsLogic.PERFECT_PACE_RATIO
        : paceRatio;
    }

    renderPreviewChart(stateKey, paceRatio, percentPair) {
      if (!percentPair || paceRatio === null) {
        return;
      }

      this.usageChartView.renderPreview({
        paceRatio: this.previewChartPaceRatioForState(stateKey, paceRatio),
        percentPair,
        summaryWindow: this.selectedSummaryWindowForChartPreview(),
        summaryWindowKey: this.selectedSupportedWindowKey(),
      });
    }

    previewPaceRatioForState(stateKey) {
      return PREVIEW_CONTROL.previewPaceRatioForState(stateKey);
    }

    previewStateKeyEnabled(stateKey) {
      return PREVIEW_CONTROL.previewStateKeyEnabled(stateKey);
    }

    forcedPaceRatioForState(stateKey) {
      return PREVIEW_CONTROL.forcedPaceRatioForState(stateKey);
    }

    paceStateForClassName(className) {
      return (
        DATA.DASHBOARD_RAIL_STATES_BY_CLASS[className] ||
        PacePetsLogic.paceStateForClassName(className)
      );
    }

    paceStateForKey(stateKey) {
      return (
        DATA.DASHBOARD_RAIL_STATES[stateKey] ||
        DATA.PACE_STATES[stateKey] ||
        null
      );
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

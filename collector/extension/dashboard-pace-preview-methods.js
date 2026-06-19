(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const DASHBOARD_TIME = globalThis.PacePetsDashboardTime;
  if (!DATA || !Controller || !DASHBOARD_TIME) {
    throw new Error(
      "Pace data, core, and time must load before dashboard-pace-preview-methods.js.",
    );
  }

  Object.assign(Controller.prototype, {
    forcedPaceStatePreview() {
      const state = this.forcedPaceState();
      if (!state) {
        return null;
      }

      const forcedPaceRatio = this.forcedPaceRatioForState(state.key);
      if (forcedPaceRatio === null) {
        return null;
      }
      const previewWindow = this.previewWindowForState(state.key);
      if (!previewWindow) {
        return null;
      }

      return { forcedPaceRatio, previewWindow, state };
    },

    hasForcedPaceStateOverride() {
      return this.forcedPaceStatePreview() !== null;
    },

    forcedPaceRatioLabel(state, forcedPaceRatio) {
      if (
        state.key === DATA.PACE_STATES.wellAhead.key &&
        this.getCurrentSprintIntensityPreview?.()
      ) {
        return `Pace ${PacePetsLogic.formatPaceRatioValue(forcedPaceRatio)}`;
      }

      return state.previewRatioLabel || state.ratioLabel;
    },

    applyPreviewResetTiming(state, previewWindow) {
      const windowKey = this.selectedSupportedWindowKey();
      const spec =
        this.windowSpecs[windowKey] || this.windowSpecs[this.defaultWindowKey];
      DASHBOARD_TIME.setResetParts(
        this.elements,
        previewWindow.windowData,
        spec,
        previewWindow.atMs,
      );
      this.elements.resetsIn.textContent = DASHBOARD_TIME.resetCountdown(
        previewWindow.windowData?.resetsAt,
        previewWindow.atMs,
      );
      const resetBudgetRate = DASHBOARD_TIME.resetBudgetRate(
        previewWindow.windowData,
        previewWindow.atMs,
      );
      this.elements.resetBudgetRateValue.textContent = resetBudgetRate.value;
      this.elements.resetBudgetRateUnit.textContent = resetBudgetRate.unit;
      this.elements.resetBudgetRate.hidden = resetBudgetRate.value === "--";
      this.elements.paceBurnoutIn.textContent =
        DASHBOARD_TIME.paceBurnoutCountdown(
          previewWindow.windowData,
          previewWindow.atMs,
        );

      if (state.key !== DATA.PACE_STATES.singularity.key) {
        return;
      }

      this.elements.resetsIn.textContent =
        DATA.SINGULARITY_RESET_COUNTDOWN_TEXT;
      this.elements.resetBudgetRateValue.textContent = "--";
      this.elements.resetBudgetRateUnit.textContent = "";
      this.elements.resetBudgetRate.hidden = true;
      this.elements.paceBurnoutIn.textContent =
        DATA.SINGULARITY_RESET_COUNTDOWN_TEXT;
      this.elements.resetProgressFill.style.setProperty(
        "--reset-progress",
        "100%",
      );
    },

    renderForcedPaceStateOverride() {
      const preview = this.forcedPaceStatePreview();
      if (!preview) {
        this.lastForcedPaceStateKey = null;
        return false;
      }
      const { forcedPaceRatio, previewWindow, state } = preview;
      const previousState = this.paceStateForClassName(this.currentPaceLevel());
      const forcedPreviewChangeKey = this.forcedPacePreviewChangeKey(state.key);

      const forcedStateChanged =
        this.lastForcedPaceStateKey !== forcedPreviewChangeKey;
      this.lastForcedPaceStateKey = forcedPreviewChangeKey;
      this.setPreviewPercentPair(previewWindow.percentPair);
      this.setPaceLevel(state.className, {
        playSplatFallOnEntry: false,
        replaySplatFall:
          forcedStateChanged && state.key === DATA.PACE_STATES.splat.key,
      });
      this.updateSprintSmokeIntensity?.(forcedPaceRatio);
      this.elements.paceTitle.textContent = state.title;
      this.elements.paceCopy.textContent = state.copy;
      this.elements.paceStats.hidden = false;
      this.elements.paceRatioStat.hidden = false;
      this.elements.paceRatioValue.textContent =
        PacePetsLogic.formatPaceRatioValue(forcedPaceRatio);
      this.renderPreviewChart(state.key, forcedPaceRatio, previewWindow);
      this.applyPreviewResetTiming(state, previewWindow);
      this.renderPaceAltRatio(
        this.forcedPaceRatioLabel(state, forcedPaceRatio),
      );
      this.updateTabTitle(state.title, forcedPaceRatio);
      this.updateSingularityTransitionState?.(previousState, state);
      return true;
    },

    refreshForcedPaceStateOverride() {
      this.renderForcedPaceStateOverride();
    },
  });
})();

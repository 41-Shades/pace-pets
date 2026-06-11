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

      if (state.key !== DATA.PACE_STATES.singularity.key) {
        return;
      }

      this.elements.resetsIn.textContent =
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

      const forcedStateChanged = this.lastForcedPaceStateKey !== state.key;
      this.lastForcedPaceStateKey = state.key;
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
      this.setPreviewPercentPair(previewWindow.percentPair);
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

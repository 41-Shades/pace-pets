(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const DASHBOARD_TIME = globalThis.PacePetsDashboardTime;
  const PREVIEW_ACTION_REGISTRY = globalThis.PacePetsDevPreviewActionRegistry;
  if (!DATA || !Controller || !DASHBOARD_TIME || !PREVIEW_ACTION_REGISTRY) {
    throw new Error(
      "Pace preview dependencies must load before dashboard-pace-preview-methods.js.",
    );
  }

  const PACE_STATE_TRANSITION_PREVIEW =
    PREVIEW_ACTION_REGISTRY.controlForAction(
      PREVIEW_ACTION_REGISTRY.ACTION_KEYS.paceStateTransition,
    );
  const PACE_TRANSITION_PREVIEW_FROM_STATE_KEY = DATA.PACE_STATES.on.key;
  const PACE_TRANSITION_PREVIEW_TO_STATE_KEY =
    DATA.PACE_STATES.criticalBehind.key;
  const PACE_TRANSITION_PREVIEW_HOLD_MS = 420;

  function motionPreferenceEnabled(controller) {
    return controller.motionPreferenceEnabled?.() !== false;
  }

  Object.assign(Controller.prototype, {
    paceStatePreview(state) {
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

    forcedPaceStatePreview() {
      const state = this.forcedPaceState();
      return state ? this.paceStatePreview(state) : null;
    },

    hasForcedPaceStateOverride() {
      return this.forcedPaceStatePreview() !== null;
    },

    forcedPaceRatioLabel(state, forcedPaceRatio) {
      if (
        state.key === DATA.PACE_STATES.criticalBehind.key &&
        this.getCurrentBrakeIntensityPreview?.()
      ) {
        return `Pace ${PacePetsLogic.formatPaceRatioValue(forcedPaceRatio)}`;
      }

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

    renderPaceStatePreview(
      preview,
      {
        playSplatFallOnEntry = false,
        previousState = this.paceStateForClassName(this.currentPaceLevel()),
        replaySplatFall = false,
        transition = true,
      } = {},
    ) {
      const { forcedPaceRatio, previewWindow, state } = preview;
      const renderPreview = () => {
        this.setPreviewPercentPair(previewWindow.percentPair);
        this.setPaceLevel(state.className, {
          playSplatFallOnEntry,
          replaySplatFall,
        });
        this.updateBrakeWobbleIntensity?.(forcedPaceRatio);
        this.updateSprintSmokeIntensity?.(forcedPaceRatio);
        this.elements.paceTitle.textContent = state.title;
        this.elements.paceCopy.textContent = state.copy;
        this.elements.paceStats.hidden = false;
        this.elements.paceRatioStat.hidden = false;
        this.elements.paceRatioValue.textContent =
          this.formatFeaturedPaceRatioValue(state, forcedPaceRatio);
        this.renderPreviewChart(state.key, forcedPaceRatio, previewWindow);
        this.applyPreviewResetTiming(state, previewWindow);
        this.renderPaceAltRatio(
          this.forcedPaceRatioLabel(state, forcedPaceRatio),
        );
        this.updateTabTitle(state.title, forcedPaceRatio);
        this.updateSpecialTransitionState?.(previousState, state);
      };

      if (transition) {
        this.applyPaceStateChange(previousState, state, renderPreview);
        return;
      }

      this.clearPaceStateCardTransition?.();
      this.clearPaceChangePulse?.();
      renderPreview();
    },

    renderForcedPaceStateOverride() {
      const preview = this.forcedPaceStatePreview();
      if (!preview) {
        this.lastForcedPaceStateKey = null;
        return false;
      }
      const { state } = preview;
      const forcedPreviewChangeKey = this.forcedPacePreviewChangeKey(state.key);
      const forcedStateChanged =
        this.lastForcedPaceStateKey !== forcedPreviewChangeKey;
      this.lastForcedPaceStateKey = forcedPreviewChangeKey;
      this.renderPaceStatePreview(preview, {
        replaySplatFall:
          forcedStateChanged && state.key === DATA.PACE_STATES.splat.key,
      });
      return true;
    },

    clearPaceStateTransitionPreview() {
      globalThis.clearTimeout(this.paceStateTransitionPreviewTimer);
      this.paceStateTransitionPreviewTimer = null;
    },

    playPaceStateTransitionPreview() {
      if (globalThis.document?.hidden === true) {
        return {
          ok: false,
          message: "Open the dashboard tab before previewing Pace transition.",
        };
      }
      if (!motionPreferenceEnabled(this)) {
        return {
          ok: false,
          message: "Turn motion on before previewing Pace transition.",
        };
      }

      const fromState = this.paceStateForKey(
        PACE_TRANSITION_PREVIEW_FROM_STATE_KEY,
      );
      const toState = this.paceStateForKey(
        PACE_TRANSITION_PREVIEW_TO_STATE_KEY,
      );
      const fromPreview = fromState ? this.paceStatePreview(fromState) : null;
      const toPreview = toState ? this.paceStatePreview(toState) : null;
      if (!fromPreview || !toPreview) {
        return {
          ok: false,
          message: "Could not build the Pace transition preview.",
        };
      }

      this.stopSpecialTransitions?.();
      this.clearPaceStateTransitionPreview();
      this.renderPaceStatePreview(fromPreview, { transition: false });
      this.paceStateTransitionPreviewTimer = globalThis.setTimeout(() => {
        this.paceStateTransitionPreviewTimer = null;
        this.renderPaceStatePreview(toPreview);
      }, PACE_TRANSITION_PREVIEW_HOLD_MS);
      return { ok: true };
    },

    bindPaceStateTransitionPreviewRequests() {
      if (
        this.paceStateTransitionPreviewRequestsBound ||
        !globalThis.chrome?.runtime?.onMessage
      ) {
        return;
      }

      this.paceStateTransitionPreviewRequestsBound = true;
      globalThis.chrome.runtime.onMessage.addListener(
        (message, _sender, sendResponse) => {
          if (!PACE_STATE_TRANSITION_PREVIEW.isPlayMessage(message)) {
            return false;
          }

          sendResponse?.(this.playPaceStateTransitionPreview());
          return false;
        },
      );
    },

    refreshForcedPaceStateOverride() {
      this.renderForcedPaceStateOverride();
    },
  });
})();

(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-pace-transition-methods.js.",
    );
  }

  const PACE_CHANGE_PULSE_MS = 3400;
  const PACE_STATE_FADE_IN_MS = 260;
  const PACE_STATE_FADE_OUT_MS = 150;
  const PACE_STATE_TRANSITION_CLASSES = Object.freeze([
    "is-pace-state-fading-out",
    "is-pace-state-fading-in",
  ]);
  const PACE_TRANSITION_STATE_KEYS = Object.freeze(
    new Set([...DATA.PACE_LEVEL_LEGEND_STATE_KEYS, DATA.PACE_STATES.sync.key]),
  );

  function motionPreferenceEnabled(controller) {
    return controller.motionPreferenceEnabled?.() !== false;
  }

  function canUseSharedPaceTransition(state) {
    return PACE_TRANSITION_STATE_KEYS.has(state?.key);
  }

  function shouldRunSharedPaceTransition(controller, previousState, state) {
    return (
      previousState.key !== state.key &&
      canUseSharedPaceTransition(previousState) &&
      canUseSharedPaceTransition(state) &&
      motionPreferenceEnabled(controller) &&
      globalThis.document?.hidden !== true
    );
  }

  function paceChangePulseColor(controller, state) {
    const computedColor = globalThis
      .getComputedStyle(controller.elements.paceCard)
      .getPropertyValue("--pace-color");
    const color = computedColor.trim();
    return color || state.badgeColor;
  }

  Object.assign(Controller.prototype, {
    clearPaceStateCardTransition() {
      globalThis.clearTimeout(this.paceStateFadeOutTimer);
      globalThis.clearTimeout(this.paceStateFadeInTimer);
      this.paceStateFadeOutTimer = null;
      this.paceStateFadeInTimer = null;
      this.elements.paceCard.classList.remove(...PACE_STATE_TRANSITION_CLASSES);
    },

    clearPaceChangePulse() {
      globalThis.clearTimeout(this.paceChangePulseTimer);
      this.paceChangePulseTimer = null;
      this.elements.paceChangePulse?.classList.remove("is-active");
      this.elements.paceChangePulse?.style.removeProperty("--pace-change-dot");
    },

    showPaceChangePulse(state) {
      const pulse = this.elements.paceChangePulse;
      if (
        !pulse ||
        !motionPreferenceEnabled(this) ||
        globalThis.document?.hidden === true
      ) {
        return;
      }

      this.clearPaceChangePulse();
      pulse.style.setProperty(
        "--pace-change-dot",
        paceChangePulseColor(this, state),
      );
      pulse.classList.add("is-active");
      this.paceChangePulseTimer = globalThis.setTimeout(() => {
        this.clearPaceChangePulse();
      }, PACE_CHANGE_PULSE_MS);
    },

    applyPaceStateChange(previousState, state, applyState) {
      if (!shouldRunSharedPaceTransition(this, previousState, state)) {
        this.clearPaceStateCardTransition();
        if (previousState.key !== state.key) {
          this.clearPaceChangePulse();
        }
        applyState();
        return;
      }

      this.clearPaceStateCardTransition();
      this.clearPaceChangePulse();
      this.elements.paceCard.classList.add("is-pace-state-fading-out");
      this.paceStateFadeOutTimer = globalThis.setTimeout(() => {
        this.paceStateFadeOutTimer = null;
        this.elements.paceCard.classList.remove("is-pace-state-fading-out");
        applyState();
        this.showPaceChangePulse(state);
        this.elements.paceCard.classList.add("is-pace-state-fading-in");
        this.paceStateFadeInTimer = globalThis.setTimeout(() => {
          this.paceStateFadeInTimer = null;
          this.elements.paceCard.classList.remove("is-pace-state-fading-in");
        }, PACE_STATE_FADE_IN_MS);
      }, PACE_STATE_FADE_OUT_MS);
    },
  });
})();

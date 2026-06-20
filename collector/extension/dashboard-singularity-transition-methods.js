(() => {
  "use strict";

  const BIG_BANG_RENDERER =
    globalThis.PacePetsDashboardBigBangTransitionRenderer;
  const DATA = globalThis.PacePetsDashboardPaceData;
  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  const SINGULARITY_RENDERER =
    globalThis.PacePetsDashboardSingularityTransitionRenderer;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (
    !BIG_BANG_RENDERER ||
    !DATA ||
    !DASHBOARD_PREFERENCES ||
    !SINGULARITY_RENDERER ||
    !Controller
  ) {
    throw new Error(
      "Pace, preferences, and special transition helpers must load before transition methods.",
    );
  }

  const TRANSITION_DEFINITIONS = Object.freeze({
    bigBang: Object.freeze({
      key: "bigBang",
      logName: "Big Bang",
      renderer: BIG_BANG_RENDERER,
      stateKey: DATA.PACE_STATES.bigBang.key,
    }),
    singularity: Object.freeze({
      key: "singularity",
      logName: "Singularity",
      renderer: SINGULARITY_RENDERER,
      stateKey: DATA.PACE_STATES.singularity.key,
    }),
  });

  function motionPreferenceEnabled() {
    return DASHBOARD_PREFERENCES.motionPreferenceEnabled();
  }

  function transitionState(controller, definition) {
    if (!controller.specialTransitions) {
      controller.specialTransitions = {};
    }
    if (!controller.specialTransitions[definition.key]) {
      const legacyPrefix =
        definition.key === TRANSITION_DEFINITIONS.singularity.key
          ? "singularityTransition"
          : "bigBangTransition";
      controller.specialTransitions[definition.key] = {
        inFlight: Boolean(controller[`${legacyPrefix}InFlight`]),
        pending: Boolean(controller[`${legacyPrefix}Pending`]),
        runId: controller[`${legacyPrefix}RunId`] || 0,
        scene: controller[`${legacyPrefix}Scene`] || null,
      };
    }
    return controller.specialTransitions[definition.key];
  }

  function syncLegacyTransitionState(controller, definition, state) {
    if (definition.key === TRANSITION_DEFINITIONS.bigBang.key) {
      controller.bigBangTransitionInFlight = state.inFlight;
      controller.bigBangTransitionPending = state.pending;
      controller.bigBangTransitionRunId = state.runId;
      controller.bigBangTransitionScene = state.scene;
      return;
    }

    if (definition.key !== TRANSITION_DEFINITIONS.singularity.key) {
      return;
    }

    controller.singularityTransitionInFlight = state.inFlight;
    controller.singularityTransitionPending = state.pending;
    controller.singularityTransitionRunId = state.runId;
    controller.singularityTransitionScene = state.scene;
  }

  function isTransitionState(definition, state) {
    return state?.key === definition.stateKey;
  }

  function hasOtherTransitionInFlight(controller, definition) {
    return Object.values(TRANSITION_DEFINITIONS).some((otherDefinition) => {
      if (otherDefinition.key === definition.key) {
        return false;
      }

      return transitionState(controller, otherDefinition).inFlight;
    });
  }

  function stopTransition(controller, definition) {
    const state = transitionState(controller, definition);
    state.runId += 1;
    state.scene?.stop();
    state.scene = null;
    state.inFlight = false;
    state.pending = false;
    syncLegacyTransitionState(controller, definition, state);
  }

  function updateTransitionState(controller, definition, previousState, state) {
    const transition = transitionState(controller, definition);
    if (!isTransitionState(definition, state)) {
      if (transition.inFlight) {
        // Let terminal reveals expose the latest dashboard DOM state.
        transition.pending = false;
        syncLegacyTransitionState(controller, definition, transition);
        return;
      }

      stopTransition(controller, definition);
      return;
    }

    if (isTransitionState(definition, previousState) || transition.inFlight) {
      return;
    }

    if (hasOtherTransitionInFlight(controller, definition)) {
      transition.pending = false;
      syncLegacyTransitionState(controller, definition, transition);
      return;
    }

    if (document.hidden) {
      transition.pending = true;
      syncLegacyTransitionState(controller, definition, transition);
      return;
    }

    playTransition(controller, definition).catch((error) => {
      console.warn(`Pace Pets ${definition.logName} transition failed:`, error);
    });
  }

  function playPendingTransition(controller, definition) {
    const transition = transitionState(controller, definition);
    if (
      document.hidden ||
      !transition.pending ||
      transition.inFlight ||
      !isTransitionState(
        definition,
        controller.paceStateForClassName(controller.currentPaceLevel()),
      )
    ) {
      return;
    }

    transition.pending = false;
    syncLegacyTransitionState(controller, definition, transition);
    playTransition(controller, definition).catch((error) => {
      console.warn(`Pace Pets ${definition.logName} transition failed:`, error);
    });
  }

  async function playTransition(controller, definition) {
    const transition = transitionState(controller, definition);
    const runId = transition.runId + 1;
    transition.runId = runId;
    transition.inFlight = true;
    transition.pending = false;

    const scene = definition.renderer.create({
      motionDisabled: !motionPreferenceEnabled(),
    });
    transition.scene = scene;
    syncLegacyTransitionState(controller, definition, transition);
    await scene.play();

    if (transition.runId === runId) {
      transition.scene = null;
      transition.inFlight = false;
      syncLegacyTransitionState(controller, definition, transition);
    }
  }

  Object.assign(Controller.prototype, {
    stopSpecialTransitions() {
      for (const definition of Object.values(TRANSITION_DEFINITIONS)) {
        stopTransition(this, definition);
      }
    },

    updateSpecialTransitionState(previousState, state) {
      for (const definition of Object.values(TRANSITION_DEFINITIONS)) {
        updateTransitionState(this, definition, previousState, state);
      }
    },

    playPendingSpecialTransition() {
      for (const definition of Object.values(TRANSITION_DEFINITIONS)) {
        playPendingTransition(this, definition);
      }
    },

    stopSingularityTransition() {
      stopTransition(this, TRANSITION_DEFINITIONS.singularity);
    },

    updateSingularityTransitionState(previousState, state) {
      updateTransitionState(
        this,
        TRANSITION_DEFINITIONS.singularity,
        previousState,
        state,
      );
    },

    playPendingSingularityTransition() {
      playPendingTransition(this, TRANSITION_DEFINITIONS.singularity);
    },

    playSingularityTransition() {
      return playTransition(this, TRANSITION_DEFINITIONS.singularity);
    },
  });
})();

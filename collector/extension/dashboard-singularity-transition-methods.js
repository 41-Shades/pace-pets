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
      audioTimeline: "bigBang",
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
        audio: null,
        runId: controller[`${legacyPrefix}RunId`] || 0,
        scene: controller[`${legacyPrefix}Scene`] || null,
      };
    }
    if (!("audio" in controller.specialTransitions[definition.key])) {
      controller.specialTransitions[definition.key].audio = null;
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

  function currentPaceState(controller) {
    return controller.paceStateForClassName(controller.currentPaceLevel());
  }

  function restoreBigBangPageBackground(controller, details = {}) {
    const { revealDurationMs } = details || {};
    if (
      !isTransitionState(
        TRANSITION_DEFINITIONS.bigBang,
        currentPaceState(controller),
      )
    ) {
      return;
    }

    controller.setPerfectZeroPageBackgroundActive?.(true, {
      bigBangRevealFadeDurationMs: revealDurationMs,
      featuredIconPlanet: false,
    });
  }

  function transitionRendererOptions(controller, definition) {
    const options = { motionDisabled: !motionPreferenceEnabled() };
    if (definition.key === TRANSITION_DEFINITIONS.singularity.key) {
      return {
        ...options,
        checkerboardRevealWhiteTransparent:
          controller.getCurrentCheckerboardRevealWhiteTransparent?.() === true,
      };
    }

    if (definition.key !== TRANSITION_DEFINITIONS.bigBang.key) {
      return options;
    }

    return {
      ...options,
      onCanvasCoverEnd: (details) =>
        restoreBigBangPageBackground(controller, details),
      onCanvasCoverStart: () =>
        controller.stopPerfectZeroPageBackgroundScene?.(),
    };
  }

  function playTransitionAudio(controller, definition, rendererOptions) {
    if (!definition.audioTimeline || rendererOptions.motionDisabled) {
      return null;
    }

    return controller.transitionAudio?.playTimeline(definition.audioTimeline);
  }

  function stopTransitionAudio(transition, { fadeOutMs = 300 } = {}) {
    transition.audio?.stop?.({ fadeOutMs });
    transition.audio = null;
  }

  function stopTransition(controller, definition) {
    const state = transitionState(controller, definition);
    state.runId += 1;
    stopTransitionAudio(state);
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

    const rendererOptions = transitionRendererOptions(controller, definition);
    const scene = definition.renderer.create(rendererOptions);
    transition.scene = scene;
    transition.audio = playTransitionAudio(
      controller,
      definition,
      rendererOptions,
    );
    syncLegacyTransitionState(controller, definition, transition);
    let completed;
    try {
      completed = await scene.play();
    } catch (error) {
      if (transition.runId === runId) {
        stopTransitionAudio(transition);
      }
      throw error;
    }

    if (transition.runId === runId) {
      if (completed === false) {
        stopTransitionAudio(transition);
      }
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

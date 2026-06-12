(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  const TRANSITION_RENDERER =
    globalThis.PacePetsDashboardSingularityTransitionRenderer;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !DASHBOARD_PREFERENCES || !TRANSITION_RENDERER || !Controller) {
    throw new Error(
      "Pace, preferences, and Singularity transition helpers must load before transition methods.",
    );
  }

  function isSingularityState(state) {
    return state?.key === DATA.PACE_STATES.singularity.key;
  }

  function motionPreferenceEnabled() {
    return DASHBOARD_PREFERENCES.motionPreferenceEnabled();
  }

  Object.assign(Controller.prototype, {
    stopSingularityTransition() {
      this.singularityTransitionRunId =
        (this.singularityTransitionRunId || 0) + 1;
      this.singularityTransitionScene?.stop();
      this.singularityTransitionScene = null;
      this.singularityTransitionInFlight = false;
      this.singularityTransitionPending = false;
    },

    updateSingularityTransitionState(previousState, state) {
      if (!isSingularityState(state)) {
        this.stopSingularityTransition();
        return;
      }

      if (
        isSingularityState(previousState) ||
        this.singularityTransitionInFlight
      ) {
        return;
      }

      if (document.hidden) {
        this.singularityTransitionPending = true;
        return;
      }

      this.playSingularityTransition().catch((error) => {
        console.warn("Pace Pets Singularity transition failed:", error);
      });
    },

    playPendingSingularityTransition() {
      if (
        document.hidden ||
        !this.singularityTransitionPending ||
        this.singularityTransitionInFlight ||
        !isSingularityState(this.paceStateForClassName(this.currentPaceLevel()))
      ) {
        return;
      }

      this.singularityTransitionPending = false;
      this.playSingularityTransition().catch((error) => {
        console.warn("Pace Pets Singularity transition failed:", error);
      });
    },

    async playSingularityTransition() {
      const runId = (this.singularityTransitionRunId || 0) + 1;
      this.singularityTransitionRunId = runId;
      this.singularityTransitionInFlight = true;
      this.singularityTransitionPending = false;

      const motionDisabled = !motionPreferenceEnabled();
      const scene = TRANSITION_RENDERER.create({
        motionDisabled,
      });
      this.singularityTransitionScene = scene;
      await scene.play();

      if (this.singularityTransitionRunId === runId) {
        this.singularityTransitionScene = null;
        this.singularityTransitionInFlight = false;
      }
    },
  });
})();

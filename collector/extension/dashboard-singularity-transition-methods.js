(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const TRANSITION_RENDERER =
    globalThis.PacePetsDashboardSingularityTransitionRenderer;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !TRANSITION_RENDERER || !Controller) {
    throw new Error(
      "Pace and Singularity transition helpers must load before transition methods.",
    );
  }

  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

  function isSingularityState(state) {
    return state?.key === DATA.PACE_STATES.singularity.key;
  }

  function prefersReducedMotion() {
    return window.matchMedia?.(REDUCED_MOTION_QUERY).matches === true;
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

      const reducedMotion = prefersReducedMotion();
      const scene = TRANSITION_RENDERER.create({
        reducedMotion,
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

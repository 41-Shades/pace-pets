(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const TRANSITION_DATA = globalThis.PacePetsDashboardSingularityTransitionData;
  const TRANSITION_VERSIONS =
    globalThis.PacePetsDashboardSingularityTransitionVersions;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !TRANSITION_DATA || !TRANSITION_VERSIONS || !Controller) {
    throw new Error(
      "Pace and Singularity transition helpers must load before transition methods.",
    );
  }

  function isSingularityState(state) {
    return state?.key === DATA.PACE_STATES.singularity.key;
  }

  function prefersReducedMotion() {
    return (
      window.matchMedia?.(TRANSITION_DATA.REDUCED_MOTION_QUERY).matches === true
    );
  }

  function paceIconOrigin(controller) {
    const rect = controller.elements.paceIcon?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
    }

    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
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
      const scene = TRANSITION_VERSIONS.create({
        origin: paceIconOrigin(this),
        reducedMotion,
        version: this.getCurrentSingularityTransitionVersion?.(),
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

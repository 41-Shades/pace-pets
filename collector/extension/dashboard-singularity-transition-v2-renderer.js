(function attachPacePetsDashboardSingularityTransitionV2Renderer(root) {
  "use strict";

  const BLACK_HOLE_SCENE = root.PacePetsDashboardSingularityV2BlackHoleScene;
  if (!BLACK_HOLE_SCENE) {
    throw new Error(
      "Singularity V2 black-hole scene must load before dashboard-singularity-transition-v2-renderer.js.",
    );
  }

  const HOLD_CLASS = "is-singularity-v2-space-hold";
  const REVEAL_CLASS = "is-singularity-v2-space-reveal";
  const ENTRY_EXIT_CLASS = "is-singularity-v2-entry-exit";
  const SPACE_ENTER_CLASS = "is-singularity-v2-space-enter";
  const SPACE_ENTER_VISIBLE_CLASS = "is-singularity-v2-space-enter-visible";
  const HOLD_DURATION_MS = 5000;
  const REVEAL_DURATION_MS = 5000;
  const SPACE_ENTER_DURATION_MS = 1600;

  class SingularityTransitionV2Renderer {
    constructor({ reducedMotion = false } = {}) {
      this.blackHoleScene = null;
      this.done = null;
      this.reducedMotion = reducedMotion;
      this.resolveDone = null;
      this.revealTimer = null;
      this.finishTimer = null;
      this.spaceEnterFrame = null;
      this.spaceEnterTimer = null;
      this.stopped = false;
    }

    play() {
      this.done = new Promise((resolve) => {
        this.resolveDone = resolve;
      });
      document.body.classList.remove(ENTRY_EXIT_CLASS);
      if (this.reducedMotion) {
        this.finish(true);
        return this.done;
      }

      document.body.classList.add(HOLD_CLASS);
      document.body.classList.remove(REVEAL_CLASS, SPACE_ENTER_VISIBLE_CLASS);
      document.body.classList.add(SPACE_ENTER_CLASS);
      this.spaceEnterFrame = root.requestAnimationFrame(() => {
        this.spaceEnterFrame = null;
        document.body.classList.add(SPACE_ENTER_VISIBLE_CLASS);
      });
      this.spaceEnterTimer = root.setTimeout(() => {
        this.spaceEnterTimer = null;
        document.body.classList.remove(
          SPACE_ENTER_CLASS,
          SPACE_ENTER_VISIBLE_CLASS,
        );
      }, SPACE_ENTER_DURATION_MS);
      this.revealTimer = root.setTimeout(
        () => this.startReveal(),
        HOLD_DURATION_MS,
      );
      return this.done;
    }

    startReveal() {
      this.revealTimer = null;
      if (this.stopped) {
        return;
      }

      document.body.classList.remove(HOLD_CLASS);
      document.body.classList.add(REVEAL_CLASS);
      this.finishTimer = root.setTimeout(() => {
        this.finishTimer = null;
        this.startBlackHoleApproach();
      }, REVEAL_DURATION_MS);
    }

    startBlackHoleApproach() {
      if (this.stopped) {
        return;
      }

      document.body.classList.remove(REVEAL_CLASS);
      const scene = BLACK_HOLE_SCENE.create({
        reducedMotion: this.reducedMotion,
      });
      this.blackHoleScene = scene;
      scene
        .play()
        .then((completed) => {
          if (this.stopped) {
            return;
          }

          if (this.blackHoleScene === scene) {
            this.blackHoleScene = null;
          }
          this.finish(completed);
        })
        .catch((error) => {
          console.warn(
            "Pace Pets Singularity V2 black-hole scene failed:",
            error,
          );
          if (this.blackHoleScene === scene) {
            this.blackHoleScene = null;
          }
          this.finish(false);
        });
    }

    stop() {
      this.finish(false);
    }

    finish(completed) {
      root.clearTimeout(this.revealTimer);
      root.clearTimeout(this.finishTimer);
      root.clearTimeout(this.spaceEnterTimer);
      if (this.spaceEnterFrame) {
        root.cancelAnimationFrame(this.spaceEnterFrame);
      }
      this.revealTimer = null;
      this.finishTimer = null;
      this.spaceEnterFrame = null;
      this.spaceEnterTimer = null;
      this.blackHoleScene?.stop();
      this.blackHoleScene = null;
      this.stopped = true;
      document.body.classList.remove(
        ENTRY_EXIT_CLASS,
        HOLD_CLASS,
        REVEAL_CLASS,
        SPACE_ENTER_CLASS,
        SPACE_ENTER_VISIBLE_CLASS,
      );
      this.resolveDone?.(completed);
      this.resolveDone = null;
    }
  }

  function create(options) {
    return new SingularityTransitionV2Renderer(options);
  }

  root.PacePetsDashboardSingularityTransitionV2Renderer = Object.freeze({
    create,
  });
})(globalThis);

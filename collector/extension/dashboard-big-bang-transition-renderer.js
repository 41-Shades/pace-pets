(function attachPacePetsDashboardBigBangTransitionRenderer(root) {
  "use strict";

  const BIG_BANG_SCENE = root.PacePetsDashboardBigBangScene;
  if (!BIG_BANG_SCENE) {
    throw new Error(
      "Big Bang scene must load before dashboard-big-bang-transition-renderer.js.",
    );
  }

  const ACTIVE_CLASS = "is-big-bang-transition";
  const HIDDEN_CLASS = "is-big-bang-chrome-hidden";
  const REVEAL_CLASS = "is-big-bang-dashboard-reveal";

  class BigBangTransitionRenderer {
    constructor({
      motionDisabled = false,
      onCanvasCoverEnd = null,
      onCanvasCoverStart = null,
    } = {}) {
      this.backgroundCovered = false;
      this.backgroundRestored = false;
      this.done = null;
      this.motionDisabled = motionDisabled;
      this.onCanvasCoverEnd = onCanvasCoverEnd;
      this.onCanvasCoverStart = onCanvasCoverStart;
      this.resolveDone = null;
      this.scene = null;
      this.stopped = false;
    }

    play() {
      this.done = new Promise((resolve) => {
        this.resolveDone = resolve;
      });
      if (this.motionDisabled) {
        this.finish(true);
        return this.done;
      }

      document.body.classList.add(ACTIVE_CLASS, HIDDEN_CLASS);
      document.body.classList.remove(REVEAL_CLASS);
      this.coverBackground();
      this.scene = BIG_BANG_SCENE.create({
        onSettled: () => this.startReveal(),
        onSpaceBackgroundRevealStart: (details) =>
          this.restoreBackground(details),
      });
      this.scene
        .play()
        .then((completed) => {
          this.scene = null;
          this.finish(completed);
        })
        .catch((error) => {
          console.warn("Pace Pets Big Bang scene failed:", error);
          this.finish(false);
        });
      return this.done;
    }

    startReveal() {
      if (this.stopped) {
        return;
      }

      this.restoreBackground();
      document.body.classList.remove(HIDDEN_CLASS);
      document.body.classList.add(REVEAL_CLASS);
    }

    coverBackground() {
      this.backgroundCovered = true;
      try {
        this.onCanvasCoverStart?.();
      } catch (error) {
        console.warn("Pace Pets Big Bang background pause failed:", error);
      }
    }

    restoreBackground(details = undefined) {
      if (!this.backgroundCovered || this.backgroundRestored) {
        return;
      }

      this.backgroundRestored = true;
      try {
        this.onCanvasCoverEnd?.(details);
      } catch (error) {
        console.warn("Pace Pets Big Bang background restore failed:", error);
      }
    }

    stop() {
      this.finish(false);
    }

    finish(completed) {
      if (this.stopped) {
        return;
      }

      this.stopped = true;
      this.scene?.stop();
      this.scene = null;
      this.restoreBackground();
      document.body.classList.remove(ACTIVE_CLASS, HIDDEN_CLASS, REVEAL_CLASS);
      this.resolveDone?.(completed);
      this.resolveDone = null;
    }
  }

  function create(options) {
    return new BigBangTransitionRenderer(options);
  }

  root.PacePetsDashboardBigBangTransitionRenderer = Object.freeze({
    create,
  });
})(globalThis);

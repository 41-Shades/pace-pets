(function attachPacePetsDashboardSingularityTransitionRenderer(root) {
  "use strict";

  const BLACK_HOLE_SCENE = root.PacePetsDashboardSingularityBlackHoleV2Scene;
  const CHROME_COLLAPSE_SCENE =
    root.PacePetsDashboardSingularityChromeCollapseScene;
  if (!BLACK_HOLE_SCENE || !CHROME_COLLAPSE_SCENE) {
    throw new Error(
      "Singularity scenes must load before dashboard-singularity-transition-renderer.js.",
    );
  }

  const HIDDEN_CLASS = "is-singularity-space-hidden";
  const REVEAL_CLASS = "is-singularity-space-reveal";
  const ENTRY_EXIT_CLASS = "is-singularity-entry-exit";
  const JITTER_CLASS = "is-singularity-chrome-jitter";
  const FINAL_REVEAL_CLASS = "is-singularity-final-reveal";
  const SPACE_ENTER_CLASS = "is-singularity-space-enter";
  const SPACE_ENTER_VISIBLE_CLASS = "is-singularity-space-enter-visible";
  const JITTER_DURATION_PROPERTY = "--singularity-chrome-jitter-duration";
  const SPACE_ENTER_DURATION_MS = 2000;
  const REVEAL_DURATION_MS = 6000;
  const BLACK_HOLE_APPROACH_DURATION_MS = 7600;
  const GLINT_SUCTION_PROGRESS = 0.72;
  const CHROME_COLLAPSE_DELAY_MS = Math.round(
    BLACK_HOLE_APPROACH_DURATION_MS * GLINT_SUCTION_PROGRESS,
  );
  const FINAL_REVEAL_DELAY_MS = Math.round(
    BLACK_HOLE_APPROACH_DURATION_MS * 3.98,
  );
  const FINAL_REVEAL_DURATION_MS = 6000;

  class SingularityTransitionRenderer {
    constructor({ motionDisabled = false } = {}) {
      this.blackHoleApproachCompleted = null;
      this.blackHoleScene = null;
      this.chromeCollapseCompleted = null;
      this.chromeCollapseScene = null;
      this.chromeCollapseTimer = null;
      this.done = null;
      this.finalRevealStarted = false;
      this.finalRevealTimer = null;
      this.motionDisabled = motionDisabled;
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
      if (this.motionDisabled) {
        this.finish(true);
        return this.done;
      }

      document.body.classList.add(HIDDEN_CLASS);
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
        SPACE_ENTER_DURATION_MS,
      );
      return this.done;
    }

    startReveal() {
      this.revealTimer = null;
      if (this.stopped) {
        return;
      }

      document.body.classList.remove(HIDDEN_CLASS);
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
      document.body.style.setProperty(
        JITTER_DURATION_PROPERTY,
        `${CHROME_COLLAPSE_DELAY_MS}ms`,
      );
      document.body.classList.add(JITTER_CLASS);
      const scene = BLACK_HOLE_SCENE.create({
        motionDisabled: this.motionDisabled,
      });
      this.blackHoleScene = scene;
      this.chromeCollapseTimer = root.setTimeout(() => {
        this.chromeCollapseTimer = null;
        this.startChromeCollapse();
      }, CHROME_COLLAPSE_DELAY_MS);
      this.finalRevealTimer = root.setTimeout(() => {
        this.finalRevealTimer = null;
        this.startFinalReveal();
      }, FINAL_REVEAL_DELAY_MS);
      scene
        .play()
        .then((completed) => {
          if (this.stopped || this.finalRevealStarted) {
            return;
          }

          this.blackHoleApproachCompleted = completed;
          if (!completed || this.chromeCollapseCompleted === false) {
            this.finish(false);
          }
        })
        .catch((error) => {
          console.warn("Pace Pets Singularity black-hole scene failed:", error);
          this.finish(false);
        });
    }

    startChromeCollapse() {
      if (this.stopped || this.chromeCollapseScene) {
        return;
      }

      document.body.classList.remove(JITTER_CLASS);
      const scene = CHROME_COLLAPSE_SCENE.create({
        motionDisabled: this.motionDisabled,
      });
      this.chromeCollapseScene = scene;
      scene
        .play()
        .then((completed) => {
          this.chromeCollapseCompleted = completed;
          if (this.stopped || this.finalRevealStarted) {
            return;
          }

          if (!completed || this.blackHoleApproachCompleted === false) {
            this.finish(false);
          }
        })
        .catch((error) => {
          console.warn("Pace Pets Singularity chrome collapse failed:", error);
          this.finish(false);
        });
    }

    startFinalReveal() {
      if (this.stopped || this.finalRevealStarted) {
        return;
      }

      this.finalRevealStarted = true;
      document.body.classList.add(FINAL_REVEAL_CLASS);
      this.blackHoleScene?.stop();
      this.blackHoleScene = null;
      this.chromeCollapseScene?.stop();
      this.chromeCollapseScene = null;
      document.body.classList.remove(JITTER_CLASS, REVEAL_CLASS);
      document.body.style.removeProperty(JITTER_DURATION_PROPERTY);
      this.finishTimer = root.setTimeout(() => {
        this.finishTimer = null;
        this.finish(true);
      }, FINAL_REVEAL_DURATION_MS);
    }

    stop() {
      this.finish(false);
    }

    finish(completed) {
      root.clearTimeout(this.revealTimer);
      root.clearTimeout(this.finishTimer);
      root.clearTimeout(this.spaceEnterTimer);
      root.clearTimeout(this.chromeCollapseTimer);
      root.clearTimeout(this.finalRevealTimer);
      if (this.spaceEnterFrame) {
        root.cancelAnimationFrame(this.spaceEnterFrame);
      }
      this.revealTimer = null;
      this.finishTimer = null;
      this.chromeCollapseTimer = null;
      this.finalRevealTimer = null;
      this.blackHoleApproachCompleted = null;
      this.chromeCollapseCompleted = null;
      this.spaceEnterFrame = null;
      this.spaceEnterTimer = null;
      this.blackHoleScene?.stop();
      this.blackHoleScene = null;
      this.chromeCollapseScene?.stop();
      this.chromeCollapseScene = null;
      this.stopped = true;
      document.body.classList.remove(
        ENTRY_EXIT_CLASS,
        FINAL_REVEAL_CLASS,
        HIDDEN_CLASS,
        JITTER_CLASS,
        REVEAL_CLASS,
        SPACE_ENTER_CLASS,
        SPACE_ENTER_VISIBLE_CLASS,
      );
      document.body.style.removeProperty(JITTER_DURATION_PROPERTY);
      this.resolveDone?.(completed);
      this.resolveDone = null;
    }
  }

  function create(options) {
    return new SingularityTransitionRenderer(options);
  }

  root.PacePetsDashboardSingularityTransitionRenderer = Object.freeze({
    create,
  });
})(globalThis);

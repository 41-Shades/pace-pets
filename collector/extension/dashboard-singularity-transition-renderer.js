(function attachPacePetsDashboardSingularityTransitionRenderer(root) {
  "use strict";

  const BLACK_HOLE_V1_SCENE = root.PacePetsDashboardSingularityBlackHoleV1Scene;
  const BLACK_HOLE_V2_SCENE = root.PacePetsDashboardSingularityBlackHoleV2Scene;
  const CHROME_COLLAPSE_SCENE =
    root.PacePetsDashboardSingularityChromeCollapseScene;
  if (!BLACK_HOLE_V1_SCENE || !BLACK_HOLE_V2_SCENE || !CHROME_COLLAPSE_SCENE) {
    throw new Error(
      "Singularity scenes must load before dashboard-singularity-transition-renderer.js.",
    );
  }

  const BLACK_HOLE_SCENES = Object.freeze({
    v1: BLACK_HOLE_V1_SCENE,
    v2: BLACK_HOLE_V2_SCENE,
  });
  const DEFAULT_BLACK_HOLE_VERSION = "v1";
  const HIDDEN_CLASS = "is-singularity-space-hidden";
  const REVEAL_CLASS = "is-singularity-space-reveal";
  const ENTRY_EXIT_CLASS = "is-singularity-entry-exit";
  const SPACE_ENTER_CLASS = "is-singularity-space-enter";
  const SPACE_ENTER_VISIBLE_CLASS = "is-singularity-space-enter-visible";
  const SPACE_ENTER_DURATION_MS = 2000;
  const REVEAL_DURATION_MS = 6000;
  const BLACK_HOLE_APPROACH_DURATION_MS = 7600;
  const GLINT_SUCTION_PROGRESS = 0.72;
  const CHROME_COLLAPSE_DELAY_MS = Math.round(
    BLACK_HOLE_APPROACH_DURATION_MS * GLINT_SUCTION_PROGRESS,
  );

  class SingularityTransitionRenderer {
    constructor({ blackHoleVersion, reducedMotion = false } = {}) {
      this.blackHoleVersion = BLACK_HOLE_SCENES[blackHoleVersion]
        ? blackHoleVersion
        : DEFAULT_BLACK_HOLE_VERSION;
      this.blackHoleScene = null;
      this.chromeCollapseScene = null;
      this.chromeCollapseTimer = null;
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
      const sceneFactory = BLACK_HOLE_SCENES[this.blackHoleVersion];
      const scene = sceneFactory.create({
        reducedMotion: this.reducedMotion,
      });
      this.blackHoleScene = scene;
      this.chromeCollapseTimer = root.setTimeout(() => {
        this.chromeCollapseTimer = null;
        this.startChromeCollapse();
      }, CHROME_COLLAPSE_DELAY_MS);
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
            `Pace Pets Singularity black-hole ${this.blackHoleVersion} scene failed:`,
            error,
          );
          if (this.blackHoleScene === scene) {
            this.blackHoleScene = null;
          }
          this.finish(false);
        });
    }

    startChromeCollapse() {
      if (this.stopped || this.chromeCollapseScene) {
        return;
      }

      const scene = CHROME_COLLAPSE_SCENE.create({
        blackHoleVersion: this.blackHoleVersion,
        reducedMotion: this.reducedMotion,
      });
      this.chromeCollapseScene = scene;
      scene.play().catch((error) => {
        console.warn("Pace Pets Singularity chrome collapse failed:", error);
      });
    }

    stop() {
      this.finish(false);
    }

    finish(completed) {
      root.clearTimeout(this.revealTimer);
      root.clearTimeout(this.finishTimer);
      root.clearTimeout(this.spaceEnterTimer);
      root.clearTimeout(this.chromeCollapseTimer);
      if (this.spaceEnterFrame) {
        root.cancelAnimationFrame(this.spaceEnterFrame);
      }
      this.revealTimer = null;
      this.finishTimer = null;
      this.chromeCollapseTimer = null;
      this.spaceEnterFrame = null;
      this.spaceEnterTimer = null;
      this.blackHoleScene?.stop();
      this.blackHoleScene = null;
      this.chromeCollapseScene?.stop();
      this.chromeCollapseScene = null;
      this.stopped = true;
      document.body.classList.remove(
        ENTRY_EXIT_CLASS,
        HIDDEN_CLASS,
        REVEAL_CLASS,
        SPACE_ENTER_CLASS,
        SPACE_ENTER_VISIBLE_CLASS,
      );
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

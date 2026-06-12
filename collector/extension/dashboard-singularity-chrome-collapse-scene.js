(function attachPacePetsDashboardSingularityChromeCollapseScene(root) {
  "use strict";

  const FRAGMENTS = root.PacePetsDashboardSingularityChromeCollapseFragments;
  const MOTION = root.PacePetsDashboardSingularityChromeCollapseMotion;
  if (!FRAGMENTS || !MOTION) {
    throw new Error(
      "Singularity chrome collapse helpers must load before chrome collapse scene.",
    );
  }

  const BODY_PRESSURE_CLASS = "is-singularity-chrome-pressure";
  const BODY_COLLAPSE_CLASS = "is-singularity-chrome-collapse";

  class ChromeCollapseScene {
    constructor({ reducedMotion = false } = {}) {
      this.animations = [];
      this.done = null;
      this.splitContainers = [];
      this.isDisposed = false;
      this.reducedMotion = reducedMotion;
      this.resolveDone = null;
    }

    play() {
      this.done = new Promise((resolve) => {
        this.resolveDone = resolve;
      });
      if (this.reducedMotion) {
        this.resolve(true);
        return this.done;
      }

      this.splitContainers = FRAGMENTS.collectSplitContainers();
      if (this.splitContainers.length === 0) {
        this.resolve(true);
        return this.done;
      }

      document.body.classList.add(BODY_PRESSURE_CLASS);
      this.startCollapse();
      return this.done;
    }

    startCollapse() {
      if (this.isDisposed) {
        return;
      }

      document.body.classList.add(BODY_COLLAPSE_CLASS);
      const { animations } = MOTION.startContainerPullAnimations(
        this.splitContainers,
      );
      this.animations.push(...animations);
      Promise.all(
        animations.map((animation) =>
          animation.finished.then(
            () => true,
            () => false,
          ),
        ),
      ).then((results) => {
        if (!this.isDisposed) {
          this.resolve(results.every(Boolean));
        }
      });
    }

    resolve(completed) {
      this.resolveDone?.(completed);
      this.resolveDone = null;
    }

    stop() {
      this.isDisposed = true;
      for (const animation of this.animations) {
        animation.cancel();
      }
      this.animations = [];
      this.splitContainers = [];
      document.body.classList.remove(BODY_PRESSURE_CLASS, BODY_COLLAPSE_CLASS);
      this.resolve(false);
    }
  }

  function create(options) {
    return new ChromeCollapseScene(options);
  }

  root.PacePetsDashboardSingularityChromeCollapseScene = Object.freeze({
    create,
  });
})(globalThis);

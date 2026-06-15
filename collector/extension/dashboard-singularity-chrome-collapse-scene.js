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
  const COLLAPSE_PIECE_CLASS = "is-singularity-collapse-piece";

  class ChromeCollapseScene {
    constructor({ motionDisabled = false } = {}) {
      this.animations = [];
      this.claimedElements = [];
      this.done = null;
      this.splitContainers = [];
      this.isDisposed = false;
      this.motionDisabled = motionDisabled;
      this.resolveDone = null;
      this.runSeed = Math.random();
    }

    play() {
      this.done = new Promise((resolve) => {
        this.resolveDone = resolve;
      });
      if (this.motionDisabled) {
        this.resolve(true);
        return this.done;
      }

      this.splitContainers = FRAGMENTS.collectSplitContainers({
        runSeed: this.runSeed,
      });
      if (this.splitContainers.length === 0) {
        this.resolve(true);
        return this.done;
      }

      this.claimCollapsePieces();
      document.body.classList.add(BODY_PRESSURE_CLASS);
      this.startCollapse();
      return this.done;
    }

    claimCollapsePieces() {
      this.claimedElements = [];
      this.splitContainers.forEach((container) => {
        this.claimElement(container.element);
        (container.innerFragments ?? []).forEach((fragment) => {
          this.claimElement(fragment.element);
        });
      });
    }

    claimElement(element) {
      element.classList.add(COLLAPSE_PIECE_CLASS);
      this.claimedElements.push(element);
    }

    startCollapse() {
      if (this.isDisposed) {
        return;
      }

      document.body.classList.add(BODY_COLLAPSE_CLASS);
      const { animations } = MOTION.startContainerPullAnimations(
        this.splitContainers,
        { runSeed: this.runSeed },
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
      for (const element of this.claimedElements) {
        element.classList.remove(COLLAPSE_PIECE_CLASS);
      }
      this.claimedElements = [];
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

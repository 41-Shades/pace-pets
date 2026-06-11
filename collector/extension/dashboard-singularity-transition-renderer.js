(function attachPacePetsDashboardSingularityTransitionRenderer(root) {
  "use strict";

  const DATA = root.PacePetsDashboardSingularityTransitionData;
  const DRAW = root.PacePetsDashboardSingularityTransitionDraw;
  const MOTION = root.PacePetsDashboardSingularityTransitionMotion;
  if (!DATA || !DRAW || !MOTION) {
    throw new Error(
      "Singularity transition data, draw, and motion must load before renderer.",
    );
  }

  function timelineStarts() {
    const gravityEnd = DATA.TIMELINE.gravityMs;
    const intakeEnd = gravityEnd + DATA.TIMELINE.intakeMs;
    const tunnelEnd = intakeEnd + DATA.TIMELINE.tunnelMs;
    const holdEnd = tunnelEnd + DATA.TIMELINE.holdMs;
    const bangEnd = holdEnd + DATA.TIMELINE.bangMs;
    return { bangEnd, gravityEnd, holdEnd, intakeEnd, tunnelEnd };
  }

  function canvasSize() {
    return {
      height: Math.max(1, root.innerHeight || 1),
      width: Math.max(1, root.innerWidth || 1),
    };
  }

  function configureCanvas(canvas, context) {
    const size = canvasSize();
    const pixelRatio = Math.max(
      1,
      Math.min(root.devicePixelRatio || 1, DATA.MAX_PIXEL_RATIO),
    );
    const pixelWidth = Math.round(size.width * pixelRatio);
    const pixelHeight = Math.round(size.height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return size;
  }

  function createOverlayCanvas() {
    const canvas = document.createElement("canvas");
    canvas.className = "singularity-transition-overlay";
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("role", "presentation");
    return canvas;
  }

  class SingularityTransitionRenderer {
    constructor({ origin, reducedMotion = false }) {
      this.animationFrameId = null;
      this.bangParticles = [];
      this.center = origin || {
        x: root.innerWidth / 2,
        y: root.innerHeight / 2,
      };
      this.context = null;
      this.done = null;
      this.overlay = null;
      this.reducedMotion = reducedMotion;
      this.resolveDone = null;
      this.size = canvasSize();
      this.starts = timelineStarts();
      this.startedAtMs = 0;
      this.stopped = false;
      this.streaks = [];
      this.tiles = [];
      this.renderFrame = this.renderFrame.bind(this);
    }

    async play() {
      this.done = new Promise((resolve) => {
        this.resolveDone = resolve;
      });
      if (this.stopped) {
        this.finish(false);
        return this.done;
      }

      this.mount();
      this.startedAtMs = root.performance.now();
      this.animationFrameId = root.requestAnimationFrame(this.renderFrame);
      return this.done;
    }

    mount() {
      this.overlay = createOverlayCanvas();
      this.context = this.overlay.getContext("2d");
      if (!this.context) {
        this.finish(false);
        return;
      }

      document.body.append(this.overlay);
      document.body.classList.add(DATA.BODY_CLASS);
      this.size = configureCanvas(this.overlay, this.context);
      this.center = {
        x: MOTION.clamp(this.center.x, 0, this.size.width),
        y: MOTION.clamp(this.center.y, 0, this.size.height),
      };
      this.tiles = MOTION.createTiles(
        this.size.width,
        this.size.height,
        this.center,
      );
      this.streaks = MOTION.createStreaks(
        this.size.width,
        this.size.height,
        this.center,
      );
      this.bangParticles = MOTION.createBangParticles(this.center);
    }

    renderFrame(frameTimeMs) {
      this.animationFrameId = null;
      if (this.stopped || !this.context || !this.overlay) {
        this.finish(false);
        return;
      }

      this.size = configureCanvas(this.overlay, this.context);
      const elapsedMs = frameTimeMs - this.startedAtMs;
      DRAW.drawFrame(this, elapsedMs);
      if (this.stopped) {
        return;
      }

      if (elapsedMs >= DATA.TOTAL_DURATION_MS) {
        this.finish(true);
        return;
      }

      this.animationFrameId = root.requestAnimationFrame(this.renderFrame);
    }

    stop() {
      this.finish(false);
    }

    finish(completed) {
      if (this.animationFrameId !== null) {
        root.cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.stopped = true;
      this.overlay?.remove();
      document.body.classList.remove(DATA.BODY_CLASS);
      this.context = null;
      this.overlay = null;
      this.tiles = [];
      this.streaks = [];
      this.bangParticles = [];
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

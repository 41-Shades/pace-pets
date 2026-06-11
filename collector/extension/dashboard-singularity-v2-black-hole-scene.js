(function attachPacePetsDashboardSingularityV2BlackHoleScene(root) {
  "use strict";

  const DRAW = root.PacePetsDashboardSingularityV2BlackHoleDraw;
  if (!DRAW) {
    throw new Error(
      "Singularity V2 black-hole draw helpers must load before dashboard-singularity-v2-black-hole-scene.js.",
    );
  }

  const CANVAS_CLASS = "singularity-v2-black-hole-scene";
  const MAX_PIXEL_RATIO = 2;

  function viewportSize() {
    const rootElement = document.documentElement;
    return {
      height: Math.max(1, root.innerHeight || rootElement.clientHeight || 1),
      width: Math.max(1, root.innerWidth || rootElement.clientWidth || 1),
    };
  }

  function configureCanvas(canvas, context) {
    const { width, height } = viewportSize();
    const pixelRatio = Math.max(
      1,
      Math.min(root.devicePixelRatio || 1, MAX_PIXEL_RATIO),
    );
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return { height, width };
  }

  class BlackHoleScene {
    constructor({ reducedMotion = false } = {}) {
      this.canvas = null;
      this.context = null;
      this.done = null;
      this.frameId = null;
      this.isFinished = false;
      this.reducedMotion = reducedMotion;
      this.resolveDone = null;
      this.size = { height: 1, width: 1 };
      this.startedAtMs = null;
      this.state = DRAW.createState();
      this.handleResize = this.handleResize.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      this.renderFrame = this.renderFrame.bind(this);
    }

    play() {
      this.done = new Promise((resolve) => {
        this.resolveDone = resolve;
      });
      if (this.reducedMotion || !this.mount()) {
        this.finish(true);
        return this.done;
      }

      root.addEventListener("resize", this.handleResize);
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      this.startedAtMs = root.performance?.now?.() ?? Date.now();
      this.requestFrame();
      return this.done;
    }

    mount() {
      this.canvas = document.createElement("canvas");
      this.canvas.className = CANVAS_CLASS;
      this.canvas.setAttribute("aria-hidden", "true");
      this.context = this.canvas.getContext("2d");
      if (!this.context) {
        this.canvas = null;
        return false;
      }

      const mountPoint = document.querySelector(".shell") || document.body;
      mountPoint.append(this.canvas);
      this.size = configureCanvas(this.canvas, this.context);
      return true;
    }

    requestFrame() {
      if (this.isFinished || this.frameId !== null || document.hidden) {
        return;
      }

      this.frameId = root.requestAnimationFrame(this.renderFrame);
    }

    renderFrame(frameTimeMs) {
      this.frameId = null;
      if (this.isFinished) {
        return;
      }

      this.size = configureCanvas(this.canvas, this.context);
      const elapsedMs = Math.max(0, frameTimeMs - this.startedAtMs);
      DRAW.drawFrame(this.context, this.state, this.size, elapsedMs);
      if (elapsedMs >= DRAW.totalDurationMs) {
        this.finish(true);
        return;
      }

      this.requestFrame();
    }

    handleResize() {
      if (this.isFinished || !this.canvas || !this.context) {
        return;
      }

      this.size = configureCanvas(this.canvas, this.context);
    }

    handleVisibilityChange() {
      if (this.frameId !== null) {
        root.cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      this.requestFrame();
    }

    stop() {
      this.finish(false);
    }

    finish(completed) {
      if (this.isFinished) {
        return;
      }

      this.isFinished = true;
      if (this.frameId !== null) {
        root.cancelAnimationFrame(this.frameId);
      }
      this.frameId = null;
      root.removeEventListener("resize", this.handleResize);
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      this.canvas?.remove();
      this.canvas = null;
      this.context = null;
      this.resolveDone?.(completed);
      this.resolveDone = null;
    }
  }

  function create(options) {
    return new BlackHoleScene(options);
  }

  root.PacePetsDashboardSingularityV2BlackHoleScene = Object.freeze({
    create,
  });
})(globalThis);

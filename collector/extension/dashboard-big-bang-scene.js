(function attachPacePetsDashboardBigBangScene(root) {
  "use strict";

  const DRAW = root.PacePetsDashboardBigBangSceneDraw;
  const FACTORY = root.PacePetsDashboardBigBangSceneFactory;
  if (!DRAW || !FACTORY) {
    throw new Error(
      "Big Bang scene helpers must load before dashboard-big-bang-scene.js.",
    );
  }

  const CANVAS_CLASS = "big-bang-transition-scene";
  const MAX_PIXEL_RATIO = 1.4;
  const PRE_BANG_HOLD_MS = 2000;
  const SPACE_REVEAL_AT_MS = 9400;
  const DASHBOARD_REVEAL_AT_MS = 12200;
  const CANVAS_FADE_DURATION_MS = 3200;
  const DASHBOARD_FADE_DURATION_MS = 5200;
  const CANVAS_DONE_AT_MS = SPACE_REVEAL_AT_MS + CANVAS_FADE_DURATION_MS;
  const ANIMATION_TOTAL_DURATION_MS =
    DASHBOARD_REVEAL_AT_MS + DASHBOARD_FADE_DURATION_MS;
  const TOTAL_DURATION_MS = PRE_BANG_HOLD_MS + ANIMATION_TOTAL_DURATION_MS;

  function configureCanvas(canvas, context, currentState, seed) {
    const width = Math.max(1, root.innerWidth || 1);
    const height = Math.max(1, root.innerHeight || 1);
    const pixelRatio = Math.max(
      1,
      Math.min(root.devicePixelRatio || 1, MAX_PIXEL_RATIO),
    );
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    const changed =
      !currentState ||
      currentState.width !== width ||
      currentState.height !== height ||
      canvas.width !== pixelWidth ||
      canvas.height !== pixelHeight;

    if (changed) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return changed
      ? FACTORY.createSceneState(width, height, seed)
      : currentState;
  }

  class BigBangScene {
    constructor({ motionDisabled = false, onSettled = null } = {}) {
      this.animationFrame = null;
      this.canvas = null;
      this.completionTimer = null;
      this.context = null;
      this.done = null;
      this.motionDisabled = motionDisabled;
      this.onSettled = onSettled;
      this.resolveDone = null;
      this.sceneState = null;
      this.seed = Math.floor(Math.random() * 2 ** 32);
      this.dashboardRevealed = false;
      this.startedAtMs = null;
      this.stopped = false;
      this.render = this.render.bind(this);
    }

    play() {
      this.done = new Promise((resolve) => {
        this.resolveDone = resolve;
      });
      if (this.motionDisabled) {
        this.markDashboardRevealed();
        this.finish(true);
        return this.done;
      }

      this.canvas = document.createElement("canvas");
      this.canvas.className = CANVAS_CLASS;
      this.canvas.setAttribute("aria-hidden", "true");
      this.context = this.canvas.getContext("2d", { alpha: false });
      if (!this.context) {
        this.markDashboardRevealed();
        this.finish(false);
        return this.done;
      }

      document.body.append(this.canvas);
      this.sceneState = configureCanvas(
        this.canvas,
        this.context,
        this.sceneState,
        this.seed,
      );
      this.context.fillStyle = "#020617";
      this.context.fillRect(
        0,
        0,
        this.sceneState.width,
        this.sceneState.height,
      );
      this.animationFrame = root.requestAnimationFrame(this.render);
      return this.done;
    }

    markDashboardRevealed() {
      if (this.dashboardRevealed) {
        return;
      }

      this.dashboardRevealed = true;
      this.onSettled?.();
    }

    render(frameTimeMs) {
      this.animationFrame = null;
      if (this.stopped || !this.canvas || !this.context) {
        return;
      }

      if (this.startedAtMs === null) {
        this.startedAtMs = frameTimeMs;
      }
      const totalElapsedMs = Math.min(
        TOTAL_DURATION_MS,
        frameTimeMs - this.startedAtMs,
      );
      this.sceneState = configureCanvas(
        this.canvas,
        this.context,
        this.sceneState,
        this.seed,
      );
      const elapsedMs = totalElapsedMs - PRE_BANG_HOLD_MS;
      if (elapsedMs < 0) {
        this.context.fillStyle = "#020617";
        this.context.fillRect(
          0,
          0,
          this.sceneState.width,
          this.sceneState.height,
        );
        this.animationFrame = root.requestAnimationFrame(this.render);
        return;
      }

      DRAW.drawFrame(this.context, this.sceneState, elapsedMs);

      if (elapsedMs >= SPACE_REVEAL_AT_MS) {
        this.canvas.style.opacity = String(
          1 -
            DRAW.unit(
              (elapsedMs - SPACE_REVEAL_AT_MS) / CANVAS_FADE_DURATION_MS,
            ),
        );
      }
      if (elapsedMs >= DASHBOARD_REVEAL_AT_MS) {
        this.markDashboardRevealed();
      }

      if (elapsedMs >= ANIMATION_TOTAL_DURATION_MS) {
        this.finish(true);
        return;
      }
      if (elapsedMs >= CANVAS_DONE_AT_MS) {
        this.stopCanvas();
        this.scheduleCompletion(elapsedMs);
        return;
      }

      this.animationFrame = root.requestAnimationFrame(this.render);
    }

    scheduleCompletion(elapsedMs) {
      const remainingMs = Math.max(0, ANIMATION_TOTAL_DURATION_MS - elapsedMs);
      this.completionTimer = root.setTimeout(
        () => this.finish(true),
        remainingMs,
      );
    }

    stop() {
      this.finish(false);
    }

    stopCanvas() {
      if (this.animationFrame !== null) {
        root.cancelAnimationFrame(this.animationFrame);
      }
      this.animationFrame = null;
      this.canvas?.remove();
      this.canvas = null;
      this.context = null;
      this.sceneState = null;
    }

    finish(completed) {
      if (this.stopped) {
        return;
      }

      this.stopped = true;
      if (this.completionTimer !== null) {
        root.clearTimeout(this.completionTimer);
      }
      this.completionTimer = null;
      this.stopCanvas();
      this.resolveDone?.(completed);
      this.resolveDone = null;
    }
  }

  function create(options) {
    return new BigBangScene(options);
  }

  root.PacePetsDashboardBigBangScene = Object.freeze({
    create,
    DASHBOARD_REVEAL_AT_MS,
    PRE_BANG_HOLD_MS,
    SPACE_REVEAL_AT_MS,
    TOTAL_DURATION_MS,
  });
})(globalThis);

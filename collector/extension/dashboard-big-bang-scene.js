(function attachPacePetsDashboardBigBangScene(root) {
  "use strict";

  const DRAW = root.PacePetsDashboardBigBangSceneDraw;
  const FACTORY = root.PacePetsDashboardBigBangSceneFactory;
  const WEBGL = root.PacePetsDashboardBigBangWebglRenderer;
  if (!DRAW || !FACTORY || !WEBGL) {
    throw new Error(
      "Big Bang scene helpers must load before dashboard-big-bang-scene.js.",
    );
  }

  const CANVAS_CLASS = "big-bang-transition-scene";
  const WEBGL_CANVAS_CLASS = "big-bang-transition-webgl-scene";
  const MAX_PIXEL_RATIO = 1.4;
  const PRE_BANG_HOLD_MS = 2000;
  const SPACE_REVEAL_AT_MS = 9400;
  const DASHBOARD_REVEAL_AT_MS = 12200;
  const CANVAS_COVER_FADE_AT_MS = 5200;
  const CANVAS_COVER_FADE_DURATION_MS = 2400;
  const CANVAS_FADE_DURATION_MS = 3200;
  const DASHBOARD_FADE_DURATION_MS = 5200;
  const SPACE_BACKGROUND_REVEAL_AT_MS = 2600;
  const SPACE_BACKGROUND_REVEAL_DURATION_MS = CANVAS_FADE_DURATION_MS;
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
    return {
      changed,
      sceneState: changed
        ? FACTORY.createSceneState(width, height, seed)
        : currentState,
    };
  }

  function drawDarkFrame(context, sceneState) {
    context.fillStyle = "#020617";
    context.fillRect(0, 0, sceneState.width, sceneState.height);
  }

  function fadeOutOpacity(elapsedMs, startMs, durationMs) {
    return elapsedMs >= startMs
      ? 1 - DRAW.unit((elapsedMs - startMs) / durationMs)
      : 1;
  }

  class BigBangScene {
    constructor({
      motionDisabled = false,
      onSettled = null,
      onSpaceBackgroundRevealStart = null,
    } = {}) {
      this.animationFrame = null;
      this.canvas = null;
      this.completionTimer = null;
      this.context = null;
      this.done = null;
      this.holdTimer = null;
      this.motionDisabled = motionDisabled;
      this.onSettled = onSettled;
      this.onSpaceBackgroundRevealStart = onSpaceBackgroundRevealStart;
      this.resolveDone = null;
      this.sceneState = null;
      this.seed = Math.floor(Math.random() * 2 ** 32);
      this.dashboardRevealed = false;
      this.spaceBackgroundRevealed = false;
      this.startedAtMs = null;
      this.stopped = false;
      this.webglCanvas = null;
      this.webglRenderer = null;
      this.handleResize = this.handleResize.bind(this);
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
      if (!this.mountWebglCanvas()) {
        this.finish(false);
        return this.done;
      }
      const canvasConfiguration = configureCanvas(
        this.canvas,
        this.context,
        this.sceneState,
        this.seed,
      );
      this.sceneState = canvasConfiguration.sceneState;
      drawDarkFrame(this.context, this.sceneState);
      root.addEventListener("resize", this.handleResize);
      this.animationFrame = root.requestAnimationFrame(this.render);
      return this.done;
    }

    mountWebglCanvas() {
      this.webglCanvas = document.createElement("canvas");
      this.webglCanvas.className = WEBGL_CANVAS_CLASS;
      this.webglCanvas.setAttribute("aria-hidden", "true");
      this.webglRenderer = WEBGL.create({ seed: this.seed });
      if (!this.webglRenderer.mount(this.webglCanvas)) {
        this.webglRenderer.destroy();
        this.webglCanvas = null;
        this.webglRenderer = null;
        return false;
      }

      document.body.append(this.webglCanvas);
      return true;
    }

    markDashboardRevealed() {
      if (this.dashboardRevealed) {
        return;
      }

      this.dashboardRevealed = true;
      this.onSettled?.();
    }

    markSpaceBackgroundRevealed() {
      if (this.spaceBackgroundRevealed) {
        return;
      }

      this.spaceBackgroundRevealed = true;
      this.onSpaceBackgroundRevealStart?.({
        revealDurationMs: SPACE_BACKGROUND_REVEAL_DURATION_MS,
      });
    }

    canRenderFrame() {
      return !this.stopped && Boolean(this.canvas && this.context);
    }

    prepareFrame(frameTimeMs) {
      if (this.startedAtMs === null) {
        this.startedAtMs = frameTimeMs;
      }

      const totalElapsedMs = Math.min(
        TOTAL_DURATION_MS,
        frameTimeMs - this.startedAtMs,
      );
      const canvasConfiguration = configureCanvas(
        this.canvas,
        this.context,
        this.sceneState,
        this.seed,
      );
      this.sceneState = canvasConfiguration.sceneState;

      return {
        canvasChanged: canvasConfiguration.changed,
        elapsedMs: totalElapsedMs - PRE_BANG_HOLD_MS,
      };
    }

    requestNextFrame() {
      this.animationFrame = root.requestAnimationFrame(this.render);
    }

    scheduleBangStart(elapsedMs) {
      if (this.holdTimer !== null) {
        return;
      }

      this.holdTimer = root.setTimeout(
        () => {
          this.holdTimer = null;
          root.removeEventListener("resize", this.handleResize);
          this.requestNextFrame();
        },
        Math.max(0, -elapsedMs),
      );
    }

    handleResize() {
      if (!this.canRenderFrame()) {
        return;
      }

      const canvasConfiguration = configureCanvas(
        this.canvas,
        this.context,
        this.sceneState,
        this.seed,
      );
      this.sceneState = canvasConfiguration.sceneState;
      if (canvasConfiguration.changed) {
        drawDarkFrame(this.context, this.sceneState);
      }
    }

    drawPreBangHold(canvasChanged) {
      if (canvasChanged) {
        drawDarkFrame(this.context, this.sceneState);
      }
    }

    drawActiveFrame(elapsedMs) {
      const coverOpacity = fadeOutOpacity(
        elapsedMs,
        CANVAS_COVER_FADE_AT_MS,
        CANVAS_COVER_FADE_DURATION_MS,
      );
      const transitionOpacity = fadeOutOpacity(
        elapsedMs,
        SPACE_REVEAL_AT_MS,
        CANVAS_FADE_DURATION_MS,
      );
      if (coverOpacity > 0) {
        DRAW.drawFrame(this.context, this.sceneState, elapsedMs);
      }
      this.webglRenderer?.render(elapsedMs, transitionOpacity);

      if (elapsedMs >= CANVAS_COVER_FADE_AT_MS) {
        this.canvas.style.opacity = String(coverOpacity);
      }
    }

    handleRevealMilestones(elapsedMs) {
      if (elapsedMs >= SPACE_BACKGROUND_REVEAL_AT_MS) {
        this.markSpaceBackgroundRevealed();
      }
      if (elapsedMs >= DASHBOARD_REVEAL_AT_MS) {
        this.markDashboardRevealed();
      }
    }

    handleCompletion(elapsedMs) {
      if (elapsedMs >= ANIMATION_TOTAL_DURATION_MS) {
        this.finish(true);
        return true;
      }
      if (elapsedMs >= CANVAS_DONE_AT_MS) {
        this.stopCanvas();
        this.scheduleCompletion(elapsedMs);
        return true;
      }

      return false;
    }

    render(frameTimeMs) {
      this.animationFrame = null;
      if (!this.canRenderFrame()) {
        return;
      }

      const { canvasChanged, elapsedMs } = this.prepareFrame(frameTimeMs);
      if (elapsedMs < 0) {
        this.drawPreBangHold(canvasChanged);
        this.scheduleBangStart(elapsedMs);
        return;
      }

      this.drawActiveFrame(elapsedMs);
      this.handleRevealMilestones(elapsedMs);
      if (!this.handleCompletion(elapsedMs)) {
        this.requestNextFrame();
      }
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
      this.webglRenderer?.destroy();
      this.webglRenderer = null;
      this.webglCanvas?.remove();
      this.webglCanvas = null;
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
      if (this.holdTimer !== null) {
        root.clearTimeout(this.holdTimer);
      }
      this.holdTimer = null;
      root.removeEventListener("resize", this.handleResize);
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

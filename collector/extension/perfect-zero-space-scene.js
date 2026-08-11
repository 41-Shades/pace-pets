(function attachPacePetsPerfectZeroSpace(root) {
  "use strict";

  const DATA = root.PacePetsPerfectZeroSpaceData;
  const BACKDROP = root.PacePetsPerfectZeroSpaceBackdrop;
  const DRAW = root.PacePetsPerfectZeroSpaceDraw;
  const FACTORY = root.PacePetsPerfectZeroSpaceFactory;
  const MOTION = root.PacePetsPerfectZeroSpaceMotion;
  if (!DATA || !BACKDROP || !DRAW || !FACTORY || !MOTION) {
    throw new Error(
      "Perfect-zero scene helpers must load before perfect-zero-space-scene.js.",
    );
  }

  function measuredSceneSize(container, canvas, scene) {
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return {
      height: Math.max(
        1,
        Math.round(
          canvasRect.height || containerRect.height || scene.fallbackSize,
        ),
      ),
      width: Math.max(
        1,
        Math.round(
          canvasRect.width || containerRect.width || scene.fallbackSize,
        ),
      ),
    };
  }

  function configureCanvas(container, canvas, context, currentState, scene) {
    const { width, height } = measuredSceneSize(container, canvas, scene);
    const pixelRatio = Math.max(
      1,
      Math.min(root.devicePixelRatio || 1, scene.maxPixelRatio),
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
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return {
      pixelHeight,
      pixelRatio,
      pixelWidth,
      sceneState: changed
        ? FACTORY.createSceneState(scene, width, height)
        : currentState,
    };
  }

  function motionPreferenceEnabled() {
    return (
      root.PacePetsDashboardPreferences?.motionPreferenceEnabled?.() !== false
    );
  }

  function addMotionPreferenceChangeListener(listener) {
    return (
      root.PacePetsDashboardPreferences?.addMotionPreferenceChangeListener?.(
        listener,
      ) || (() => {})
    );
  }

  class PerfectZeroSceneController {
    constructor({ canvas, container, context, scene }) {
      this.animationFrameId = null;
      this.canvas = canvas;
      this.container = container;
      this.context = context;
      this.canvasState = null;
      this.elapsedMs = 0;
      this.frameWorkspace = DRAW.createWorkspace();
      this.frameOptions = {
        backdropLayer: null,
        pixelRatio: 1,
        previousFrame: null,
        workspace: this.frameWorkspace,
      };
      this.frameState = null;
      this.isStopped = false;
      this.lastFrameAtMs = null;
      this.scene = scene;
      this.sceneState = null;
      this.backdropLayer = null;
      this.handleResize = this.handleResize.bind(this);
      this.handleMotionPreferenceChange =
        this.handleMotionPreferenceChange.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      this.renderFrame = this.renderFrame.bind(this);
      this.removeMotionPreferenceListener = addMotionPreferenceChangeListener(
        this.handleMotionPreferenceChange,
      );
      this.resizeObserver =
        typeof root.ResizeObserver === "function"
          ? new root.ResizeObserver(() => this.handleResize())
          : null;
    }

    drawStaticFrame() {
      if (this.isStopped) {
        return;
      }
      this.configureSceneIfNeeded();
      this.drawCurrentFrame();
    }

    drawCurrentFrame() {
      this.frameOptions.backdropLayer = this.backdropLayer;
      this.frameOptions.pixelRatio = this.canvasState.pixelRatio;
      this.frameOptions.previousFrame = this.frameState;
      this.frameState = DRAW.drawFrame(
        this.context,
        this.scene,
        this.sceneState,
        this.elapsedMs,
        this.frameOptions,
      );
    }

    effectivePixelRatio() {
      return Math.max(
        1,
        Math.min(root.devicePixelRatio || 1, this.scene.maxPixelRatio),
      );
    }

    canvasConfigurationIsCurrent() {
      return (
        this.canvasState &&
        this.canvasState.pixelRatio === this.effectivePixelRatio() &&
        this.canvas.width === this.canvasState.pixelWidth &&
        this.canvas.height === this.canvasState.pixelHeight
      );
    }

    configureSceneIfNeeded() {
      if (this.sceneState && this.canvasConfigurationIsCurrent()) {
        return;
      }

      this.canvasState = configureCanvas(
        this.container,
        this.canvas,
        this.context,
        this.sceneState,
        this.scene,
      );
      this.sceneState = this.canvasState.sceneState;
      this.backdropLayer = BACKDROP.create(
        this.scene,
        this.sceneState,
        this.canvasState.pixelRatio,
      );
      this.frameState = null;
    }

    cancelAnimationFrameIfNeeded() {
      if (this.animationFrameId !== null) {
        root.cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }

    requestNextFrame() {
      if (
        this.isStopped ||
        this.animationFrameId !== null ||
        !motionPreferenceEnabled() ||
        root.document.hidden
      ) {
        return;
      }

      this.animationFrameId = root.requestAnimationFrame(this.renderFrame);
    }

    renderFrame(frameTimeMs) {
      this.animationFrameId = null;
      this.configureSceneIfNeeded();

      const deltaMs =
        this.lastFrameAtMs === null ? 0 : frameTimeMs - this.lastFrameAtMs;
      this.lastFrameAtMs = frameTimeMs;
      this.elapsedMs += Math.max(0, Math.min(deltaMs, 64));
      MOTION.updateSceneState(
        this.scene,
        this.sceneState,
        deltaMs,
        this.elapsedMs,
      );
      this.drawCurrentFrame();
      this.requestNextFrame();
    }

    handleMotionPreferenceChange() {
      this.cancelAnimationFrameIfNeeded();
      this.lastFrameAtMs = null;
      this.drawStaticFrame();
      this.requestNextFrame();
    }

    handleVisibilityChange() {
      this.cancelAnimationFrameIfNeeded();
      this.lastFrameAtMs = null;
      if (root.document.hidden) {
        this.drawStaticFrame();
        return;
      }

      this.requestNextFrame();
    }

    handleResize() {
      if (this.isStopped) {
        return;
      }

      this.sceneState = null;
      this.canvasState = null;
      this.backdropLayer = null;
      this.frameState = null;
      this.drawStaticFrame();
    }

    observeResize() {
      if (this.resizeObserver) {
        this.resizeObserver.observe(this.container);
        return;
      }

      root.addEventListener("resize", this.handleResize);
    }

    start() {
      this.observeResize();
      root.document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      this.drawStaticFrame();
      this.requestNextFrame();
      return this;
    }

    stop() {
      this.isStopped = true;
      this.cancelAnimationFrameIfNeeded();
      this.canvas.width = 0;
      this.canvas.height = 0;
      this.canvasState = null;
      this.sceneState = null;
      this.backdropLayer = null;
      this.frameState = null;
      this.removeMotionPreferenceListener();
      this.resizeObserver?.disconnect();
      root.removeEventListener("resize", this.handleResize);
      root.document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }
  }

  function create(container, canvas, options) {
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    return new PerfectZeroSceneController({
      canvas,
      container,
      context,
      scene: FACTORY.sceneConfigFor(options),
    }).start();
  }

  root.PacePetsPerfectZeroSpace = Object.freeze({
    create,
    profiles: DATA.PROFILE_KEYS,
  });
})(globalThis);

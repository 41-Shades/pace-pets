(function attachPacePetsPerfectZeroSpace(root) {
  "use strict";

  const DATA = root.PacePetsPerfectZeroSpaceData;
  const DRAW = root.PacePetsPerfectZeroSpaceDraw;
  const FACTORY = root.PacePetsPerfectZeroSpaceFactory;
  const MOTION = root.PacePetsPerfectZeroSpaceMotion;
  if (!DATA || !DRAW || !FACTORY || !MOTION) {
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
    return changed
      ? FACTORY.createSceneState(scene, width, height)
      : currentState;
  }

  function addMediaChangeListener(mediaQuery, listener) {
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }

  class PerfectZeroSceneController {
    constructor({ canvas, container, context, scene }) {
      this.animationFrameId = null;
      this.canvas = canvas;
      this.container = container;
      this.context = context;
      this.elapsedMs = 0;
      this.isStopped = false;
      this.lastFrameAtMs = null;
      this.reducedMotionMedia = root.matchMedia(DATA.REDUCED_MOTION_QUERY);
      this.scene = scene;
      this.sceneState = null;
      this.handleMotionPreferenceChange =
        this.handleMotionPreferenceChange.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      this.renderFrame = this.renderFrame.bind(this);
      this.removeMotionPreferenceListener = addMediaChangeListener(
        this.reducedMotionMedia,
        this.handleMotionPreferenceChange,
      );
      this.resizeObserver =
        typeof root.ResizeObserver === "function"
          ? new root.ResizeObserver(() => this.handleResize())
          : null;
    }

    drawStaticFrame() {
      this.sceneState = configureCanvas(
        this.container,
        this.canvas,
        this.context,
        this.sceneState,
        this.scene,
      );
      DRAW.drawFrame(this.context, this.scene, this.sceneState, this.elapsedMs);
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
        this.reducedMotionMedia.matches ||
        root.document.hidden
      ) {
        return;
      }

      this.animationFrameId = root.requestAnimationFrame(this.renderFrame);
    }

    renderFrame(frameTimeMs) {
      this.animationFrameId = null;
      this.sceneState = configureCanvas(
        this.container,
        this.canvas,
        this.context,
        this.sceneState,
        this.scene,
      );

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
      DRAW.drawFrame(this.context, this.scene, this.sceneState, this.elapsedMs);
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
      this.drawStaticFrame();
    }

    observeResize() {
      if (this.resizeObserver) {
        this.resizeObserver.observe(this.container);
        return;
      }

      root.addEventListener("resize", this.handleMotionPreferenceChange);
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
      this.removeMotionPreferenceListener();
      this.resizeObserver?.disconnect();
      root.removeEventListener("resize", this.handleMotionPreferenceChange);
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

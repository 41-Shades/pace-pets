((root) => {
  "use strict";

  const BODY_CLASS = "has-sync-sunburst-page-background";
  const CANVAS_CLASS = "sync-sunburst-page-background";
  const DASHBOARD_PREFERENCES = root.PacePetsDashboardPreferences;
  const DRAW = root.PacePetsDashboardSyncSunburstDraw;
  const RAYS = root.PacePetsDashboardSyncSunburstRays;
  const TURNOVER = root.PacePetsDashboardSyncSunburstTurnover;
  if (!DASHBOARD_PREFERENCES) {
    throw new Error(
      "Pace dashboard preferences must load before dashboard-sync-sunburst-renderer.js.",
    );
  }
  if (!DRAW) {
    throw new Error(
      "Pace sync sunburst draw helpers must load before dashboard-sync-sunburst-renderer.js.",
    );
  }
  if (!RAYS) {
    throw new Error(
      "Pace sync sunburst ray helpers must load before dashboard-sync-sunburst-renderer.js.",
    );
  }
  if (!TURNOVER) {
    throw new Error(
      "Pace sync sunburst turnover helpers must load before dashboard-sync-sunburst-renderer.js.",
    );
  }

  const FINISHED_PROGRESS = 1;
  const GROW_DURATION_MS = 30000;
  const MAX_PIXEL_RATIO = 2;
  const PANEL_BG_END_OPACITY = 0;
  const PANEL_FADE_DELAY = 0.12;
  const PANEL_BG_START_OPACITY = 1;
  const PANEL_SELECTOR = ".usage-panel";
  const RAY_FINAL_OPACITY = 0.64;
  const RAY_TURNOVER_FRAME_DELAY_MS = 33;

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function smooth(value) {
    return value * value * (3 - 2 * value);
  }

  function mix(from, to, amount) {
    return from + (to - from) * amount;
  }

  function visibilityFor(progress) {
    return smooth(clamp(progress / 0.84));
  }

  function panelFadeFor(progress) {
    return smooth(
      clamp((progress - PANEL_FADE_DELAY) / (1 - PANEL_FADE_DELAY)),
    );
  }

  function panelBackgroundOpacity(progress) {
    return mix(
      PANEL_BG_START_OPACITY,
      PANEL_BG_END_OPACITY,
      panelFadeFor(progress),
    );
  }

  function motionPreferenceEnabled() {
    return DASHBOARD_PREFERENCES.motionPreferenceEnabled();
  }

  function viewportSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      height: Math.max(1, Math.round(rect.height || root.innerHeight || 1)),
      width: Math.max(1, Math.round(rect.width || root.innerWidth || 1)),
    };
  }

  function configureCanvas(canvas, context) {
    const size = viewportSize(canvas);
    const pixelRatio = Math.max(
      1,
      Math.min(root.devicePixelRatio || 1, MAX_PIXEL_RATIO),
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

  function sunburstRadius({ width }) {
    const panelRect = root.document
      .querySelector(PANEL_SELECTOR)
      ?.getBoundingClientRect();
    const panelWidth = panelRect?.width || Math.min(width * 0.76, 820);
    const minDiameter = Math.min(600, width * 0.92);
    const maxDiameter = Math.min(1020, width * 1.18);
    return clamp(panelWidth * 1.18, minDiameter, maxDiameter) / 2;
  }

  function finishedAtMsFor(currentFinishedAtMs, isFinishedFrame, timestamp) {
    if (isFinishedFrame && currentFinishedAtMs === null) {
      return timestamp;
    }
    return currentFinishedAtMs;
  }

  function rayLengthMultipliersFor({
    finishedAtMs,
    isFinishedFrame,
    motionEnabled,
    rays,
    timestamp,
  }) {
    if (!isFinishedFrame || !motionEnabled) {
      return null;
    }
    return RAYS.lengthMultipliers(timestamp, rays, finishedAtMs);
  }

  function rayOpacityMultipliersFor({
    activeProgress,
    motionEnabled,
    rayTurnover,
    rays,
    timestamp,
  }) {
    if (activeProgress < 0.5 || !motionEnabled) {
      return null;
    }
    return rayTurnover.opacities(
      timestamp,
      rays,
      RAYS.createReplacement,
      activeProgress,
    );
  }

  class SyncSunburstScene {
    constructor(
      canvas,
      context,
      origin,
      { startedAtMs = null, startComplete = false } = {},
    ) {
      const now = root.performance.now();
      const initialStartTimeMs = startComplete
        ? now - GROW_DURATION_MS
        : startedAtMs;
      const initiallyFinished =
        startComplete ||
        (startedAtMs !== null && now - startedAtMs >= GROW_DURATION_MS);
      this.animationFrameId = null;
      this.canvas = canvas;
      this.context = context;
      this.finished = initiallyFinished;
      this.finishedAtMs = initiallyFinished
        ? initialStartTimeMs + GROW_DURATION_MS
        : null;
      this.origin = origin;
      this.rayTurnover = TURNOVER.create();
      this.rayTurnoverTimerId = null;
      this.rays = RAYS.create();
      this.removeMotionPreferenceListener = () => {};
      this.startTimeMs = initialStartTimeMs;
      this.stopped = false;
      this.handleMotionChange = this.handleMotionChange.bind(this);
      this.handleResize = this.handleResize.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      this.renderFrame = this.renderFrame.bind(this);
    }

    updateOrigin(origin) {
      this.origin = origin;
      this.draw(this.finished ? FINISHED_PROGRESS : null);
    }

    progressAt(timestamp) {
      this.startTimeMs ??= timestamp;
      return !motionPreferenceEnabled()
        ? FINISHED_PROGRESS
        : clamp((timestamp - this.startTimeMs) / GROW_DURATION_MS);
    }

    draw(progress, timestamp = root.performance.now()) {
      const size = configureCanvas(this.canvas, this.context);
      const activeProgress =
        progress === null ? this.progressAt(timestamp) : progress;
      const isFinishedFrame = activeProgress >= FINISHED_PROGRESS;
      const motionEnabled = motionPreferenceEnabled();
      this.finishedAtMs = finishedAtMsFor(
        this.finishedAtMs,
        isFinishedFrame,
        timestamp,
      );
      const uiProgress = panelFadeFor(activeProgress);
      this.context.clearRect(0, 0, size.width, size.height);
      root.document.body.style.setProperty(
        "--sync-sunburst-panel-bg-opacity",
        String(panelBackgroundOpacity(activeProgress)),
      );
      root.document.body.style.setProperty(
        "--sync-sunburst-ui-glow-opacity",
        String(uiProgress),
      );
      const frame = {
        opacity: visibilityFor(activeProgress) * RAY_FINAL_OPACITY,
        origin: this.origin,
        progress: activeProgress,
        radius: sunburstRadius(size),
        rayLengthMultipliers: rayLengthMultipliersFor({
          finishedAtMs: this.finishedAtMs,
          isFinishedFrame,
          motionEnabled,
          rays: this.rays,
          timestamp,
        }),
        rayOpacityMultipliers: rayOpacityMultipliersFor({
          activeProgress,
          motionEnabled,
          rayTurnover: this.rayTurnover,
          rays: this.rays,
          timestamp,
        }),
        timestamp,
      };
      for (const ray of this.rays) {
        DRAW.drawRay(this.context, frame, ray);
      }
      DRAW.drawCore(this.context, frame);
      this.finished = isFinishedFrame;
    }

    renderFrame(timestamp) {
      this.animationFrameId = null;
      if (this.stopped) {
        return;
      }
      const progress = this.finished
        ? FINISHED_PROGRESS
        : this.progressAt(timestamp);
      this.draw(progress, timestamp);
      this.requestFrame();
    }

    requestFrame() {
      if (
        this.stopped ||
        this.animationFrameId !== null ||
        this.rayTurnoverTimerId !== null ||
        root.document.hidden ||
        !motionPreferenceEnabled()
      ) {
        return;
      }
      if (!this.finished) {
        this.animationFrameId = root.requestAnimationFrame(this.renderFrame);
        return;
      }
      this.rayTurnoverTimerId = root.setTimeout(() => {
        this.rayTurnoverTimerId = null;
        this.animationFrameId = root.requestAnimationFrame(this.renderFrame);
      }, RAY_TURNOVER_FRAME_DELAY_MS);
    }

    handleMotionChange() {
      this.draw(motionPreferenceEnabled() ? null : FINISHED_PROGRESS);
      this.requestFrame();
    }

    handleResize() {
      this.draw(this.finished ? FINISHED_PROGRESS : null);
    }

    handleVisibilityChange() {
      if (root.document.hidden) {
        if (this.animationFrameId !== null) {
          root.cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
        root.clearTimeout(this.rayTurnoverTimerId);
        this.rayTurnoverTimerId = null;
        return;
      }
      this.requestFrame();
    }

    start() {
      root.document.body.classList.add(BODY_CLASS);
      root.document.body.prepend(this.canvas);
      const now = root.performance.now();
      this.removeMotionPreferenceListener =
        DASHBOARD_PREFERENCES.addMotionPreferenceChangeListener(
          this.handleMotionChange,
        );
      root.document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      root.addEventListener("resize", this.handleResize);
      this.draw(
        this.finished || !motionPreferenceEnabled()
          ? FINISHED_PROGRESS
          : this.progressAt(now),
        now,
      );
      this.requestFrame();
      return this;
    }

    stop() {
      this.stopped = true;
      if (this.animationFrameId !== null) {
        root.cancelAnimationFrame(this.animationFrameId);
      }
      root.clearTimeout(this.rayTurnoverTimerId);
      this.removeMotionPreferenceListener();
      root.removeEventListener("resize", this.handleResize);
      root.document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      root.document.body.classList.remove(BODY_CLASS);
      root.document.body.style.removeProperty(
        "--sync-sunburst-panel-bg-opacity",
      );
      root.document.body.style.removeProperty(
        "--sync-sunburst-ui-glow-opacity",
      );
      this.canvas.remove();
    }
  }

  function create(origin, options) {
    const canvas = root.document.createElement("canvas");
    canvas.className = CANVAS_CLASS;
    canvas.setAttribute("aria-hidden", "true");
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    return new SyncSunburstScene(canvas, context, origin, options).start();
  }

  root.PacePetsDashboardSyncSunburst = Object.freeze({ create });
})(globalThis);

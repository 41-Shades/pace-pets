((root) => {
  "use strict";

  const BODY_CLASS = "has-sync-sunburst-page-background";
  const CANVAS_CLASS = "sync-sunburst-page-background";
  const CORE_CACHE = root.PacePetsDashboardSyncSunburstCoreCache;
  const DASHBOARD_PREFERENCES = root.PacePetsDashboardPreferences;
  const DRAW = root.PacePetsDashboardSyncSunburstDraw;
  const LAYOUT = root.PacePetsDashboardSyncSunburstLayout;
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
  if (!LAYOUT || !CORE_CACHE) {
    throw new Error(
      "Pace sync sunburst layout and core cache must load before dashboard-sync-sunburst-renderer.js.",
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
  const PANEL_BG_END_OPACITY = 0;
  const PANEL_FADE_DELAY = 0.12;
  const PANEL_BG_START_OPACITY = 1;
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

  function finishedAtMsFor(currentFinishedAtMs, isFinishedFrame, timestamp) {
    if (isFinishedFrame && currentFinishedAtMs === null) {
      return timestamp;
    }
    return currentFinishedAtMs;
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
      this.coreCache = CORE_CACHE.create();
      this.finished = initiallyFinished;
      this.finishedAtMs = initiallyFinished
        ? initialStartTimeMs + GROW_DURATION_MS
        : null;
      this.origin = origin;
      this.layout = LAYOUT.create(canvas, context);
      this.lastPanelBackgroundOpacity = null;
      this.lastUiGlowOpacity = null;
      this.rayTurnover = TURNOVER.create();
      this.rayTurnoverTimerId = null;
      this.rays = RAYS.create();
      this.frame = {
        opacity: 0,
        origin,
        progress: 0,
        radius: 0,
        rayLengthMultiplier: 1,
        rayOpacityMultiplier: 1,
      };
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

    setUiStyle(activeProgress) {
      const panelOpacity = String(panelBackgroundOpacity(activeProgress));
      if (panelOpacity !== this.lastPanelBackgroundOpacity) {
        root.document.body.style.setProperty(
          "--sync-sunburst-panel-bg-opacity",
          panelOpacity,
        );
        this.lastPanelBackgroundOpacity = panelOpacity;
      }
      const glowOpacity = String(panelFadeFor(activeProgress));
      if (glowOpacity !== this.lastUiGlowOpacity) {
        root.document.body.style.setProperty(
          "--sync-sunburst-ui-glow-opacity",
          glowOpacity,
        );
        this.lastUiGlowOpacity = glowOpacity;
      }
    }

    updateFrame(activeProgress, layout) {
      this.frame.opacity = visibilityFor(activeProgress) * RAY_FINAL_OPACITY;
      this.frame.origin = this.origin;
      this.frame.progress = activeProgress;
      this.frame.radius = layout.radius;
      return this.frame;
    }

    drawCore(frame, layout, isFinishedFrame) {
      if (isFinishedFrame && this.coreCache) {
        this.coreCache.draw(this.context, frame, layout.pixelRatio);
        return;
      }
      DRAW.drawCore(this.context, frame);
    }

    draw(progress, timestamp = root.performance.now()) {
      const layout = this.layout.current();
      const activeProgress =
        progress === null ? this.progressAt(timestamp) : progress;
      const isFinishedFrame = activeProgress >= FINISHED_PROGRESS;
      const motionEnabled = motionPreferenceEnabled();
      this.finishedAtMs = finishedAtMsFor(
        this.finishedAtMs,
        isFinishedFrame,
        timestamp,
      );
      this.context.clearRect(0, 0, layout.width, layout.height);
      this.setUiStyle(activeProgress);
      const frame = this.updateFrame(activeProgress, layout);
      const animateRayLengths = isFinishedFrame && motionEnabled;
      const opacityMultipliers =
        activeProgress < 0.5 || !motionEnabled
          ? null
          : this.rayTurnover.opacities(
              timestamp,
              this.rays,
              RAYS.createReplacement,
              activeProgress,
            );
      for (const ray of this.rays) {
        frame.rayLengthMultiplier = animateRayLengths
          ? RAYS.lengthMultiplier(timestamp, ray, this.finishedAtMs)
          : 1;
        frame.rayOpacityMultiplier = opacityMultipliers?.get(ray) ?? 1;
        DRAW.drawRay(this.context, frame, ray);
      }
      this.drawCore(frame, layout, isFinishedFrame);
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
      this.layout.invalidate();
      this.coreCache?.invalidate();
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
      this.coreCache?.clear();
      this.layout.invalidate();
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

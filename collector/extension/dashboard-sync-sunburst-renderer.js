((root) => {
  "use strict";

  const BODY_CLASS = "has-sync-sunburst-page-background";
  const CANVAS_CLASS = "sync-sunburst-page-background";
  const CORE = root.PacePetsDashboardSyncSunburstCore;
  const DASHBOARD_PREFERENCES = root.PacePetsDashboardPreferences;
  const LAYOUT = root.PacePetsDashboardSyncSunburstLayout;
  const RAYS = root.PacePetsDashboardSyncSunburstRays;
  const TURNOVER = root.PacePetsDashboardSyncSunburstTurnover;
  const WEBGL = root.PacePetsDashboardSyncSunburstWebglRenderer;
  if (
    !CORE ||
    !DASHBOARD_PREFERENCES ||
    !LAYOUT ||
    !RAYS ||
    !TURNOVER ||
    !WEBGL
  ) {
    throw new Error(
      "Sync sunburst core, preferences, layout, rays, turnover, and WebGL must load before its scene.",
    );
  }

  const FINISHED_PROGRESS = 1;
  const GROW_DURATION_MS = 30000;
  const PANEL_FADE_DELAY = 0.12;
  const RAY_FINAL_OPACITY = 0.64;
  const SETTLED_FRAME_DELAY_MS = 33;

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function smooth(value) {
    return value * value * (3 - 2 * value);
  }

  function visibilityFor(progress) {
    return smooth(clamp(progress / 0.84));
  }

  function panelFadeFor(progress) {
    return smooth(
      clamp((progress - PANEL_FADE_DELAY) / (1 - PANEL_FADE_DELAY)),
    );
  }

  function motionPreferenceEnabled() {
    return DASHBOARD_PREFERENCES.motionPreferenceEnabled();
  }

  function sameOrigin(first, second) {
    return first?.x === second.x && first?.y === second.y;
  }

  class SyncSunburstScene {
    constructor(canvas, origin, options) {
      const now = root.performance.now();
      const startedAtMs = options.startedAtMs;
      const startComplete = options.startComplete === true;
      const initialStartTimeMs = startComplete
        ? now - GROW_DURATION_MS
        : startedAtMs;
      this.animationFrameId = null;
      this.canvas = canvas;
      this.core = null;
      this.finished =
        startComplete ||
        (startedAtMs !== null && now - startedAtMs >= GROW_DURATION_MS);
      this.finishedAtMs = this.finished
        ? (initialStartTimeMs ?? now) + GROW_DURATION_MS
        : null;
      this.frame = {
        finishedAtMs: this.finishedAtMs,
        opacity: 0,
        progress: 0,
        radius: 0,
        timestamp: now,
      };
      this.lastLayout = null;
      this.lastOrigin = null;
      this.lastPanelOpacity = null;
      this.lastUiGlowOpacity = null;
      this.layout = LAYOUT.create();
      this.origin = origin;
      this.rays = RAYS.create();
      this.removeMotionPreferenceListener = () => {};
      this.startTimeMs = initialStartTimeMs;
      this.stopped = false;
      this.turnover = TURNOVER.create();
      this.turnoverTimerId = null;
      this.webgl = null;
      this.handleContextLost = this.handleContextLost.bind(this);
      this.handleContextRestored = this.handleContextRestored.bind(this);
      this.handleMotionChange = this.handleMotionChange.bind(this);
      this.handleResize = this.handleResize.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      this.renderFrame = this.renderFrame.bind(this);
    }

    progressAt(timestamp) {
      this.startTimeMs ??= timestamp;
      return !motionPreferenceEnabled()
        ? FINISHED_PROGRESS
        : clamp((timestamp - this.startTimeMs) / GROW_DURATION_MS);
    }

    updateOrigin(origin) {
      this.origin = origin;
      this.draw(this.finished ? FINISHED_PROGRESS : null);
    }

    setUiStyle(progress) {
      const panelOpacity = String(1 - panelFadeFor(progress));
      if (panelOpacity !== this.lastPanelOpacity) {
        root.document.body.style.setProperty(
          "--sync-sunburst-panel-bg-opacity",
          panelOpacity,
        );
        this.lastPanelOpacity = panelOpacity;
      }
      const glowOpacity = String(panelFadeFor(progress));
      if (glowOpacity !== this.lastUiGlowOpacity) {
        root.document.body.style.setProperty(
          "--sync-sunburst-ui-glow-opacity",
          glowOpacity,
        );
        this.lastUiGlowOpacity = glowOpacity;
      }
    }

    updateLayout(layout) {
      if (
        layout === this.lastLayout &&
        sameOrigin(this.origin, this.lastOrigin)
      ) {
        return;
      }
      this.webgl.resize(layout, this.origin);
      this.core.resize(this.origin, layout.radius, layout.pixelRatio);
      this.lastLayout = layout;
      this.lastOrigin = { ...this.origin };
    }

    updateFrame(progress, timestamp, layout) {
      if (progress >= FINISHED_PROGRESS && this.finishedAtMs === null) {
        this.finishedAtMs = timestamp;
      }
      this.frame.finishedAtMs = this.finishedAtMs;
      this.frame.opacity = visibilityFor(progress) * RAY_FINAL_OPACITY;
      this.frame.progress = progress;
      this.frame.radius = layout.radius;
      this.frame.timestamp = timestamp;
      return this.frame;
    }

    draw(progress, timestamp = root.performance.now()) {
      if (!this.webgl || this.stopped) {
        return;
      }
      const layout = this.layout.current();
      const activeProgress =
        progress === null ? this.progressAt(timestamp) : progress;
      this.setUiStyle(activeProgress);
      this.updateLayout(layout);
      const raysChanged = this.turnover.update(
        timestamp,
        this.rays,
        RAYS.createReplacement,
        activeProgress,
      );
      if (raysChanged) {
        this.webgl.uploadRays(this.rays, this.turnover);
      }
      this.webgl.render(this.updateFrame(activeProgress, timestamp, layout));
      this.finished = activeProgress >= FINISHED_PROGRESS;
    }

    renderFrame(timestamp) {
      this.animationFrameId = null;
      if (this.stopped) {
        return;
      }
      this.draw(
        this.finished ? FINISHED_PROGRESS : this.progressAt(timestamp),
        timestamp,
      );
      this.requestFrame();
    }

    requestFrame() {
      if (
        this.stopped ||
        this.animationFrameId !== null ||
        this.turnoverTimerId !== null ||
        root.document.hidden ||
        !motionPreferenceEnabled() ||
        !this.webgl
      ) {
        return;
      }
      if (!this.finished) {
        this.animationFrameId = root.requestAnimationFrame(this.renderFrame);
        return;
      }
      this.turnoverTimerId = root.setTimeout(() => {
        this.turnoverTimerId = null;
        this.animationFrameId = root.requestAnimationFrame(this.renderFrame);
      }, SETTLED_FRAME_DELAY_MS);
    }

    cancelFrame() {
      if (this.animationFrameId !== null) {
        root.cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      root.clearTimeout(this.turnoverTimerId);
      this.turnoverTimerId = null;
    }

    setPresentationVisible(visible) {
      this.canvas.hidden = !visible;
      this.core?.setVisible(visible);
      root.document.body.classList.toggle(BODY_CLASS, visible);
    }

    handleContextLost() {
      this.cancelFrame();
      this.setPresentationVisible(false);
    }

    handleContextRestored() {
      if (this.stopped) {
        return;
      }
      this.setPresentationVisible(true);
      this.layout.invalidate();
      this.lastLayout = null;
      this.draw(this.finished ? FINISHED_PROGRESS : null);
      this.requestFrame();
    }

    handleMotionChange() {
      if (!motionPreferenceEnabled()) {
        this.cancelFrame();
        this.core.finish();
      }
      this.draw(motionPreferenceEnabled() ? null : FINISHED_PROGRESS);
      this.requestFrame();
    }

    handleResize() {
      this.layout.invalidate();
      this.lastLayout = null;
      this.draw(this.finished ? FINISHED_PROGRESS : null);
    }

    handleVisibilityChange() {
      if (root.document.hidden) {
        this.cancelFrame();
        return;
      }
      this.requestFrame();
    }

    start() {
      this.webgl = WEBGL.create(this.canvas, {
        onContextLost: this.handleContextLost,
        onContextRestored: this.handleContextRestored,
        onRestoreFailed: () => this.stop(),
      });
      if (!this.webgl) {
        return null;
      }
      this.core = CORE.create(this.startTimeMs, motionPreferenceEnabled());
      if (!this.core) {
        this.webgl.destroy();
        this.webgl = null;
        return null;
      }
      this.setPresentationVisible(true);
      root.document.body.prepend(this.canvas);
      this.removeMotionPreferenceListener =
        DASHBOARD_PREFERENCES.addMotionPreferenceChangeListener(
          this.handleMotionChange,
        );
      root.document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      root.addEventListener("resize", this.handleResize);
      this.webgl.uploadRays(this.rays, this.turnover);
      const now = root.performance.now();
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
      if (this.stopped) {
        return;
      }
      this.stopped = true;
      this.cancelFrame();
      this.removeMotionPreferenceListener();
      root.removeEventListener("resize", this.handleResize);
      root.document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      this.setPresentationVisible(false);
      root.document.body.style.removeProperty(
        "--sync-sunburst-panel-bg-opacity",
      );
      root.document.body.style.removeProperty(
        "--sync-sunburst-ui-glow-opacity",
      );
      this.core?.destroy();
      this.webgl?.destroy();
      this.canvas.remove();
      this.core = null;
      this.webgl = null;
    }
  }

  function create(origin, options = {}) {
    const canvas = root.document.createElement("canvas");
    canvas.className = CANVAS_CLASS;
    canvas.setAttribute("aria-hidden", "true");
    return new SyncSunburstScene(canvas, origin, options).start();
  }

  root.PacePetsDashboardSyncSunburst = Object.freeze({ create });
})(globalThis);

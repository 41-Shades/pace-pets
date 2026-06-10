((root) => {
  "use strict";

  const BODY_CLASS = "has-sync-sunburst-page-background";
  const CANVAS_CLASS = "sync-sunburst-page-background";
  const DRAW = root.PacePetsDashboardSyncSunburstDraw;
  if (!DRAW) {
    throw new Error(
      "Pace sync sunburst draw helpers must load before dashboard-sync-sunburst-renderer.js.",
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
  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  const RAY_COUNT = 42;
  const ACCENT_RAY_COUNT = 18;
  const ACCENT_RAY_FRAME_DELAY_MS = 60;
  const TWO_PI = Math.PI * 2;

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function smooth(value) {
    return value * value * (3 - 2 * value);
  }

  function mix(from, to, amount) {
    return from + (to - from) * amount;
  }

  function noise(index, salt) {
    return (Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453) % 1;
  }

  function positiveNoise(index, salt) {
    return Math.abs(noise(index, salt));
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

  function rayKind(index) {
    return {
      isBroad: index % 6 === 0 || index % 11 === 4,
      isSpike: index % 4 === 1 || index % 9 === 2,
    };
  }

  function rayWidth(index, kind) {
    if (kind.isSpike) {
      return mix(0.015, 0.03, positiveNoise(index, 2));
    }
    if (kind.isBroad) {
      return mix(0.07, 0.12, positiveNoise(index, 3));
    }
    return mix(0.035, 0.072, positiveNoise(index, 4));
  }

  function rayAlpha(index, kind) {
    if (kind.isSpike) {
      return mix(0.38, 0.68, positiveNoise(index, 5));
    }
    return mix(0.2, 0.48, positiveNoise(index, 6));
  }

  function rayDuration(index, kind) {
    if (kind.isSpike) {
      return mix(0.52, 0.82, positiveNoise(index, 9));
    }
    return mix(0.62, 0.98, positiveNoise(index, 10));
  }

  function rayLayer(kind) {
    if (kind.isBroad) {
      return 0;
    }
    return kind.isSpike ? 2 : 1;
  }

  function rayLength(index, kind) {
    if (kind.isSpike) {
      return mix(0.94, 1.08, positiveNoise(index, 12));
    }
    if (kind.isBroad) {
      return mix(0.84, 1.02, positiveNoise(index, 13));
    }
    return mix(0.82, 1.04, positiveNoise(index, 14));
  }

  function rayTone(index) {
    return {
      bodyLightness: mix(62, 76, positiveNoise(index, 16)),
      highlightLightness: mix(88, 98, positiveNoise(index, 17)),
      tipLightness: mix(92, 99, positiveNoise(index, 18)),
    };
  }

  function rayProfile(index) {
    const kind = rayKind(index);
    const tone = rayTone(index);
    return Object.freeze({
      alpha: rayAlpha(index, kind),
      angle:
        (index / RAY_COUNT) * TWO_PI +
        mix(-0.07, 0.07, positiveNoise(index, 1)),
      blur: kind.isBroad ? mix(2, 6, positiveNoise(index, 7)) : 0,
      delay: mix(0, 0.3, positiveNoise(index, 8)),
      duration: rayDuration(index, kind),
      hue: mix(45, 56, positiveNoise(index, 11)),
      ...tone,
      innerWidth: kind.isSpike ? 0.12 : 0.24,
      layer: rayLayer(kind),
      length: rayLength(index, kind),
      saturation: mix(76, 100, positiveNoise(index, 15)),
      width: rayWidth(index, kind),
    });
  }

  const RAYS = Object.freeze(
    Array.from({ length: RAY_COUNT }, (_, index) => rayProfile(index)).sort(
      (first, second) => first.layer - second.layer,
    ),
  );

  function accentRay(index) {
    return Object.freeze({
      alpha: mix(0.52, 0.86, positiveNoise(index, 19)),
      angle: mix(-0.18, 0.64, positiveNoise(index, 20)) * TWO_PI,
      bodyLightness: mix(76, 88, positiveNoise(index, 21)),
      cycleMs: mix(2800, 5200, positiveNoise(index, 22)),
      delay: mix(0, 0.92, positiveNoise(index, 23)),
      duration: mix(0.2, 0.3, positiveNoise(index, 24)),
      hue: mix(45, 55, positiveNoise(index, 25)),
      length: mix(0.42, 1.02, positiveNoise(index, 26)),
      saturation: mix(82, 100, positiveNoise(index, 27)),
      width: mix(0.008, 0.018, positiveNoise(index, 28)),
    });
  }

  const ACCENT_RAYS = Object.freeze(
    Array.from({ length: ACCENT_RAY_COUNT }, (_, index) => accentRay(index)),
  );

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

  class SyncSunburstScene {
    constructor(
      canvas,
      context,
      origin,
      { startedAtMs = null, startComplete = false } = {},
    ) {
      const now = root.performance.now();
      this.animationFrameId = null;
      this.canvas = canvas;
      this.context = context;
      this.finished =
        startComplete ||
        (startedAtMs !== null && now - startedAtMs >= GROW_DURATION_MS);
      this.origin = origin;
      this.reducedMotionMedia = root.matchMedia?.(REDUCED_MOTION_QUERY);
      this.accentRayTimerId = null;
      this.startTimeMs = startComplete ? now - GROW_DURATION_MS : startedAtMs;
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
      return this.reducedMotionMedia?.matches
        ? FINISHED_PROGRESS
        : clamp((timestamp - this.startTimeMs) / GROW_DURATION_MS);
    }

    draw(progress, timestamp = root.performance.now()) {
      const size = configureCanvas(this.canvas, this.context);
      const activeProgress =
        progress === null ? this.progressAt(timestamp) : progress;
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
        timestamp,
      };
      for (const ray of RAYS) {
        DRAW.drawRay(this.context, frame, ray);
      }
      DRAW.drawCore(this.context, frame);
      if (this.finished && !this.reducedMotionMedia?.matches) {
        for (const accentRayFrame of ACCENT_RAYS) {
          DRAW.drawAccentRay(this.context, frame, accentRayFrame);
        }
      }
      this.finished = activeProgress >= FINISHED_PROGRESS;
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
        this.accentRayTimerId !== null ||
        root.document.hidden ||
        this.reducedMotionMedia?.matches
      ) {
        return;
      }
      if (!this.finished) {
        this.animationFrameId = root.requestAnimationFrame(this.renderFrame);
        return;
      }
      this.accentRayTimerId = root.setTimeout(() => {
        this.accentRayTimerId = null;
        this.animationFrameId = root.requestAnimationFrame(this.renderFrame);
      }, ACCENT_RAY_FRAME_DELAY_MS);
    }

    handleMotionChange() {
      this.draw(this.reducedMotionMedia?.matches ? FINISHED_PROGRESS : null);
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
        root.clearTimeout(this.accentRayTimerId);
        this.accentRayTimerId = null;
        return;
      }
      this.requestFrame();
    }

    start() {
      root.document.body.classList.add(BODY_CLASS);
      root.document.body.prepend(this.canvas);
      const now = root.performance.now();
      this.reducedMotionMedia?.addEventListener?.(
        "change",
        this.handleMotionChange,
      );
      root.document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      root.addEventListener("resize", this.handleResize);
      this.draw(
        this.finished || this.reducedMotionMedia?.matches
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
      root.clearTimeout(this.accentRayTimerId);
      this.reducedMotionMedia?.removeEventListener?.(
        "change",
        this.handleMotionChange,
      );
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

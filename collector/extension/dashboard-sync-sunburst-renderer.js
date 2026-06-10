((root) => {
  "use strict";

  const BODY_CLASS = "has-sync-sunburst-page-background";
  const CANVAS_CLASS = "sync-sunburst-page-background";
  const DRAW = root.PacePetsDashboardSyncSunburstDraw;
  const TURNOVER = root.PacePetsDashboardSyncSunburstTurnover;
  if (!DRAW) {
    throw new Error(
      "Pace sync sunburst draw helpers must load before dashboard-sync-sunburst-renderer.js.",
    );
  }
  if (!TURNOVER) {
    throw new Error(
      "Pace sync sunburst turnover helpers must load before dashboard-sync-sunburst-renderer.js.",
    );
  }

  const FINISHED_PROGRESS = 1;
  const GROW_DURATION_MS = 30000;
  const INITIAL_EXTRA_RAY_COUNT = 30;
  const MAX_PIXEL_RATIO = 2;
  const PANEL_BG_END_OPACITY = 0;
  const PANEL_FADE_DELAY = 0.12;
  const PANEL_BG_START_OPACITY = 1;
  const PANEL_SELECTOR = ".usage-panel";
  const RAY_FINAL_OPACITY = 0.64;
  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  const RAY_COUNT = 42;
  const RAY_TURNOVER_FRAME_DELAY_MS = 33;
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

  function randomBetween(from, to) {
    return mix(from, to, Math.random());
  }

  function randomInteger(from, to) {
    return Math.floor(randomBetween(from, to + 1));
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
    const isBroadAnchor = index % 6 === 0 || index % 11 === 4;
    const isSpikeAnchor = index % 4 === 1 || index % 9 === 2;
    const isBroad = isBroadAnchor ? Math.random() > 0.18 : Math.random() > 0.9;
    return {
      isBroad,
      isSpike:
        !isBroad &&
        (isSpikeAnchor ? Math.random() > 0.16 : Math.random() > 0.68),
    };
  }

  function rayWidth(kind) {
    if (kind.isSpike) {
      return randomBetween(0.014, 0.033);
    }
    if (kind.isBroad) {
      return randomBetween(0.062, 0.13);
    }
    return randomBetween(0.032, 0.078);
  }

  function rayAlpha(kind) {
    if (kind.isSpike) {
      return randomBetween(0.34, 0.72);
    }
    return randomBetween(0.18, 0.52);
  }

  function rayDuration(kind) {
    if (kind.isSpike) {
      return randomBetween(0.5, 0.84);
    }
    return randomBetween(0.6, 1);
  }

  function rayLayer(kind) {
    if (kind.isBroad) {
      return 0;
    }
    return kind.isSpike ? 2 : 1;
  }

  function rayLength(kind) {
    if (kind.isSpike) {
      return randomBetween(0.92, 1.1);
    }
    if (kind.isBroad) {
      return randomBetween(0.82, 1.04);
    }
    return randomBetween(0.8, 1.06);
  }

  function rayTone() {
    return {
      bodyLightness: randomBetween(62, 78),
      highlightLightness: randomBetween(88, 99),
      tipLightness: randomBetween(92, 99),
    };
  }

  function rayProfile(index, rayCount, angleOffset) {
    const kind = rayKind(index);
    const tone = rayTone();
    return Object.freeze({
      alpha: rayAlpha(kind),
      angle:
        (index / rayCount) * TWO_PI + angleOffset + randomBetween(-0.08, 0.08),
      blur: kind.isBroad ? randomBetween(2, 6) : 0,
      delay: randomBetween(0, 0.3),
      duration: rayDuration(kind),
      hue: randomBetween(45, 56),
      ...tone,
      innerWidth: kind.isSpike ? 0.12 : 0.24,
      layer: rayLayer(kind),
      length: rayLength(kind),
      saturation: randomBetween(76, 100),
      width: rayWidth(kind),
    });
  }

  function createRays() {
    const rayCount = randomInteger(
      RAY_COUNT - 4 + INITIAL_EXTRA_RAY_COUNT,
      RAY_COUNT + 4 + INITIAL_EXTRA_RAY_COUNT,
    );
    const angleOffset = randomBetween(0, TWO_PI);
    return Array.from({ length: rayCount }, (_, index) =>
      rayProfile(index, rayCount, angleOffset),
    ).sort((first, second) => first.layer - second.layer);
  }

  function createReplacementRay() {
    return rayProfile(
      randomInteger(0, RAY_COUNT - 1),
      RAY_COUNT,
      randomBetween(0, TWO_PI),
    );
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
      this.rayTurnover = TURNOVER.create();
      this.rayTurnoverTimerId = null;
      this.rays = createRays();
      this.reducedMotionMedia = root.matchMedia?.(REDUCED_MOTION_QUERY);
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
      const isFinishedFrame = activeProgress >= FINISHED_PROGRESS;
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
        rayOpacityMultipliers:
          activeProgress >= 0.5 && !this.reducedMotionMedia?.matches
            ? this.rayTurnover.opacities(
                timestamp,
                this.rays,
                createReplacementRay,
                activeProgress,
              )
            : null,
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
        this.reducedMotionMedia?.matches
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
      root.clearTimeout(this.rayTurnoverTimerId);
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

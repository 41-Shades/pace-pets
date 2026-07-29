((root) => {
  "use strict";

  const DRAW = root.PacePetsDashboardSyncSunburstDraw;
  const EDGE_PADDING_PX = 2;
  const FINISHED_PROGRESS = 1;
  if (!DRAW) {
    throw new Error(
      "Pace sync sunburst draw helpers must load before dashboard-sync-sunburst-core-cache.js.",
    );
  }

  function cacheDimensions(radius, pixelRatio) {
    const pixelRadius =
      Math.ceil(radius * DRAW.CORE_FINAL_RADIUS_SCALE * pixelRatio) +
      EDGE_PADDING_PX;
    const pixelSize = pixelRadius * 2;
    return {
      cssSize: pixelSize / pixelRatio,
      pixelSize,
    };
  }

  class SyncSunburstCoreCache {
    constructor(canvas, context) {
      this.canvas = canvas;
      this.context = context;
      this.cssSize = 0;
      this.pixelRatio = 0;
      this.radius = 0;
    }

    invalidate() {
      this.pixelRatio = 0;
      this.radius = 0;
    }

    rebuild(frame, pixelRatio) {
      const { cssSize, pixelSize } = cacheDimensions(frame.radius, pixelRatio);
      this.canvas.width = pixelSize;
      this.canvas.height = pixelSize;
      this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      DRAW.drawCore(this.context, {
        origin: { x: cssSize / 2, y: cssSize / 2 },
        progress: FINISHED_PROGRESS,
        radius: frame.radius,
      });
      this.cssSize = cssSize;
      this.pixelRatio = pixelRatio;
      this.radius = frame.radius;
    }

    draw(targetContext, frame, pixelRatio) {
      if (this.radius !== frame.radius || this.pixelRatio !== pixelRatio) {
        this.rebuild(frame, pixelRatio);
      }
      targetContext.drawImage(
        this.canvas,
        frame.origin.x - this.cssSize / 2,
        frame.origin.y - this.cssSize / 2,
        this.cssSize,
        this.cssSize,
      );
    }

    clear() {
      this.canvas.width = 0;
      this.canvas.height = 0;
      this.invalidate();
    }
  }

  function create() {
    const canvas = root.document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      root.console.warn(
        "Pace sync sunburst core caching is unavailable; drawing the core directly.",
      );
      return null;
    }
    return new SyncSunburstCoreCache(canvas, context);
  }

  root.PacePetsDashboardSyncSunburstCoreCache = Object.freeze({ create });
})(globalThis);

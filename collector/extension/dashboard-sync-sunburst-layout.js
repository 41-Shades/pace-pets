((root) => {
  "use strict";

  const MAX_PIXEL_RATIO = 2;
  const PANEL_SELECTOR = ".usage-panel";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function viewportSignature() {
    const documentRoot = root.document.documentElement;
    return {
      height: Math.max(
        1,
        Math.round(root.innerHeight || documentRoot?.clientHeight || 1),
      ),
      pixelRatio: Math.max(
        1,
        Math.min(root.devicePixelRatio || 1, MAX_PIXEL_RATIO),
      ),
      width: Math.max(
        1,
        Math.round(root.innerWidth || documentRoot?.clientWidth || 1),
      ),
    };
  }

  function sameSignature(first, second) {
    return (
      first?.height === second.height &&
      first?.pixelRatio === second.pixelRatio &&
      first?.width === second.width
    );
  }

  function sunburstRadius(width) {
    const panelRect = root.document
      .querySelector(PANEL_SELECTOR)
      ?.getBoundingClientRect();
    const panelWidth = panelRect?.width || Math.min(width * 0.76, 820);
    const minDiameter = Math.min(600, width * 0.92);
    const maxDiameter = Math.min(1020, width * 1.18);
    return clamp(panelWidth * 1.18, minDiameter, maxDiameter) / 2;
  }

  class SyncSunburstLayout {
    constructor(canvas, context) {
      this.canvas = canvas;
      this.context = context;
      this.snapshot = null;
    }

    invalidate() {
      this.snapshot = null;
    }

    refresh(signature) {
      const rect = this.canvas.getBoundingClientRect();
      const height = Math.max(1, Math.round(rect.height || signature.height));
      const width = Math.max(1, Math.round(rect.width || signature.width));
      const pixelWidth = Math.round(width * signature.pixelRatio);
      const pixelHeight = Math.round(height * signature.pixelRatio);
      if (
        this.canvas.width !== pixelWidth ||
        this.canvas.height !== pixelHeight
      ) {
        this.canvas.width = pixelWidth;
        this.canvas.height = pixelHeight;
      }
      this.context.setTransform(
        signature.pixelRatio,
        0,
        0,
        signature.pixelRatio,
        0,
        0,
      );
      this.snapshot = {
        height,
        pixelRatio: signature.pixelRatio,
        radius: sunburstRadius(width),
        signature,
        width,
      };
      return this.snapshot;
    }

    current() {
      const signature = viewportSignature();
      return sameSignature(this.snapshot?.signature, signature)
        ? this.snapshot
        : this.refresh(signature);
    }
  }

  function create(canvas, context) {
    return new SyncSunburstLayout(canvas, context);
  }

  root.PacePetsDashboardSyncSunburstLayout = Object.freeze({ create });
})(globalThis);

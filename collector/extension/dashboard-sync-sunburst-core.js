((root) => {
  "use strict";

  const CORE_GROW_DURATION_MS = 30000 * 0.74;
  const CORE_OPACITY_DURATION_MS = 30000 * 0.62;
  const EDGE_PADDING_PX = 2;
  const SMOOTH_EASING = "cubic-bezier(0.333333, 0, 0.666667, 1)";
  const LAYER_CONFIGS = Object.freeze([
    Object.freeze({
      className: "sync-sunburst-core-glow",
      radiusScale: 0.42,
      stops: Object.freeze([
        [0, "rgb(255 255 255 / 0.8)"],
        [0.18, "rgb(255 251 178 / 0.72)"],
        [0.46, "rgb(255 219 21 / 0.368)"],
        [1, "rgb(255 242 137 / 0)"],
      ]),
    }),
    Object.freeze({
      className: "sync-sunburst-core-bloom",
      radiusScale: 0.28,
      stops: Object.freeze([
        [0, "rgb(255 255 255 / 0.496)"],
        [0.35, "rgb(255 238 93 / 0.224)"],
        [1, "rgb(255 245 170 / 0)"],
      ]),
    }),
  ]);

  function createLayer(config) {
    const canvas = root.document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    canvas.className = config.className;
    canvas.setAttribute("aria-hidden", "true");
    return { canvas, config, context, rasterSignature: "" };
  }

  function rasterizeLayer(layer, radius, pixelRatio) {
    const gradientRadius = radius * layer.config.radiusScale;
    const pixelRadius =
      Math.ceil(gradientRadius * pixelRatio) + EDGE_PADDING_PX;
    const pixelSize = pixelRadius * 2;
    const cssSize = pixelSize / pixelRatio;
    const signature = `${pixelSize}:${pixelRatio}`;
    if (layer.rasterSignature !== signature) {
      layer.canvas.width = pixelSize;
      layer.canvas.height = pixelSize;
      layer.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const center = cssSize / 2;
      const gradient = layer.context.createRadialGradient(
        center,
        center,
        0,
        center,
        center,
        gradientRadius,
      );
      for (const [offset, color] of layer.config.stops) {
        gradient.addColorStop(offset, color);
      }
      layer.context.fillStyle = gradient;
      layer.context.beginPath();
      layer.context.arc(center, center, gradientRadius, 0, Math.PI * 2);
      layer.context.fill();
      layer.rasterSignature = signature;
    }
    return cssSize;
  }

  function startAnimation(element, keyframes, duration, elapsedMs) {
    const animation = element.animate(keyframes, {
      duration,
      easing: SMOOTH_EASING,
      fill: "both",
    });
    animation.currentTime = Math.min(Math.max(elapsedMs, 0), duration);
    return animation;
  }

  class SyncSunburstCore {
    constructor(layers, startedAtMs, motionEnabled) {
      this.animations = [];
      this.layers = layers;
      [this.glow, this.bloom] = layers.map(({ canvas }) => canvas);
      this.motionEnabled = motionEnabled;
      this.startedAtMs = startedAtMs;
    }

    mount() {
      root.document.body.prepend(...this.layers.map(({ canvas }) => canvas));
      if (!this.motionEnabled) {
        return this;
      }
      const elapsedMs = Math.max(
        0,
        root.performance.now() - (this.startedAtMs ?? root.performance.now()),
      );
      this.animations.push(
        startAnimation(
          this.glow,
          [{ transform: "scale(0.142857)" }, { transform: "scale(1)" }],
          CORE_GROW_DURATION_MS,
          elapsedMs,
        ),
        startAnimation(
          this.bloom,
          [{ transform: "scale(0.214286)" }, { transform: "scale(1)" }],
          CORE_GROW_DURATION_MS,
          elapsedMs,
        ),
        startAnimation(
          this.glow,
          [{ opacity: 0 }, { opacity: 1 }],
          CORE_OPACITY_DURATION_MS,
          elapsedMs,
        ),
        startAnimation(
          this.bloom,
          [{ opacity: 0 }, { opacity: 1 }],
          CORE_OPACITY_DURATION_MS,
          elapsedMs,
        ),
      );
      return this;
    }

    resize(origin, radius, pixelRatio) {
      this.layers.forEach((layer) => {
        const size = rasterizeLayer(layer, radius, pixelRatio);
        layer.canvas.style.height = `${size}px`;
        layer.canvas.style.left = `${origin.x - size / 2}px`;
        layer.canvas.style.top = `${origin.y - size / 2}px`;
        layer.canvas.style.width = `${size}px`;
      });
    }

    setVisible(visible) {
      for (const { canvas } of this.layers) {
        canvas.hidden = !visible;
      }
    }

    finish() {
      for (const animation of this.animations) {
        animation.finish();
      }
    }

    destroy() {
      for (const animation of this.animations) {
        animation.cancel();
      }
      this.animations = [];
      for (const { canvas } of this.layers) {
        canvas.remove();
      }
    }
  }

  function create(startedAtMs, motionEnabled) {
    const layers = LAYER_CONFIGS.map(createLayer);
    if (layers.some((layer) => !layer)) {
      root.console.warn("Pace Pets sync sunburst core canvas unavailable.");
      return null;
    }
    return new SyncSunburstCore(layers, startedAtMs, motionEnabled).mount();
  }

  root.PacePetsDashboardSyncSunburstCore = Object.freeze({ create });
})(globalThis);

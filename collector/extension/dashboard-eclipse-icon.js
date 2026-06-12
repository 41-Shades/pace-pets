(() => {
  "use strict";

  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  if (!DASHBOARD_PREFERENCES) {
    throw new Error(
      "Pace Pets dashboard preferences must load before dashboard-eclipse-icon.js.",
    );
  }

  const CANVAS_CSS_SIZE = 28;
  const MAX_DEVICE_PIXEL_RATIO = 3;
  const MOON_RADIUS = 6.4;
  const OUTER_RADIUS = 13.8;
  const RAY_COUNT = 118;
  const GLINT_COUNT = 3;
  const TWO_PI = Math.PI * 2;

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomInRange(random, min, max) {
    return min + random() * (max - min);
  }

  function pointAt(center, radius, angle) {
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  }

  function createRay(random) {
    const angle = randomInRange(random, 0, TWO_PI);
    const favoredPlume =
      Math.abs(Math.atan2(Math.sin(angle + 2.1), Math.cos(angle + 2.1))) <
        0.52 ||
      Math.abs(Math.atan2(Math.sin(angle - 0.8), Math.cos(angle - 0.8))) < 0.48;
    return {
      angle,
      alpha: randomInRange(random, 0.035, favoredPlume ? 0.16 : 0.1),
      curve: randomInRange(random, -0.9, 0.9),
      length: randomInRange(
        random,
        favoredPlume ? 5.2 : 2.8,
        favoredPlume ? 9 : 6.8,
      ),
      phase: randomInRange(random, 0, TWO_PI),
      speed: randomInRange(random, 0.22, 0.62),
      width: randomInRange(random, 0.28, favoredPlume ? 0.9 : 0.58),
    };
  }

  function createGlint(random) {
    return {
      angle: randomInRange(random, -Math.PI, Math.PI),
      phase: randomInRange(random, 0, TWO_PI),
      speed: randomInRange(random, 0.42, 0.78),
      width: randomInRange(random, 0.45, 0.7),
    };
  }

  function drawEllipseBloom(ctx, center, options) {
    const x = center + Math.cos(options.angle) * options.offset;
    const y = center + Math.sin(options.angle) * options.offset;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(options.angle);
    ctx.scale(options.radiusX, options.radiusY);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${options.alpha})`);
    gradient.addColorStop(0.44, `rgba(255, 255, 255, ${options.alpha * 0.42})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  class EclipseIcon {
    constructor(themeToggle) {
      this.canvas = null;
      this.context = null;
      this.frameId = null;
      this.icon = themeToggle?.querySelector(".theme-toggle-icon") || null;
      this.scheduleFrame = (nowMs) => {
        this.draw(nowMs);
        this.frameId = window.requestAnimationFrame(this.scheduleFrame);
      };
      this.rays = Array.from(
        { length: RAY_COUNT },
        createRay.bind(null, seededRandom(0x41ec1e5e)),
      );
      this.glints = Array.from(
        { length: GLINT_COUNT },
        createGlint.bind(null, seededRandom(0x20260408)),
      );
      this.startedAtMs = 0;
    }

    ensureCanvas() {
      if (!this.icon) {
        return null;
      }

      if (!this.canvas) {
        this.canvas = document.createElement("canvas");
        this.canvas.className = "theme-toggle-eclipse-canvas";
        this.canvas.setAttribute("aria-hidden", "true");
        this.context = this.canvas.getContext("2d");
      }

      if (!this.canvas.isConnected) {
        this.icon.append(this.canvas);
      }

      return this.canvas;
    }

    resizeCanvas() {
      if (!this.canvas) {
        return false;
      }

      const pixelRatio = Math.min(
        MAX_DEVICE_PIXEL_RATIO,
        Math.max(1, window.devicePixelRatio || 1),
      );
      const size = Math.round(CANVAS_CSS_SIZE * pixelRatio);
      if (this.canvas.width === size && this.canvas.height === size) {
        return false;
      }

      this.canvas.width = size;
      this.canvas.height = size;
      return true;
    }

    drawBaseGlow(ctx, center) {
      const gradient = ctx.createRadialGradient(
        center,
        center,
        MOON_RADIUS * 0.65,
        center,
        center,
        OUTER_RADIUS,
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      gradient.addColorStop(0.34, "rgba(255, 255, 255, 0.62)");
      gradient.addColorStop(0.62, "rgba(255, 255, 255, 0.22)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(center, center, OUTER_RADIUS, 0, TWO_PI);
      ctx.fill();
    }

    drawPlumes(ctx, center, timeSeconds) {
      const breath = 0.9 + Math.sin(timeSeconds * 0.55) * 0.08;
      drawEllipseBloom(ctx, center, {
        alpha: 0.72 * breath,
        angle: -1.95,
        offset: 5.2,
        radiusX: 5.4,
        radiusY: 11.6,
      });
      drawEllipseBloom(ctx, center, {
        alpha: 0.58 * breath,
        angle: 0.82,
        offset: 5.8,
        radiusX: 6.8,
        radiusY: 9.8,
      });
      drawEllipseBloom(ctx, center, {
        alpha: 0.28 * breath,
        angle: 2.7,
        offset: 4.5,
        radiusX: 4.6,
        radiusY: 8.6,
      });
      drawEllipseBloom(ctx, center, {
        alpha: 0.22 * breath,
        angle: 1.7,
        offset: 4.2,
        radiusX: 4.4,
        radiusY: 7.4,
      });
    }

    drawRays(ctx, center, timeSeconds) {
      ctx.save();
      ctx.filter = "blur(0.28px)";
      ctx.lineCap = "round";

      this.rays.forEach((ray) => {
        const shimmer =
          0.76 + Math.sin(timeSeconds * ray.speed + ray.phase) * 0.24;
        const start = pointAt(center, MOON_RADIUS * 0.92, ray.angle);
        const end = pointAt(
          center,
          MOON_RADIUS + ray.length * shimmer,
          ray.angle,
        );
        const middle = pointAt(
          center,
          MOON_RADIUS + ray.length * 0.52,
          ray.angle + ray.curve * 0.025,
        );

        ctx.globalAlpha = ray.alpha * shimmer;
        ctx.lineWidth = ray.width;
        ctx.strokeStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(middle.x, middle.y, end.x, end.y);
        ctx.stroke();
      });

      ctx.restore();
      ctx.globalAlpha = 1;
    }

    drawMoon(ctx, center) {
      const gradient = ctx.createRadialGradient(
        center - 1.2,
        center - 1.2,
        0,
        center,
        center,
        MOON_RADIUS,
      );
      gradient.addColorStop(0, "#040712");
      gradient.addColorStop(1, "#01030a");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(center, center, MOON_RADIUS, 0, TWO_PI);
      ctx.fill();
    }

    drawGlints(ctx, center, timeSeconds) {
      ctx.save();
      ctx.lineCap = "round";
      this.glints.forEach((glint) => {
        const pulse = Math.max(
          0,
          Math.sin(timeSeconds * glint.speed + glint.phase) - 0.82,
        );
        if (pulse <= 0) {
          return;
        }

        ctx.globalAlpha = pulse * 0.5;
        ctx.lineWidth = glint.width;
        ctx.strokeStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          center,
          center,
          MOON_RADIUS + 0.25,
          glint.angle - 0.075,
          glint.angle + 0.075,
        );
        ctx.stroke();
      });
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    draw(nowMs) {
      if (!this.canvas || !this.context) {
        return;
      }

      this.resizeCanvas();
      const ctx = this.context;
      const pixelRatio = this.canvas.width / CANVAS_CSS_SIZE;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.clearRect(0, 0, CANVAS_CSS_SIZE, CANVAS_CSS_SIZE);

      const center = CANVAS_CSS_SIZE / 2;
      const timeSeconds = (nowMs - this.startedAtMs) / 1000;
      this.drawBaseGlow(ctx, center);
      this.drawPlumes(ctx, center, timeSeconds);
      this.drawRays(ctx, center, timeSeconds);
      this.drawMoon(ctx, center);
      this.drawGlints(ctx, center, timeSeconds);
    }

    start() {
      if (!DASHBOARD_PREFERENCES.motionPreferenceEnabled()) {
        this.stop();
        return;
      }

      if (!this.ensureCanvas() || !this.context) {
        return;
      }

      this.startedAtMs = performance.now();
      this.draw(this.startedAtMs);

      if (this.frameId === null) {
        this.frameId = window.requestAnimationFrame(this.scheduleFrame);
      }
    }

    stop() {
      if (this.frameId !== null) {
        window.cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      this.canvas?.remove();
    }
  }

  globalThis.PacePetsDashboardEclipseIcon = Object.freeze({
    create(themeToggle) {
      return new EclipseIcon(themeToggle);
    },
  });
})();

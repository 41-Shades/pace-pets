(() => {
  "use strict";

  const BOUNCE = globalThis.PacePetsBouncingBoxMotion;
  if (!BOUNCE) {
    throw new Error(
      "Bouncing-box motion must load before dashboard-sync-monk-escape-scene.js.",
    );
  }

  const BODY_CLASS = "has-sync-monk-escape";
  const CONE_HALF_ANGLE_RADIANS = (35 * Math.PI) / 180;
  const FRAME_DELTA_LIMIT_MS = 64;
  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  const SPEED_MAX_PX_PER_SECOND = 30;
  const SPEED_MIN_PX_PER_SECOND = 18;
  const UPWARD_ANGLE_RADIANS = -Math.PI / 2;

  function addMediaChangeListener(mediaQuery, listener) {
    if (!mediaQuery) {
      return () => {};
    }
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }

  function prefersReducedMotion() {
    return globalThis.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function viewportSize() {
    const root = document.documentElement;
    return {
      height: Math.max(1, globalThis.innerHeight || root?.clientHeight || 1),
      width: Math.max(1, globalThis.innerWidth || root?.clientWidth || 1),
    };
  }

  function syncIconSource(container) {
    return container.querySelector(":scope > img, :scope > svg");
  }

  function cloneIcon(source) {
    const clone = source.cloneNode(true);
    clone.removeAttribute("id");
    clone.setAttribute("aria-hidden", "true");
    if (clone.tagName === "IMG") {
      clone.alt = "";
      clone.decoding = "async";
      clone.loading = "eager";
    }
    return clone;
  }

  function launchVelocity() {
    const angle =
      UPWARD_ANGLE_RADIANS +
      randomBetween(-CONE_HALF_ANGLE_RADIANS, CONE_HALF_ANGLE_RADIANS);
    const speed = randomBetween(
      SPEED_MIN_PX_PER_SECOND,
      SPEED_MAX_PX_PER_SECOND,
    );
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  }

  class SyncMonkEscapeScene {
    constructor(container, onStop) {
      this.body = null;
      this.container = container;
      this.frameId = null;
      this.isStopped = false;
      this.lastFrameAtMs = null;
      this.layer = null;
      this.onStop = onStop;
      this.reducedMotionMedia = globalThis.matchMedia?.(REDUCED_MOTION_QUERY);
      this.handleMotionPreferenceChange =
        this.handleMotionPreferenceChange.bind(this);
      this.handleResize = this.handleResize.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      this.renderFrame = this.renderFrame.bind(this);
      this.removeMotionPreferenceListener = () => {};
    }

    createLayer() {
      const source = syncIconSource(this.container);
      const rect = source?.getBoundingClientRect();
      if (!source || !rect?.width || !rect.height) {
        return null;
      }

      const layer = document.createElement("span");
      layer.className = "sync-monk-escape";
      layer.setAttribute("aria-hidden", "true");
      layer.style.color = globalThis.getComputedStyle(source).color;
      layer.style.height = `${rect.height}px`;
      layer.style.width = `${rect.width}px`;
      layer.append(cloneIcon(source));
      this.body = {
        height: rect.height,
        width: rect.width,
        x: rect.left,
        y: rect.top,
        ...launchVelocity(),
      };
      return layer;
    }

    cancelFrame() {
      if (this.frameId !== null) {
        globalThis.cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
    }

    renderPosition() {
      if (!this.layer || !this.body) {
        return;
      }

      this.layer.style.transform = `translate3d(${this.body.x}px, ${this.body.y}px, 0)`;
    }

    requestFrame() {
      if (
        this.isStopped ||
        this.frameId !== null ||
        this.reducedMotionMedia?.matches ||
        document.hidden
      ) {
        return;
      }

      this.frameId = globalThis.requestAnimationFrame(this.renderFrame);
    }

    renderFrame(frameTimeMs) {
      this.frameId = null;
      if (this.isStopped || !this.body) {
        return;
      }

      const deltaMs =
        this.lastFrameAtMs === null ? 0 : frameTimeMs - this.lastFrameAtMs;
      this.lastFrameAtMs = frameTimeMs;
      const deltaSeconds =
        Math.max(0, Math.min(deltaMs, FRAME_DELTA_LIMIT_MS)) / 1000;
      if (deltaSeconds > 0) {
        const size = viewportSize();
        BOUNCE.updateBouncingBox(
          this.body,
          size.width,
          size.height,
          deltaSeconds,
        );
      }
      this.renderPosition();
      this.requestFrame();
    }

    handleMotionPreferenceChange() {
      if (this.reducedMotionMedia?.matches) {
        this.stop();
      }
    }

    handleResize() {
      if (this.isStopped || !this.body) {
        return;
      }

      const size = viewportSize();
      BOUNCE.containBouncingBox(this.body, size.width, size.height);
      this.renderPosition();
    }

    handleVisibilityChange() {
      this.cancelFrame();
      this.lastFrameAtMs = null;
      this.requestFrame();
    }

    start() {
      if (this.reducedMotionMedia?.matches) {
        return null;
      }

      this.layer = this.createLayer();
      if (!this.layer) {
        return null;
      }

      document.body.append(this.layer);
      document.body.classList.add(BODY_CLASS);
      this.removeMotionPreferenceListener = addMediaChangeListener(
        this.reducedMotionMedia,
        this.handleMotionPreferenceChange,
      );
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      globalThis.addEventListener("resize", this.handleResize);
      this.renderPosition();
      this.requestFrame();
      return this;
    }

    stop() {
      if (this.isStopped) {
        return;
      }

      this.isStopped = true;
      this.cancelFrame();
      this.removeMotionPreferenceListener();
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      globalThis.removeEventListener("resize", this.handleResize);
      this.layer?.remove();
      document.body.classList.remove(BODY_CLASS);
      this.onStop?.(this);
    }
  }

  function create(container, onStop) {
    if (prefersReducedMotion()) {
      return null;
    }

    return new SyncMonkEscapeScene(container, onStop).start();
  }

  globalThis.PacePetsDashboardSyncMonkEscape = Object.freeze({
    create,
    prefersReducedMotion,
  });
})();

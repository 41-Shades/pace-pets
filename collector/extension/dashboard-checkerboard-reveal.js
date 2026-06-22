((root) => {
  "use strict";

  const ACTIVE_BODY_CLASS = "has-dashboard-checkerboard-reveal";
  const OVERLAY_CLASS = "pace-checkerboard-reveal-overlay";
  const TRANSPARENT_SQUARE_VALUES = Object.freeze({
    black: "black",
    white: "white",
  });
  const activeBodyCounts = new WeakMap();

  function addActiveBody(body) {
    activeBodyCounts.set(body, (activeBodyCounts.get(body) || 0) + 1);
    body.classList.add(ACTIVE_BODY_CLASS);
  }

  function removeActiveBody(body) {
    const nextCount = Math.max(0, (activeBodyCounts.get(body) || 0) - 1);
    if (nextCount > 0) {
      activeBodyCounts.set(body, nextCount);
      return;
    }

    activeBodyCounts.delete(body);
    body.classList.remove(ACTIVE_BODY_CLASS);
  }

  function normalizeTransparentSquares(value) {
    return value === TRANSPARENT_SQUARE_VALUES.white
      ? TRANSPARENT_SQUARE_VALUES.white
      : TRANSPARENT_SQUARE_VALUES.black;
  }

  class CheckerboardReveal {
    constructor({
      documentRef = document,
      motionDisabled = false,
      transparentSquares = TRANSPARENT_SQUARE_VALUES.black,
    } = {}) {
      this.animationFrame = null;
      this.body = null;
      this.documentRef = documentRef;
      this.done = null;
      this.motionDisabled = motionDisabled;
      this.overlay = null;
      this.resolveDone = null;
      this.stopped = false;
      this.transparentSquares = normalizeTransparentSquares(transparentSquares);
    }

    play() {
      if (this.done) {
        return this.done;
      }

      this.done = new Promise((resolve) => {
        this.resolveDone = resolve;
      });
      if (this.motionDisabled) {
        this.finish(true);
        return this.done;
      }

      this.overlay = this.documentRef.createElement("div");
      this.overlay.className = OVERLAY_CLASS;
      this.overlay.dataset.transparentSquares = this.transparentSquares;
      this.overlay.setAttribute("aria-hidden", "true");
      this.body = this.documentRef.body;
      addActiveBody(this.body);
      this.body.append(this.overlay);
      this.animationFrame = root.requestAnimationFrame(() => {
        this.animationFrame = null;
        this.waitForOverlayAnimations();
      });
      return this.done;
    }

    waitForOverlayAnimations() {
      if (this.stopped || !this.overlay) {
        return;
      }

      const animations = this.overlay.getAnimations?.() || [];
      if (animations.length === 0) {
        this.finish(true);
        return;
      }

      Promise.all(animations.map((animation) => animation.finished)).then(
        () => this.finish(true),
        () => this.finish(false),
      );
    }

    stop() {
      this.finish(false);
    }

    finish(completed) {
      if (this.stopped) {
        return;
      }

      this.stopped = true;
      if (this.animationFrame) {
        root.cancelAnimationFrame(this.animationFrame);
      }
      this.animationFrame = null;
      this.overlay?.remove();
      this.overlay = null;
      if (this.body) {
        removeActiveBody(this.body);
      }
      this.body = null;
      this.resolveDone?.(completed);
      this.resolveDone = null;
    }
  }

  function create(options) {
    return new CheckerboardReveal(options);
  }

  root.PacePetsDashboardCheckerboardReveal = Object.freeze({
    create,
    TRANSPARENT_SQUARE_VALUES,
    normalizeTransparentSquares,
  });
})(globalThis);

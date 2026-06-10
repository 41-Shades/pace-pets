(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const CART_SPILL_DATA = globalThis.PacePetsDashboardCartSpillData;
  if (!DATA || !Controller || !CART_SPILL_DATA) {
    throw new Error(
      "Pace data, core, and cart spill data must load before dashboard-cart-spill-methods.js.",
    );
  }

  const { ICONS, SPILL_PROFILES } = CART_SPILL_DATA;
  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function prefersReducedMotion() {
    return window.matchMedia?.(REDUCED_MOTION_QUERY).matches === true;
  }

  function randomIcon(controller) {
    return ICONS[controller.randomIntegerInRange([0, ICONS.length - 1])];
  }

  function createCartSpillImage(icon) {
    const image = document.createElement("img");
    image.alt = "";
    image.className = "cart-spill-image";
    image.decoding = "async";
    image.loading = "eager";
    image.src = icon.src;
    image.setAttribute("aria-hidden", "true");
    return image;
  }

  function flightPath(controller, profile, start) {
    const direction = start.x > window.innerWidth * 0.62 ? -1 : 1;
    const targetX =
      start.x +
      direction * controller.randomIntegerInRange(profile.targetXRangePx);
    const targetY =
      start.y + controller.randomIntegerInRange(profile.targetYRangePx);
    const endX = clamp(targetX, 18, window.innerWidth - 54) - start.x;
    const endY = clamp(targetY, 18, window.innerHeight - 54) - start.y;
    const lift = controller.randomIntegerInRange(profile.liftRangePx);
    const firstX = Math.round(endX * 0.22);
    const secondX = Math.round(endX * 0.72);
    const firstY = Math.round(endY * 0.16 - lift);
    const secondY = Math.round(endY * 0.68 - lift * 0.58);

    return (
      `path("M 0 0 C ${firstX} ${firstY} ` +
      `${secondX} ${secondY} ${Math.round(endX)} ${Math.round(endY)}")`
    );
  }

  function createCartSpillItem(controller, profile, origin, remainingMs) {
    const icon = randomIcon(controller);
    const sizePx = profile.sizePx;
    const start = {
      x: origin.x - sizePx / 2,
      y: origin.y - sizePx / 2,
    };
    const delayMs = controller.randomIntegerInRange(profile.staggerRangeMs);
    const durationMs = Math.max(
      420,
      Math.min(
        controller.randomIntegerInRange(profile.durationRangeMs),
        remainingMs + profile.flightTailMs - delayMs,
      ),
    );
    const spinDeg = controller.randomIntegerInRange(profile.spinRangeDeg);
    const piece = document.createElement("span");
    piece.className = "cart-spill-item";
    piece.dataset.cartSpillKind = icon.key;
    piece.style.left = `${Math.round(start.x)}px`;
    piece.style.top = `${Math.round(start.y)}px`;
    piece.style.setProperty(
      "offset-path",
      flightPath(controller, profile, start),
    );
    piece.style.setProperty("--cart-spill-delay", `${delayMs}ms`);
    piece.style.setProperty("--cart-spill-duration", `${durationMs}ms`);
    piece.style.setProperty("--cart-spill-size", `${sizePx}px`);
    piece.style.setProperty(
      "--cart-spill-start-rotate",
      `${controller.randomIntegerInRange([-18, 18])}deg`,
    );
    piece.style.setProperty(
      "--cart-spill-mid-spin",
      `${Math.round(spinDeg * 0.38)}deg`,
    );
    piece.style.setProperty(
      "--cart-spill-late-spin",
      `${Math.round(spinDeg * 0.72)}deg`,
    );
    piece.style.setProperty("--cart-spill-spin", `${spinDeg}deg`);
    piece.style.setProperty(
      "--cart-spill-end-scale",
      String(controller.randomIntegerInRange(profile.endScaleRange) / 100),
    );
    piece.append(createCartSpillImage(icon));

    return { animationMs: durationMs + delayMs, piece };
  }

  function createOriginCrosshair() {
    const crosshair = document.createElement("span");
    crosshair.className = "cart-spill-origin-crosshair";
    crosshair.setAttribute("aria-hidden", "true");
    return crosshair;
  }

  function cartSpillOrigin(container) {
    const source = container.querySelector("img") || container;
    const rect = source.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return {
      x: rect.left + rect.width * 0.55,
      y: rect.top + rect.height * 0.52,
    };
  }

  function removeCartSpillLayer(state, layer, timer) {
    state.cartSpillLayers.delete(layer);
    if (timer) {
      state.cartSpillTimers.delete(timer);
    }
    layer.remove();
  }

  Object.assign(Controller.prototype, {
    clearSlowCartSpillLayers(state) {
      for (const timer of state.cartSpillTimers) {
        window.clearTimeout(timer);
      }
      state.cartSpillTimers.clear();
      for (const layer of state.cartSpillLayers) {
        layer.remove();
      }
      state.cartSpillLayers.clear();
      state.cartSpillOriginCrosshair?.remove();
      state.cartSpillOriginCrosshair = null;
    },

    showSlowCartSpillOrigin(container, state) {
      if (!document.body) {
        return;
      }

      const origin = cartSpillOrigin(container);
      if (!origin) {
        return;
      }

      if (!state.cartSpillOriginCrosshair) {
        state.cartSpillOriginCrosshair = createOriginCrosshair();
        container.append(state.cartSpillOriginCrosshair);
      }
    },

    launchSlowCartSpill(container, state, { isExtreme = false } = {}) {
      if (prefersReducedMotion()) {
        return;
      }

      const profile = isExtreme ? SPILL_PROFILES.extreme : SPILL_PROFILES.normal;
      if (!profile || !document.body) {
        return;
      }

      this.showSlowCartSpillOrigin(container, state);
      const launchDelayMs = this.randomIntegerInRange(profile.delayRangeMs);
      const launchTimer = window.setTimeout(() => {
        state.cartSpillTimers.delete(launchTimer);
        if (!state.isActive) {
          return;
        }

        const origin = cartSpillOrigin(container);
        if (!origin) {
          return;
        }

        const layer = document.createElement("span");
        layer.className = "cart-spill-layer";
        layer.setAttribute("aria-hidden", "true");

        const remainingMs = DATA.SLOW_WOBBLE_DURATION_MS - launchDelayMs;
        const pieceCount = this.randomIntegerInRange(profile.countRange);
        let longestAnimationMs = 0;
        for (let pieceIndex = 0; pieceIndex < pieceCount; pieceIndex += 1) {
          const { animationMs, piece } = createCartSpillItem(
            this,
            profile,
            origin,
            remainingMs,
          );
          longestAnimationMs = Math.max(longestAnimationMs, animationMs);
          layer.append(piece);
        }

        document.body.append(layer);
        state.cartSpillLayers.add(layer);
        const cleanupTimer = window.setTimeout(() => {
          removeCartSpillLayer(state, layer, cleanupTimer);
        }, longestAnimationMs + 180);
        state.cartSpillTimers.add(cleanupTimer);
      }, launchDelayMs);
      state.cartSpillTimers.add(launchTimer);
    },
  });
})();

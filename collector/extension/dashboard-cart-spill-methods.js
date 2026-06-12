(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const CART_SPILL_DATA = globalThis.PacePetsDashboardCartSpillData;
  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  const PILE_RENDERER = globalThis.PacePetsDashboardCartSpillPileRenderer;
  if (
    !DATA ||
    !Controller ||
    !CART_SPILL_DATA ||
    !DASHBOARD_PREFERENCES ||
    !PILE_RENDERER
  ) {
    throw new Error(
      "Pace data, core, preferences, and cart spill renderers must load before dashboard-cart-spill-methods.js.",
    );
  }

  const { ICONS, SPILL_PROFILES } = CART_SPILL_DATA;
  const PILE_BOTTOM_MARGIN_PX = 8;
  const PILE_GLOBAL_CANDIDATE_COUNT = 4;
  const PILE_LOCAL_RADIUS_SLOTS = 5;
  const PILE_STACK_REUSE_CHANCE_PERCENT = 28;
  const PILE_STACK_REUSE_RADIUS_SLOTS = 7;
  const TOSS_LANDING_CONTROL_LIFT_PX = 36;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function motionPreferenceEnabled() {
    return DASHBOARD_PREFERENCES.motionPreferenceEnabled();
  }

  function randomIcon(controller) {
    return ICONS[controller.randomIntegerInRange([0, ICONS.length - 1])];
  }

  function randomChance(controller, percent) {
    return controller.randomIntegerInRange([1, 100]) <= percent;
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

  function flightPath(controller, profile, start, landing) {
    const endX = Math.round(landing.x - start.x);
    const endY = Math.round(landing.y - start.y);
    const lift = controller.randomIntegerInRange(profile.liftRangePx);
    const firstX = Math.round(endX * 0.22);
    const firstY = -lift;
    const secondX = endX;
    const secondY = Math.round(endY - TOSS_LANDING_CONTROL_LIFT_PX);

    return (
      `path("M 0 0 C ${firstX} ${firstY} ` +
      `${secondX} ${secondY} ${endX} ${endY}")`
    );
  }

  function pileSlotWidth(sizePx) {
    return Math.round(sizePx * 0.7);
  }

  function pileStackStep(sizePx) {
    return Math.round(sizePx * 0.38);
  }

  function pileSlotScore(controller, columns, slotIndex, tossSlotIndex) {
    const stackIndex = columns.get(slotIndex) || 0;
    const distancePenalty = Math.abs(slotIndex - tossSlotIndex) * 0.42;
    const randomPenalty = controller.randomIntegerInRange([0, 18]) / 10;
    return stackIndex * 2.35 + distancePenalty + randomPenalty;
  }

  function pileCandidateSlots(controller, tossSlotIndex, maxSlot) {
    const slots = new Set();
    for (
      let offset = -PILE_LOCAL_RADIUS_SLOTS;
      offset <= PILE_LOCAL_RADIUS_SLOTS;
      offset += 1
    ) {
      slots.add(clamp(tossSlotIndex + offset, 0, maxSlot));
    }

    for (
      let candidateIndex = 0;
      candidateIndex < PILE_GLOBAL_CANDIDATE_COUNT;
      candidateIndex += 1
    ) {
      slots.add(controller.randomIntegerInRange([0, maxSlot]));
    }

    return [...slots];
  }

  function occupiedPileSlots(columns, tossSlotIndex, maxSlot) {
    return [...columns.keys()].filter(
      (slotIndex) =>
        slotIndex >= 0 &&
        slotIndex <= maxSlot &&
        Math.abs(slotIndex - tossSlotIndex) <= PILE_STACK_REUSE_RADIUS_SLOTS,
    );
  }

  function choosePileSlot(controller, columns, tossSlotIndex, maxSlot) {
    const occupiedSlots = occupiedPileSlots(columns, tossSlotIndex, maxSlot);
    if (
      occupiedSlots.length > 0 &&
      randomChance(controller, PILE_STACK_REUSE_CHANCE_PERCENT)
    ) {
      return occupiedSlots[
        controller.randomIntegerInRange([0, occupiedSlots.length - 1])
      ];
    }

    let bestSlot = clamp(tossSlotIndex, 0, maxSlot);
    let bestScore = Infinity;
    for (const slotIndex of pileCandidateSlots(
      controller,
      tossSlotIndex,
      maxSlot,
    )) {
      const score = pileSlotScore(
        controller,
        columns,
        slotIndex,
        tossSlotIndex,
      );
      if (score < bestScore) {
        bestScore = score;
        bestSlot = slotIndex;
      }
    }

    return bestSlot;
  }

  function cartSpillTossEnd(controller, profile, start) {
    const direction = start.x > window.innerWidth * 0.62 ? -1 : 1;
    const targetX =
      start.x +
      direction * controller.randomIntegerInRange(profile.targetXRangePx);
    const targetY =
      start.y + controller.randomIntegerInRange(profile.targetYRangePx);

    return {
      x: clamp(targetX, 18, window.innerWidth - 54),
      y: clamp(targetY, 18, window.innerHeight - 54),
    };
  }

  function cartSpillLanding(controller, state, tossEnd, sizePx) {
    const columns = state.cartSpillPileColumns;
    const slotWidth = pileSlotWidth(sizePx);
    const maxSlot = Math.max(
      0,
      Math.floor((window.innerWidth - sizePx) / slotWidth),
    );
    const tossSlotIndex = Math.round(tossEnd.x / slotWidth);
    const slotIndex = choosePileSlot(
      controller,
      columns,
      tossSlotIndex,
      maxSlot,
    );
    const stackIndex = columns.get(slotIndex) || 0;
    columns.set(slotIndex, stackIndex + 1);
    const halfSizePx = sizePx / 2;
    const xJitter = controller.randomIntegerInRange([
      -Math.round(sizePx * 0.22),
      Math.round(sizePx * 0.22),
    ]);
    const yJitter = controller.randomIntegerInRange([-4, 3]);

    return {
      rotateDeg: controller.randomIntegerInRange([-18, 18]),
      x: clamp(
        slotIndex * slotWidth + halfSizePx + xJitter,
        halfSizePx,
        window.innerWidth - halfSizePx,
      ),
      y:
        window.innerHeight -
        PILE_BOTTOM_MARGIN_PX -
        halfSizePx -
        stackIndex * pileStackStep(sizePx) +
        yJitter,
    };
  }

  function createCartSpillItem(
    controller,
    profile,
    { origin, remainingMs, state },
  ) {
    const icon = randomIcon(controller);
    const sizePx = profile.sizePx;
    const start = {
      x: origin.x - sizePx / 2,
      y: origin.y - sizePx / 2,
    };
    const tossEnd = cartSpillTossEnd(controller, profile, start);
    const landing = cartSpillLanding(controller, state, tossEnd, sizePx);
    const delayMs = controller.randomIntegerInRange(profile.staggerRangeMs);
    const durationMs = Math.max(
      420,
      Math.min(
        controller.randomIntegerInRange(profile.durationRangeMs),
        remainingMs + profile.flightTailMs - delayMs,
      ),
    );
    const endScale =
      controller.randomIntegerInRange(profile.endScaleRange) / 100;
    const spinDeg = controller.randomIntegerInRange(profile.spinRangeDeg);
    const piece = document.createElement("span");
    piece.className = "cart-spill-item";
    piece.dataset.cartSpillKind = icon.key;
    piece.style.left = `${Math.round(start.x)}px`;
    piece.style.top = `${Math.round(start.y)}px`;
    piece.style.setProperty(
      "offset-path",
      flightPath(controller, profile, start, landing),
    );
    piece.style.setProperty("--cart-spill-delay", `${delayMs}ms`);
    piece.style.setProperty("--cart-spill-duration", `${durationMs}ms`);
    piece.style.setProperty("--cart-spill-size", `${sizePx}px`);
    piece.style.setProperty(
      "--cart-spill-start-rotate",
      `${controller.randomIntegerInRange([-18, 18])}deg`,
    );
    piece.style.setProperty("--cart-spill-spin", `${spinDeg}deg`);
    piece.style.setProperty("--cart-spill-end-scale", String(endScale));
    const image = createCartSpillImage(icon);
    piece.append(image);

    return {
      animationMs: durationMs + delayMs,
      endScale,
      image,
      landing,
      piece,
      sizePx,
      spinDeg,
    };
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
      PILE_RENDERER.clearCartSpillPile(state);
    },

    launchSlowCartSpill(container, state, { isExtreme = false } = {}) {
      if (!motionPreferenceEnabled()) {
        return;
      }

      const mode = isExtreme ? "extreme" : "normal";
      const profile = SPILL_PROFILES[mode];
      if (!profile || !document.body) {
        return;
      }

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
          const item = createCartSpillItem(this, profile, {
            origin,
            remainingMs,
            state,
          });
          longestAnimationMs = Math.max(longestAnimationMs, item.animationMs);
          layer.append(item.piece);
          const settleTimer = window.setTimeout(() => {
            state.cartSpillTimers.delete(settleTimer);
            PILE_RENDERER.settleCartSpillItem(state, item);
            item.piece.remove();
          }, item.animationMs);
          state.cartSpillTimers.add(settleTimer);
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

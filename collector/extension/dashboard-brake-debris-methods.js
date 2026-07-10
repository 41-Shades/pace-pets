(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  const DEBRIS_DATA = globalThis.PacePetsDashboardBrakeDebrisData;
  if (!DATA || !Controller || !DASHBOARD_PREFERENCES || !DEBRIS_DATA) {
    throw new Error(
      "Pace data, core, preferences, and brake debris data must load before dashboard-brake-debris-methods.js.",
    );
  }

  const { KIND_KEYS_BY_RANGE, SHAPES } = DEBRIS_DATA;
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

  function setSvgAttributes(element, attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      element.setAttribute(name, value);
    }
  }

  function motionPreferenceEnabled() {
    return DASHBOARD_PREFERENCES.motionPreferenceEnabled();
  }

  function createDebrisSvg(kindKey, variantIndex) {
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "brake-debris-svg");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("viewBox", "0 0 20 20");

    const variants = SHAPES[kindKey] || SHAPES.panel;
    const parts = variants[variantIndex % variants.length];
    for (const part of parts) {
      const element = document.createElementNS(SVG_NAMESPACE, part.tag);
      setSvgAttributes(element, part.attrs);
      svg.append(element);
    }

    return svg;
  }

  function createDebrisPiece(controller, rangeKey, profile) {
    const kindKeys = KIND_KEYS_BY_RANGE[rangeKey] || KIND_KEYS_BY_RANGE.wide;
    const kindKey =
      kindKeys[controller.randomIntegerInRange([0, kindKeys.length - 1])];
    const variantIndex = controller.randomIntegerInRange([
      0,
      (SHAPES[kindKey] || SHAPES.panel).length - 1,
    ]);
    const sizePx = controller.randomIntegerInRange(profile.SIZE_RANGE_PX);
    const piece = document.createElement("span");
    piece.className = "brake-debris-piece";
    piece.dataset.brakeDebrisKind = kindKey;
    piece.style.setProperty("--brake-debris-size", `${sizePx}px`);
    piece.append(createDebrisSvg(kindKey, variantIndex));

    return { piece, sizePx };
  }

  function debrisPathForTrajectory(
    controller,
    profile,
    startY,
    burstX,
    burstY,
  ) {
    const fallX = Math.round(
      burstX * 0.56 +
        controller.randomIntegerInRange(profile.FALL_DRIFT_RANGE_PX),
    );
    const fallY = Math.max(
      150,
      Math.round(
        window.innerHeight -
          startY +
          controller.randomIntegerInRange(profile.FALL_OVERSHOOT_RANGE_PX),
      ),
    );
    const curveLift = controller.randomIntegerInRange(
      profile.CURVE_LIFT_RANGE_PX,
    );
    const curveDrift = controller.randomIntegerInRange(
      profile.CURVE_DRIFT_RANGE_PX,
    );
    const firstCurveX = Math.round(burstX * 0.46 + curveDrift * 0.2);
    const firstCurveY = Math.round(burstY * 0.42 - curveLift);
    const secondCurveX = Math.round(burstX * 1.05 + curveDrift);
    const secondCurveY = Math.round(fallY * 0.26 - curveLift * 0.32);
    return (
      `path("M 0 0 C ${firstCurveX} ${firstCurveY} ` +
      `${secondCurveX} ${secondCurveY} ${fallX} ${fallY}")`
    );
  }

  function applyDebrisPieceStyle(controller, piece, profile, placement) {
    const durationMs = controller.randomIntegerInRange(
      profile.DURATION_RANGE_MS,
    );
    const delayMs = controller.randomIntegerInRange(profile.DELAY_RANGE_MS);
    const spinDeg = controller.randomIntegerInRange(profile.SPIN_RANGE_DEG);

    piece.style.left = `${placement.startX}px`;
    piece.style.top = `${placement.startY}px`;
    piece.style.setProperty("offset-path", placement.path);
    piece.style.setProperty("--brake-debris-delay", `${delayMs}ms`);
    piece.style.setProperty("--brake-debris-duration", `${durationMs}ms`);
    piece.style.setProperty(
      "--brake-debris-start-rotate",
      `${controller.randomIntegerInRange([-35, 35])}deg`,
    );
    piece.style.setProperty(
      "--brake-debris-mid-spin",
      `${Math.round(spinDeg * 0.48)}deg`,
    );
    piece.style.setProperty("--brake-debris-spin", `${spinDeg}deg`);
    piece.style.setProperty(
      "--brake-debris-mid-scale",
      String(controller.randomIntegerInRange([94, 118]) / 100),
    );
    piece.style.setProperty(
      "--brake-debris-end-scale",
      String(controller.randomIntegerInRange([72, 106]) / 100),
    );

    return durationMs + delayMs;
  }

  function appendDebrisPiece(controller, layer, rangeKey, profile, origin) {
    const { piece, sizePx } = createDebrisPiece(controller, rangeKey, profile);
    const angle =
      (controller.randomIntegerInRange(profile.ANGLE_RANGE_DEG) * Math.PI) /
      180;
    const launchRadius = controller.randomIntegerInRange(
      profile.LAUNCH_RADIUS_RANGE_PX,
    );
    const burstX = Math.round(Math.cos(angle) * launchRadius);
    const burstY = Math.round(Math.sin(angle) * launchRadius);
    const startX = Math.round(
      origin.x +
        controller.randomIntegerInRange(profile.ORIGIN_JITTER_RANGE_PX) -
        sizePx / 2,
    );
    const startY = Math.round(
      origin.y +
        controller.randomIntegerInRange(profile.ORIGIN_JITTER_RANGE_PX) -
        sizePx / 2,
    );
    const path = debrisPathForTrajectory(
      controller,
      profile,
      startY,
      burstX,
      burstY,
    );
    const animationMs = applyDebrisPieceStyle(controller, piece, profile, {
      path,
      startX,
      startY,
    });
    layer.append(piece);

    return animationMs;
  }

  function removeDebrisLayer(state, layer, timer) {
    state.debrisLayers.delete(layer);
    if (timer) {
      state.debrisTimers.delete(timer);
    }
    layer.remove();
  }

  function stopBrakeExtremeAudio(state) {
    state.brakeExtremeAudio?.stop?.({ fadeOutMs: 0 });
    state.brakeExtremeAudio = null;
  }

  function clearDebrisLayers(state) {
    stopBrakeExtremeAudio(state);
    for (const timer of state.debrisTimers) {
      window.clearTimeout(timer);
    }
    state.debrisTimers.clear();
    for (const cleanup of [...(state.debrisAnimationCleanups || [])]) {
      cleanup();
    }
    state.debrisAnimationCleanups?.clear();
    for (const layer of state.debrisLayers) {
      layer.remove();
    }
    state.debrisLayers.clear();
  }

  Object.assign(Controller.prototype, {
    clearBrakeDebrisLayers(state) {
      clearDebrisLayers(state);
    },

    launchBrakeDebrisBurst(container, burst, state) {
      if (burst.rangeKey === "normal" || !motionPreferenceEnabled()) {
        return 0;
      }

      const rangeKey = burst.rangeKey;
      if (rangeKey === "extreme") {
        return this.launchBrakeExtremeDebrisBurst(container, state);
      }

      const profile = DATA.BRAKE_DEBRIS_BURST_PROFILES[rangeKey];
      const rect = container.getBoundingClientRect();
      if (!profile || !document.body || rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const layer = document.createElement("span");
      layer.className = "brake-debris-layer";
      layer.dataset.brakeDebrisRange = rangeKey;
      layer.setAttribute("aria-hidden", "true");

      const origin = {
        x: rect.left + rect.width * 0.52,
        y: rect.top + rect.height * 0.58,
      };
      const pieceCount = this.randomIntegerInRange(profile.COUNT_RANGE);
      let longestAnimationMs = 0;
      for (let pieceIndex = 0; pieceIndex < pieceCount; pieceIndex += 1) {
        longestAnimationMs = Math.max(
          longestAnimationMs,
          appendDebrisPiece(this, layer, rangeKey, profile, origin),
        );
      }

      document.body.append(layer);
      state.debrisLayers.add(layer);
      const cleanupTimer = window.setTimeout(() => {
        removeDebrisLayer(state, layer, cleanupTimer);
      }, longestAnimationMs + 140);
      state.debrisTimers.add(cleanupTimer);
      return longestAnimationMs + 140;
    },
  });
})();

(() => {
  "use strict";

  const ORIGIN = Object.freeze({ X_PX: 64, Y_PX: 27 });
  const EMIT_INTERVAL_MS = 340;
  const EMIT_JITTER_MS = Object.freeze([-35, 35]);
  const INITIAL_ACTIVE_PUFFS = 12;
  const MAX_CATCH_UP_EMISSIONS = 4;
  const PUFF_POOL_SIZE = 20;
  const ESCAPE = Object.freeze({
    CHANCE_PERCENT: 4,
    DURATION_MS: Object.freeze([11000, 15000]),
    END_OPACITY_RATIO: 0.28,
    END_SCALE_PERCENT: Object.freeze([128, 145]),
    END_X_PX: Object.freeze([-230, -184]),
    FADE_START_PROGRESS: 0.82,
    FIRST_CONTROL_X_OFFSET_PX: Object.freeze([-132, -92]),
    FIRST_CONTROL_Y_OFFSET_PX: Object.freeze([-8, 0]),
    MIN_END_Y_PX: -180,
    SECOND_CONTROL_X_PX: Object.freeze([-236, -190]),
    SECOND_CONTROL_Y_PERCENT: Object.freeze([50, 66]),
    SPIN_DEG: Object.freeze([18, 34]),
    TILT_DEG: Object.freeze([-8, 8]),
    TOP_MARGIN_PX: 120,
  });
  const EXTENDED_PATH = Object.freeze({
    CHANCE_PERCENT: 27,
    DURATION_MS: Object.freeze([5600, 7600]),
    END_X_PX: Object.freeze([-104, -62]),
    END_Y_PX: Object.freeze([-40, -14]),
    MID_OPACITY_RATIO: 0.42,
    MID_X_PX: Object.freeze([-17, -5]),
    MID_Y_PX: Object.freeze([-40, -25]),
    PEAK_OPACITY_RATIO: 0.9,
    THIN_OPACITY_RATIO: 0.12,
  });
  const SHAPES = Object.freeze(["round", "long", "tall"]);
  const VARIATION = Object.freeze({
    DURATION_MS: Object.freeze([4200, 5800]),
    END_SCALE_PERCENT: Object.freeze([106, 122]),
    END_X_PX: Object.freeze([-60, -44]),
    END_Y_PX: Object.freeze([-27, -20]),
    MID_X_PX: Object.freeze([-5, -1]),
    MID_Y_PX: Object.freeze([-32, -24]),
    OPACITY_PERCENT: Object.freeze([52, 72]),
    SIZE_PX: Object.freeze([12, 19]),
    TILT_DEG: Object.freeze([-12, 10]),
  });

  function decimalString(value) {
    return String(Math.round(value * 100) / 100);
  }

  function lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  function randomItem(controller, items) {
    return items[controller.randomIntegerInRange([0, items.length - 1])];
  }

  function smoothstep(progress) {
    return progress * progress * (3 - 2 * progress);
  }

  function quadraticPoint(start, control, end, progress) {
    const inverse = 1 - progress;
    return (
      inverse * inverse * start +
      2 * inverse * progress * control +
      progress * progress * end
    );
  }

  function cubicPoint(start, firstControl, secondControl, end, progress) {
    const inverse = 1 - progress;
    return (
      inverse * inverse * inverse * start +
      3 * inverse * inverse * progress * firstControl +
      3 * inverse * progress * progress * secondControl +
      progress * progress * progress * end
    );
  }

  function arcPosition(puffState, progress) {
    return {
      x: quadraticPoint(0, puffState.midX, puffState.endX, progress),
      y: quadraticPoint(0, puffState.midY, puffState.endY, progress),
    };
  }

  function escapePosition(puffState, progress) {
    return {
      x: cubicPoint(
        puffState.endX,
        puffState.escapeFirstControlX,
        puffState.escapeSecondControlX,
        puffState.escapeEndX,
        progress,
      ),
      y: cubicPoint(
        puffState.endY,
        puffState.escapeFirstControlY,
        puffState.escapeSecondControlY,
        puffState.escapeEndY,
        progress,
      ),
    };
  }

  function escapeEndYForPuff(puff) {
    const rect = puff.parentElement?.getBoundingClientRect?.();
    if (!rect) {
      return ESCAPE.MIN_END_Y_PX;
    }
    const viewportExitY = -(rect.top + ORIGIN.Y_PX + ESCAPE.TOP_MARGIN_PX);
    return Math.min(ESCAPE.MIN_END_Y_PX, viewportExitY);
  }

  function escapeOpacityForProgress(progress, peakOpacity) {
    if (progress < ESCAPE.FADE_START_PROGRESS) {
      return peakOpacity * ESCAPE.END_OPACITY_RATIO;
    }
    return lerp(
      peakOpacity * ESCAPE.END_OPACITY_RATIO,
      0,
      smoothstep(
        (progress - ESCAPE.FADE_START_PROGRESS) /
          (1 - ESCAPE.FADE_START_PROGRESS),
      ),
    );
  }

  function opacityForProgress(progress, peakOpacity, endOpacityRatio = 0) {
    if (progress < 0.16) {
      return peakOpacity * smoothstep(progress / 0.16);
    }
    if (progress < 0.48) {
      return peakOpacity;
    }
    if (progress < 0.7) {
      return lerp(
        peakOpacity,
        peakOpacity * 0.66,
        smoothstep((progress - 0.48) / 0.22),
      );
    }
    if (progress < 0.86) {
      return lerp(
        peakOpacity * 0.66,
        peakOpacity * 0.28,
        smoothstep((progress - 0.7) / 0.16),
      );
    }
    return lerp(
      peakOpacity * 0.28,
      peakOpacity * endOpacityRatio,
      smoothstep((progress - 0.86) / 0.14),
    );
  }

  function extendedOpacityForProgress(
    progress,
    peakOpacity,
    endOpacityRatio = 0,
  ) {
    const adjustedPeakOpacity = peakOpacity * EXTENDED_PATH.PEAK_OPACITY_RATIO;
    const thinOpacityRatio = Math.max(
      EXTENDED_PATH.THIN_OPACITY_RATIO,
      endOpacityRatio,
    );
    if (progress < 0.14) {
      return adjustedPeakOpacity * smoothstep(progress / 0.14);
    }
    if (progress < 0.36) {
      return adjustedPeakOpacity;
    }
    if (progress < 0.68) {
      return lerp(
        adjustedPeakOpacity,
        peakOpacity * EXTENDED_PATH.MID_OPACITY_RATIO,
        smoothstep((progress - 0.36) / 0.32),
      );
    }
    if (progress < 0.86) {
      return lerp(
        peakOpacity * EXTENDED_PATH.MID_OPACITY_RATIO,
        peakOpacity * thinOpacityRatio,
        smoothstep((progress - 0.68) / 0.18),
      );
    }
    return lerp(
      peakOpacity * thinOpacityRatio,
      peakOpacity * endOpacityRatio,
      smoothstep((progress - 0.86) / 0.14),
    );
  }

  function clearPuffVariation(puff) {
    puff.removeAttribute("data-train-smoke-shape");
    puff.style.removeProperty("--train-smoke-size");
    puff.style.removeProperty("opacity");
    puff.style.removeProperty("transform");
  }

  function randomPathVariation(controller) {
    if (
      controller.randomIntegerInRange([1, 100]) > EXTENDED_PATH.CHANCE_PERCENT
    ) {
      return {
        baseDurationMs: controller.randomIntegerInRange(VARIATION.DURATION_MS),
        endX: controller.randomIntegerInRange(VARIATION.END_X_PX),
        endY: controller.randomIntegerInRange(VARIATION.END_Y_PX),
        isExtendedPath: false,
        midX: controller.randomIntegerInRange(VARIATION.MID_X_PX),
        midY: controller.randomIntegerInRange(VARIATION.MID_Y_PX),
      };
    }

    return {
      baseDurationMs: controller.randomIntegerInRange(
        EXTENDED_PATH.DURATION_MS,
      ),
      endX: controller.randomIntegerInRange(EXTENDED_PATH.END_X_PX),
      endY: controller.randomIntegerInRange(EXTENDED_PATH.END_Y_PX),
      isExtendedPath: true,
      midX: controller.randomIntegerInRange(EXTENDED_PATH.MID_X_PX),
      midY: controller.randomIntegerInRange(EXTENDED_PATH.MID_Y_PX),
    };
  }

  function randomVariation(controller) {
    const path = randomPathVariation(controller);
    return {
      ...path,
      endScale:
        controller.randomIntegerInRange(VARIATION.END_SCALE_PERCENT) / 100,
      opacity: controller.randomIntegerInRange(VARIATION.OPACITY_PERCENT) / 100,
      shape: randomItem(controller, SHAPES),
      sizePx: controller.randomIntegerInRange(VARIATION.SIZE_PX),
      tilt: controller.randomIntegerInRange(VARIATION.TILT_DEG),
    };
  }

  function escapeDefaults(variation) {
    return {
      durationMs: 0,
      endScale: variation.endScale,
      endX: variation.endX,
      endY: variation.endY,
      firstControlX: variation.endX,
      firstControlY: variation.endY,
      isEscape: false,
      secondControlX: variation.endX,
      secondControlY: variation.endY,
      spinDeg: 0,
      tilt: 0,
    };
  }

  function escapeSpinDirection(controller) {
    if (controller.randomIntegerInRange([0, 1]) === 0) {
      return -1;
    }
    return 1;
  }

  function randomEscape(controller, puff, variation) {
    const isEscape =
      controller.randomIntegerInRange([1, 100]) <= ESCAPE.CHANCE_PERCENT;
    if (!isEscape) {
      return escapeDefaults(variation);
    }

    const endY = escapeEndYForPuff(puff);
    return {
      durationMs: controller.randomIntegerInRange(ESCAPE.DURATION_MS),
      endScale:
        variation.endScale *
        (controller.randomIntegerInRange(ESCAPE.END_SCALE_PERCENT) / 100),
      endX: controller.randomIntegerInRange(ESCAPE.END_X_PX),
      endY,
      firstControlX:
        variation.endX +
        controller.randomIntegerInRange(ESCAPE.FIRST_CONTROL_X_OFFSET_PX),
      firstControlY:
        variation.endY +
        controller.randomIntegerInRange(ESCAPE.FIRST_CONTROL_Y_OFFSET_PX),
      isEscape: true,
      secondControlX: controller.randomIntegerInRange(
        ESCAPE.SECOND_CONTROL_X_PX,
      ),
      secondControlY: lerp(
        variation.endY,
        endY,
        controller.randomIntegerInRange(ESCAPE.SECOND_CONTROL_Y_PERCENT) / 100,
      ),
      spinDeg:
        controller.randomIntegerInRange(ESCAPE.SPIN_DEG) *
        escapeSpinDirection(controller),
      tilt: controller.randomIntegerInRange(ESCAPE.TILT_DEG),
    };
  }

  function baseEndOpacityRatio(puffState) {
    if (puffState.isEscape) {
      return ESCAPE.END_OPACITY_RATIO;
    }
    return 0;
  }

  function puffPhase(puffState, elapsedMs) {
    const isEscaping =
      puffState.isEscape && elapsedMs > puffState.baseDurationMs;
    if (isEscaping) {
      const phaseDurationMs = puffState.durationMs - puffState.baseDurationMs;
      const progress = (elapsedMs - puffState.baseDurationMs) / phaseDurationMs;
      return {
        isEscaping,
        motionProgress: smoothstep(progress),
        progress,
      };
    }

    const progress = elapsedMs / puffState.baseDurationMs;
    return {
      isEscaping,
      motionProgress: smoothstep(progress),
      progress,
    };
  }

  function baseFrameValues(puffState, phase) {
    const opacityForBasePath = puffState.isExtendedPath
      ? extendedOpacityForProgress
      : opacityForProgress;
    return {
      opacity: opacityForBasePath(
        phase.progress,
        puffState.opacity,
        baseEndOpacityRatio(puffState),
      ),
      position: arcPosition(puffState, phase.motionProgress),
      rotate: lerp(puffState.tilt, 0, phase.motionProgress),
      scale: lerp(0.58, puffState.endScale, phase.motionProgress),
    };
  }

  function escapeFrameValues(puffState, phase) {
    return {
      opacity: escapeOpacityForProgress(phase.progress, puffState.opacity),
      position: escapePosition(puffState, phase.motionProgress),
      rotate: lerp(
        0,
        puffState.escapeTilt + puffState.escapeSpinDeg,
        phase.motionProgress,
      ),
      scale: lerp(
        puffState.endScale,
        puffState.escapeEndScale,
        phase.motionProgress,
      ),
    };
  }

  function puffFrameValues(puffState, elapsedMs) {
    const phase = puffPhase(puffState, elapsedMs);
    if (phase.isEscaping) {
      return escapeFrameValues(puffState, phase);
    }
    return baseFrameValues(puffState, phase);
  }

  globalThis.PacePetsDashboardTrainSmoke = Object.freeze({
    EMIT_INTERVAL_MS,
    EMIT_JITTER_MS,
    ESCAPE,
    EXTENDED_PATH,
    INITIAL_ACTIVE_PUFFS,
    MAX_CATCH_UP_EMISSIONS,
    ORIGIN,
    PUFF_POOL_SIZE,
    SHAPES,
    VARIATION,
    arcPosition,
    clearPuffVariation,
    decimalString,
    escapeEndYForPuff,
    escapeOpacityForProgress,
    escapePosition,
    lerp,
    opacityForProgress,
    puffFrameValues,
    randomItem,
    randomEscape,
    randomVariation,
    smoothstep,
  });
})();

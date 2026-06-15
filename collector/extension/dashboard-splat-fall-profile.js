(() => {
  "use strict";

  const RATIO_HEIGHT_NORMAL_RANGE_PX = Object.freeze([260, 380]);
  const RATIO_HEIGHT_HIGH_RANGE_PX = Object.freeze([380, 480]);
  const RATIO_HEIGHT_WILD_RANGE_PX = Object.freeze([480, 560]);
  const RATIO_DURATION_RANGE_MS = Object.freeze([1050, 1500]);
  const RATIO_DRIFT_X_RANGE_PX = Object.freeze([-14, 14]);
  const RATIO_REBOUND_X_RANGE_PX = Object.freeze([-8, 8]);
  const RATIO_REBOUND_Y_RANGE_PX = Object.freeze([16, 42]);
  const RATIO_SETTLE_Y_RANGE_PX = Object.freeze([2, 7]);
  const RATIO_SECOND_Y_RANGE_PX = Object.freeze([6, 20]);
  const RATIO_PEAK_SCALE_RANGE_PERCENT = Object.freeze([108, 120]);
  const RATIO_REBOUND_SCALE_RANGE_PERMILLE = Object.freeze([975, 995]);
  const EXTREME_RATIO_SLAM_DURATION_MS = 2400;
  const EXTREME_RATIO_SLAM_IMPACT_PROGRESS = 0.76;
  const EXTREME_RATIO_SLAM_PEAK_Y_PX = -5000;
  const EXTREME_CARD_IMPACT_DURATION_MS = 840;
  const MAX_INTRO_CARD_IMPACT_DURATION_MS = 640;

  const CARD_DURATION_RANGE_MS = Object.freeze([560, 720]);
  const CARD_DROP_Y_RANGE_PX = Object.freeze([6, 11]);
  const CARD_REBOUND_Y_TENTHS_RANGE_PX = Object.freeze([-42, -22]);
  const CARD_SETTLE_Y_TENTHS_RANGE_PX = Object.freeze([10, 22]);
  const CARD_FINAL_Y_TENTHS_RANGE_PX = Object.freeze([-7, -2]);
  const CARD_ROTATE_FIRST_TENTHS_RANGE_DEG = Object.freeze([-62, -35]);
  const CARD_ROTATE_SECOND_HUNDREDTHS_RANGE_DEG = Object.freeze([120, 220]);
  const CARD_ROTATE_THIRD_HUNDREDTHS_RANGE_DEG = Object.freeze([-90, -45]);
  const CARD_ROTATE_FOURTH_HUNDREDTHS_RANGE_DEG = Object.freeze([16, 32]);
  const CARD_ORIGIN_X_RANGE_PERCENT = Object.freeze([50, 54]);
  const CARD_ORIGIN_Y_RANGE_PERCENT = Object.freeze([68, 76]);
  const CARD_EXTREME_CLASS = "is-splat-card-extreme-impacting";
  const CARD_STYLE_PROPERTIES = Object.freeze([
    "--splat-card-teeter-duration",
    "--splat-card-drop-y",
    "--splat-card-rebound-y",
    "--splat-card-settle-y",
    "--splat-card-final-y",
    "--splat-card-rotate-first",
    "--splat-card-rotate-second",
    "--splat-card-rotate-third",
    "--splat-card-rotate-fourth",
    "--splat-card-origin-x",
    "--splat-card-origin-y",
  ]);

  function clamp(value, [min, max]) {
    return Math.min(max, Math.max(min, value));
  }

  function randomRatioBounceHeight(controller) {
    const roll = controller.randomIntegerInRange([1, 100]);
    if (roll <= 5) {
      return controller.randomIntegerInRange(RATIO_HEIGHT_WILD_RANGE_PX);
    }
    if (roll <= 30) {
      return controller.randomIntegerInRange(RATIO_HEIGHT_HIGH_RANGE_PX);
    }
    return controller.randomIntegerInRange(RATIO_HEIGHT_NORMAL_RANGE_PX);
  }

  function randomRatioBounceDuration(controller, heightPx) {
    const [minHeight] = RATIO_HEIGHT_NORMAL_RANGE_PX;
    const [, maxHeight] = RATIO_HEIGHT_WILD_RANGE_PX;
    const heightProgress = (heightPx - minHeight) / (maxHeight - minHeight);
    const baseDurationMs = 1050 + Math.round(heightProgress * 330);
    const jitterMs = controller.randomIntegerInRange([-80, 120]);
    return clamp(baseDurationMs + jitterMs, RATIO_DURATION_RANGE_MS);
  }

  function randomRatioBounceProfile(controller) {
    const heightPx = randomRatioBounceHeight(controller);
    return {
      durationMs: randomRatioBounceDuration(controller, heightPx),
      peakScale:
        controller.randomIntegerInRange(RATIO_PEAK_SCALE_RANGE_PERCENT) / 100,
      peakXPx: controller.randomIntegerInRange(RATIO_DRIFT_X_RANGE_PX),
      peakYPx: -heightPx,
      reboundScale:
        controller.randomIntegerInRange(RATIO_REBOUND_SCALE_RANGE_PERMILLE) /
        1000,
      reboundXPx: controller.randomIntegerInRange(RATIO_REBOUND_X_RANGE_PX),
      reboundYPx: controller.randomIntegerInRange(RATIO_REBOUND_Y_RANGE_PX),
      secondYPx: -controller.randomIntegerInRange(RATIO_SECOND_Y_RANGE_PX),
      settleYPx: controller.randomIntegerInRange(RATIO_SETTLE_Y_RANGE_PX),
    };
  }

  function extremeRatioSlamProfile() {
    return {
      durationMs: EXTREME_RATIO_SLAM_DURATION_MS,
      peakScale: 1.24,
      peakXPx: 18,
      peakYPx: EXTREME_RATIO_SLAM_PEAK_Y_PX,
      reboundScale: 0.9,
      reboundXPx: 0,
      reboundYPx: 138,
      secondYPx: -62,
      settleYPx: 0,
      slamDescentFinalYPx: -48,
      slamDescentHighYPx: -960,
      slamDescentMidYPx: -520,
      slamDescentNearYPx: -220,
      slamSettleYPx: 36,
      slamSmallBounceYPx: -12,
      slamYPx: 138,
      slamImpactDelayMs: Math.round(
        EXTREME_RATIO_SLAM_DURATION_MS * EXTREME_RATIO_SLAM_IMPACT_PROGRESS,
      ),
      typeClass: "is-splat-ratio-extreme-slam",
    };
  }

  function randomCardImpactProfile(controller) {
    return {
      durationMs: controller.randomIntegerInRange(CARD_DURATION_RANGE_MS),
      dropYPx: controller.randomIntegerInRange(CARD_DROP_Y_RANGE_PX),
      finalYPx:
        controller.randomIntegerInRange(CARD_FINAL_Y_TENTHS_RANGE_PX) / 10,
      firstRotateDeg:
        controller.randomIntegerInRange(CARD_ROTATE_FIRST_TENTHS_RANGE_DEG) /
        10,
      fourthRotateDeg:
        controller.randomIntegerInRange(
          CARD_ROTATE_FOURTH_HUNDREDTHS_RANGE_DEG,
        ) / 100,
      originXPercent: controller.randomIntegerInRange(
        CARD_ORIGIN_X_RANGE_PERCENT,
      ),
      originYPercent: controller.randomIntegerInRange(
        CARD_ORIGIN_Y_RANGE_PERCENT,
      ),
      reboundYPx:
        controller.randomIntegerInRange(CARD_REBOUND_Y_TENTHS_RANGE_PX) / 10,
      secondRotateDeg:
        controller.randomIntegerInRange(
          CARD_ROTATE_SECOND_HUNDREDTHS_RANGE_DEG,
        ) / 100,
      settleYPx:
        controller.randomIntegerInRange(CARD_SETTLE_Y_TENTHS_RANGE_PX) / 10,
      thirdRotateDeg:
        controller.randomIntegerInRange(
          CARD_ROTATE_THIRD_HUNDREDTHS_RANGE_DEG,
        ) / 100,
    };
  }

  function extremeCardImpactProfile() {
    return {
      cardClassName: CARD_EXTREME_CLASS,
      durationMs: EXTREME_CARD_IMPACT_DURATION_MS,
      dropYPx: 80,
      finalYPx: -8.8,
      firstRotateDeg: -31.5,
      fourthRotateDeg: 4.9,
      originXPercent: 56,
      originYPercent: 82,
      reboundYPx: -45.5,
      secondRotateDeg: 21,
      settleYPx: 31.5,
      thirdRotateDeg: -12.3,
    };
  }

  function maxIntroCardImpactProfile() {
    return {
      durationMs: MAX_INTRO_CARD_IMPACT_DURATION_MS,
      dropYPx: 35,
      finalYPx: -2.5,
      firstRotateDeg: -17.5,
      fourthRotateDeg: 1.9,
      originXPercent: CARD_ORIGIN_X_RANGE_PERCENT[1],
      originYPercent: 78,
      reboundYPx: -17.5,
      secondRotateDeg: 9.5,
      settleYPx: 10.2,
      thirdRotateDeg: -4.9,
    };
  }

  function clearStyleProperties(element, properties) {
    if (!element) {
      return;
    }

    for (const property of properties) {
      element.style.removeProperty(property);
    }
  }

  function clearCardImpact(card) {
    card?.classList.remove("is-splat-card-impacting", CARD_EXTREME_CLASS);
    clearStyleProperties(card, CARD_STYLE_PROPERTIES);
  }

  function applyCardImpactProfile(card, profile) {
    if (!card) {
      return;
    }

    card.classList.toggle(CARD_EXTREME_CLASS, false);
    if (profile.cardClassName) {
      card.classList.add(profile.cardClassName);
    }
    card.style.setProperty(
      "--splat-card-teeter-duration",
      `${profile.durationMs}ms`,
    );
    card.style.setProperty("--splat-card-drop-y", `${profile.dropYPx}px`);
    card.style.setProperty("--splat-card-rebound-y", `${profile.reboundYPx}px`);
    card.style.setProperty("--splat-card-settle-y", `${profile.settleYPx}px`);
    card.style.setProperty("--splat-card-final-y", `${profile.finalYPx}px`);
    card.style.setProperty(
      "--splat-card-rotate-first",
      `${profile.firstRotateDeg}deg`,
    );
    card.style.setProperty(
      "--splat-card-rotate-second",
      `${profile.secondRotateDeg}deg`,
    );
    card.style.setProperty(
      "--splat-card-rotate-third",
      `${profile.thirdRotateDeg}deg`,
    );
    card.style.setProperty(
      "--splat-card-rotate-fourth",
      `${profile.fourthRotateDeg}deg`,
    );
    card.style.setProperty(
      "--splat-card-origin-x",
      `${profile.originXPercent}%`,
    );
    card.style.setProperty(
      "--splat-card-origin-y",
      `${profile.originYPercent}%`,
    );
  }

  globalThis.PacePetsDashboardSplatFallProfile = Object.freeze({
    applyCardImpactProfile,
    clearCardImpact,
    extremeCardImpactProfile,
    extremeRatioSlamProfile,
    maxIntroCardImpactProfile,
    randomCardImpactProfile,
    randomRatioBounceProfile,
  });
})();

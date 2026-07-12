(() => {
  "use strict";

  const PROFILE = globalThis.PacePetsDashboardSplatFallProfile;
  if (!PROFILE) {
    throw new Error(
      "Splat profiles must load before dashboard-splat-entry-playback.js.",
    );
  }

  const MAX_SPLAT_FALL_TIMING = Object.freeze({
    cleanupMs: 720,
    durationMs: 720,
    impactMs: 576,
  });
  const ALWAYS_RARE_MAX_TIME_REMAINING_DISPLAY_PERCENT = 50;

  function usableRect(rect) {
    return (
      rect &&
      Number.isFinite(rect.height) &&
      Number.isFinite(rect.left) &&
      Number.isFinite(rect.top) &&
      Number.isFinite(rect.width) &&
      rect.height > 0 &&
      rect.width > 0
    );
  }

  function shouldForceRareMax(controller) {
    const timePercent = PacePetsLogic.roundedDisplayPercent(
      controller.currentPaceSummaryTimePercent,
    );
    return (
      timePercent !== null &&
      timePercent > ALWAYS_RARE_MAX_TIME_REMAINING_DISPLAY_PERCENT
    );
  }

  function ratioOriginRect(controller) {
    const ratioRect =
      controller.elements.paceRatioValue?.getBoundingClientRect();
    return usableRect(ratioRect)
      ? {
          height: ratioRect.height,
          left: ratioRect.left,
          top: ratioRect.top,
          width: ratioRect.width,
        }
      : null;
  }

  function regularImpactProfile(controller, mode) {
    return {
      card: PROFILE.randomCardImpactProfile(controller),
      ratio:
        mode === PROFILE.SPLAT_ENTRY_MODES.maxNormal
          ? PROFILE.maxNormalRatioBounceProfile(controller)
          : PROFILE.normalRatioBounceProfile(controller),
    };
  }

  function rareMaxPlayback(controller) {
    return {
      captureRatioOriginBeforeImpact: true,
      fallTiming: MAX_SPLAT_FALL_TIMING,
      impactProfile: {
        card: PROFILE.maxIntroCardImpactProfile(),
        ratio: null,
      },
      onImpact: () => controller.queueSplatMaxBounceSlam?.(),
    };
  }

  function resolve(controller, { fallTiming, impactProfile, onImpact }) {
    if (impactProfile) {
      return { fallTiming, impactProfile, onImpact };
    }

    const mode = shouldForceRareMax(controller)
      ? PROFILE.SPLAT_ENTRY_MODES.rareMax
      : PROFILE.selectSplatEntryMode(controller);
    if (mode === PROFILE.SPLAT_ENTRY_MODES.rareMax) {
      return rareMaxPlayback(controller);
    }

    return {
      fallTiming,
      impactProfile: regularImpactProfile(controller, mode),
      onImpact,
    };
  }

  globalThis.PacePetsDashboardSplatEntryPlayback = Object.freeze({
    maxSplatFallTiming: MAX_SPLAT_FALL_TIMING,
    ratioOriginRect,
    resolve,
  });
})();

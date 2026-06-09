(() => {
  "use strict";

  const PACE_STATES = PacePetsLogic.PACE_STATES;
  const PACE_CLASSES = PacePetsLogic.PACE_CLASS_NAMES;
  const PACE_STATE_GROUPS = PacePetsLogic.PACE_STATE_GROUPS_BY_KEY;
  const THEME_ASSETS = globalThis.CodexThemeAssets;
  if (!THEME_ASSETS) {
    throw new Error(
      "Codex theme assets must load before dashboard-pace-data.js.",
    );
  }

  globalThis.PacePetsDashboardPaceData = Object.freeze({
    BRAKE_WOBBLE_DURATION_MS_BY_SHAKE_COUNT: Object.freeze({
      1: 320,
      2: 520,
      3: 720,
    }),
    BRAKE_DEBRIS_BURST_PROFILES: Object.freeze({
      escape: Object.freeze({
        ANGLE_RANGE_DEG: Object.freeze([158, 382]),
        COUNT_RANGE: Object.freeze([26, 38]),
        CURVE_DRIFT_RANGE_PX: Object.freeze([-130, 130]),
        CURVE_LIFT_RANGE_PX: Object.freeze([80, 210]),
        DELAY_RANGE_MS: Object.freeze([0, 170]),
        DURATION_RANGE_MS: Object.freeze([2400, 3400]),
        FALL_DRIFT_RANGE_PX: Object.freeze([-150, 150]),
        FALL_OVERSHOOT_RANGE_PX: Object.freeze([110, 260]),
        LAUNCH_RADIUS_RANGE_PX: Object.freeze([135, 380]),
        ORIGIN_JITTER_RANGE_PX: Object.freeze([-24, 24]),
        SIZE_RANGE_PX: Object.freeze([5, 14]),
        SPIN_RANGE_DEG: Object.freeze([-980, 980]),
      }),
      wide: Object.freeze({
        ANGLE_RANGE_DEG: Object.freeze([185, 355]),
        COUNT_RANGE: Object.freeze([6, 10]),
        CURVE_DRIFT_RANGE_PX: Object.freeze([-58, 58]),
        CURVE_LIFT_RANGE_PX: Object.freeze([54, 132]),
        DELAY_RANGE_MS: Object.freeze([0, 110]),
        DURATION_RANGE_MS: Object.freeze([1900, 2650]),
        FALL_DRIFT_RANGE_PX: Object.freeze([-78, 78]),
        FALL_OVERSHOOT_RANGE_PX: Object.freeze([92, 180]),
        LAUNCH_RADIUS_RANGE_PX: Object.freeze([82, 172]),
        ORIGIN_JITTER_RANGE_PX: Object.freeze([-14, 14]),
        SIZE_RANGE_PX: Object.freeze([6, 12]),
        SPIN_RANGE_DEG: Object.freeze([-520, 520]),
      }),
    }),
    BRAKE_WOBBLE_INITIAL_DELAY_RANGE_MS: Object.freeze([650, 1400]),
    BRAKE_WOBBLE_REPEAT_DELAY_RANGE_MS: Object.freeze([1600, 3400]),
    BRAKE_WOBBLE_WIDE_BURST_INTERVAL_RANGE: Object.freeze([2, 4]),
    MUTED_PACE_CLASS: PACE_STATES.muted.className,
    PACE_CLASSES,
    PACE_ICON_EFFECTS_BY_STATE: Object.freeze({
      [PACE_STATES.wellAhead.key]: "sprint-smoke",
      [PACE_STATES.ahead.key]: "speed-lines",
      [PACE_STATES.on.key]: "train-roll",
      [PACE_STATES.criticalBehind.key]: "brake-wobble",
      [PACE_STATES.splat.key]: "splat-fall",
    }),
    SPRINT_BOUNCE_PROFILE_DELAY_RANGE_MS: Object.freeze([700, 1500]),
    SPRINT_SPEED_BUMP_DELAY_RANGE_MS: Object.freeze([8000, 12000]),
    SPRINT_SPEED_BUMP_DURATION_MS: 920,
    SPRINT_SMOKE_VARIATION: Object.freeze({
      BLUR_JITTER_CENTIPX: Object.freeze([-4, 4]),
      DRIFT_X_JITTER_PX: Object.freeze([-4, 4]),
      DRIFT_Y_JITTER_PX: Object.freeze([-2, 2]),
      END_SCALE_JITTER_PERCENT: Object.freeze([-5, 5]),
      MID_OPACITY_JITTER_PERCENT: Object.freeze([-5, 5]),
      PEAK_OPACITY_JITTER_PERCENT: Object.freeze([-4, 4]),
      Y_OFFSET_JITTER_PX: Object.freeze([-2, 2]),
    }),
    PACE_LEVEL_LEGEND_STATE_KEYS: PACE_STATE_GROUPS.paceLevels.displayStateKeys,
    PACE_PERFECT_LEGEND_STATE_KEYS:
      PACE_STATE_GROUPS.perfectStates.displayStateKeys,
    PACE_IMPERFECT_LEGEND_STATE_KEYS:
      PACE_STATE_GROUPS.imperfectStates.displayStateKeys,
    PACE_STATES,
    SINGULARITY_RESET_COUNTDOWN_TEXT: "0d 0h 0m",
    SPLAT_FREE_FALL_IMAGE: THEME_ASSETS.paceIconVariantPath("splatFreeFall"),
    USE_PLAYFUL_PACE_ICONS: true,
  });
})();

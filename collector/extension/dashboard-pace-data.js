(() => {
  "use strict";

  const PACE_STATES = PacePetsLogic.PACE_STATES;
  const PACE_CLASSES = PacePetsLogic.PACE_CLASS_NAMES;
  const PACE_STATE_GROUPS = PacePetsLogic.PACE_STATE_GROUPS_BY_KEY;
  const THEME_ASSETS = globalThis.CodexThemeAssets;
  const SPRINT_INTENSITY = globalThis.PacePetsSprintIntensity;
  if (!SPRINT_INTENSITY || !THEME_ASSETS) {
    throw new Error(
      "Sprint intensity and theme assets must load before dashboard-pace-data.js.",
    );
  }

  globalThis.PacePetsDashboardPaceData = Object.freeze({
    BRAKE_WOBBLE_DURATION_MS_BY_SHAKE_COUNT: Object.freeze({
      1: 320,
      2: 520,
      3: 720,
      4: 980,
      5: 1200,
    }),
    BRAKE_WOBBLE_EXTREME_SHAKE_COUNT_RANGE: Object.freeze([4, 5]),
    BRAKE_WOBBLE_SHAKE_COUNT_RANGE: Object.freeze([1, 3]),
    BRAKE_WOBBLE_BURST_CHANCES_PERCENT: Object.freeze([
      Object.freeze({ rangeKey: "normal", chancePercent: 60 }),
      Object.freeze({ rangeKey: "wide", chancePercent: 25 }),
      Object.freeze({ rangeKey: "escape", chancePercent: 12 }),
      Object.freeze({ rangeKey: "extreme", chancePercent: 3 }),
    ]),
    BRAKE_EXTREME_CANVAS_BURST_PROFILE: Object.freeze({
      ANGLE_RANGE_DEG: Object.freeze([145, 395]),
      COUNT_RANGE: Object.freeze([5000, 10000]),
      DELAY_RANGE_MS: Object.freeze([0, 240]),
      DPR_MAX: 2,
      DRIFT_RANGE_PX_PER_SECOND: Object.freeze([-85, 85]),
      DURATION_RANGE_MS: Object.freeze([2700, 3900]),
      GRAVITY_RANGE_PX_PER_SECOND_SQUARED: Object.freeze([520, 1120]),
      ORIGIN_JITTER_RANGE_PX: Object.freeze([-26, 26]),
      SIZE_RANGE_PX: Object.freeze([1, 5]),
      SPEED_RANGE_PX_PER_SECOND: Object.freeze([360, 1360]),
      SPIN_RANGE_DEG_PER_SECOND: Object.freeze([-920, 920]),
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
    MUTED_PACE_CLASS: PACE_STATES.muted.className,
    PACE_CLASSES,
    PACE_ICON_EFFECTS_BY_STATE: Object.freeze({
      [PACE_STATES.wellAhead.key]: "sprint-smoke",
      [PACE_STATES.strongAhead.key]: "push-stretch",
      [PACE_STATES.ahead.key]: "speed-lines",
      [PACE_STATES.on.key]: "train-roll",
      [PACE_STATES.behind.key]: "ease-up",
      [PACE_STATES.wellBehind.key]: "slow-wobble",
      [PACE_STATES.criticalBehind.key]: "brake-wobble",
      [PACE_STATES.splat.key]: "splat-fall",
    }),
    SLOW_WOBBLE_DELAY_RANGE_MS: Object.freeze([4000, 6000]),
    SLOW_WOBBLE_DURATION_MS: 1150,
    SLOW_WOBBLE_EXTREME_CHANCE: 0.15,
    SPRINT_INTENSITY: Object.freeze({
      BOUNCE_DURATION_SCALE_RANGE: Object.freeze([1, 0.5]),
      RATIO_RANGE: SPRINT_INTENSITY.RATIO_RANGE,
      SMOKE_DRIFT_X_SCALE_RANGE: Object.freeze([1, 2.2]),
      SMOKE_DRIFT_Y_SCALE_RANGE: Object.freeze([1, 1.55]),
      SMOKE_DURATION_SCALE_RANGE: Object.freeze([1, 0.58]),
      SMOKE_END_SCALE_BONUS_RANGE: Object.freeze([0, 0.28]),
      SMOKE_MID_OPACITY_BONUS_RANGE: Object.freeze([0, 0.14]),
      SMOKE_PEAK_OPACITY_BONUS_RANGE: Object.freeze([0, 0.08]),
      SPEED_BUMP_DELAY_RANGE_MS: Object.freeze([2400, 4600]),
      SPEED_BUMP_DROP_SCALE_RANGE: Object.freeze([1, 1.45]),
      SPEED_BUMP_DURATION_MS: 520,
      SPEED_BUMP_LIFT_SCALE_RANGE: Object.freeze([1, 2.7]),
      SPEED_BUMP_TILT_SCALE_RANGE: Object.freeze([1, 1.25]),
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

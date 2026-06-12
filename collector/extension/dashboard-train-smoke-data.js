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
    FIRST_CONTROL_X_OFFSET_PX: Object.freeze([-58, -34]),
    FIRST_CONTROL_Y_OFFSET_PX: Object.freeze([-58, -34]),
    MIN_END_Y_PX: -180,
    SECOND_CONTROL_X_PX: Object.freeze([-236, -190]),
    SECOND_CONTROL_Y_PERCENT: Object.freeze([50, 66]),
    SPIN_DEG: Object.freeze([18, 34]),
    START_PROGRESS: 0.58,
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

  globalThis.PacePetsDashboardTrainSmokeData = Object.freeze({
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
  });
})();

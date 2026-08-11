((root) => {
  "use strict";

  const Geometry = root.PacePetsDashboardPushStretchGeometry;
  if (!Geometry) {
    throw new Error(
      "Pace push stretch geometry must load before push sweat data.",
    );
  }

  const ICON_CSS_SIZE = 96;
  const MIN_STROKE_WIDTH_PX = 1.2;

  const EXTREME_VARIATION = Object.freeze({
    angle: 0.13,
    lift: 0.16,
    size: 0.12,
    spin: 0.04,
    start: 0.045,
    sway: 0.012,
    travel: 0.05,
  });
  const NORMAL_VARIATION = Object.freeze({
    angle: 0.09,
    lift: 0.08,
    size: 0.13,
    spin: 0.025,
    start: 0.035,
    sway: 0.012,
    travel: 0.14,
  });
  const SWEAT_ORIGIN = Object.freeze({ x: 0.69, y: 0.18 });

  function track([
    angle,
    duration,
    fallY,
    lift,
    opacity,
    size,
    spin,
    start,
    sway,
    travelX,
  ]) {
    return Object.freeze({
      angle,
      duration,
      emitter: SWEAT_ORIGIN,
      fallY,
      lift,
      opacity,
      size,
      spin,
      start,
      sway,
      travelX,
    });
  }

  const NORMAL_TRACKS = Object.freeze(
    [
      [0.88, 0.72, 0.18, 0.3, 0.9, 0.048, 0.05, 0.2, 0.032, 0.92],
      [1.02, 0.7, 0.2, 0.28, 0.86, 0.043, -0.04, 0.3, 0.044, 1.02],
      [0.78, 0.66, 0.22, 0.32, 0.82, 0.04, 0.04, 0.4, 0.038, 1],
      [1.12, 0.6, 0.2, 0.24, 0.72, 0.035, -0.03, 0.5, 0.036, 1.16],
      [0.94, 0.58, 0.24, 0.26, 0.68, 0.032, 0.03, 0.6, 0.034, 1.06],
    ].map(track),
  );
  const EXTREME_TRACKS = Object.freeze(
    [
      [0.76, 0.96, 0.34, 0.66, 0.94, 0.052, 0.06, 0.12, 0.026, 1.08],
      [1.18, 0.92, 0.2, 0.34, 0.9, 0.049, -0.08, 0.16, 0.074, 1.96],
      [0.84, 0.9, 0.32, 0.54, 0.88, 0.046, 0.04, 0.2, 0.03, 1.06],
      [1.04, 0.8, 0.18, 0.24, 0.78, 0.038, -0.05, 0.24, 0.05, 1.5],
      [1.3, 0.84, 0.22, 0.4, 0.82, 0.041, -0.06, 0.28, 0.068, 2.08],
      [0.68, 0.92, 0.38, 0.64, 0.8, 0.037, 0.04, 0.32, 0.022, 1.04],
      [1.1, 0.8, 0.2, 0.3, 0.76, 0.034, -0.04, 0.36, 0.06, 1.68],
      [0.9, 0.76, 0.32, 0.46, 0.74, 0.033, 0.03, 0.4, 0.034, 1.24],
      [1.38, 0.72, 0.16, 0.22, 0.7, 0.031, -0.03, 0.44, 0.074, 2.16],
      [0.78, 0.78, 0.42, 0.58, 0.72, 0.034, 0.04, 0.48, 0.028, 1.2],
      [1.22, 0.68, 0.22, 0.28, 0.68, 0.029, -0.04, 0.52, 0.062, 1.82],
      [1, 0.66, 0.34, 0.38, 0.64, 0.028, 0.03, 0.56, 0.04, 1.34],
      [1.42, 0.62, 0.18, 0.2, 0.6, 0.026, -0.02, 0.6, 0.07, 2.2],
      [0.72, 0.64, 0.46, 0.52, 0.58, 0.027, 0.02, 0.64, 0.026, 1.12],
      [1.16, 0.58, 0.28, 0.28, 0.54, 0.025, -0.02, 0.68, 0.048, 1.54],
      [0.88, 0.54, 0.38, 0.34, 0.5, 0.024, 0.02, 0.72, 0.028, 1.1],
    ].map(track),
  );
  const LEVEL_CONFIGS = Object.freeze({
    extreme: Object.freeze({
      countRange: Object.freeze([4, 6]),
      salt: 0x7f4a7c15,
      sizeBoost: 0.58,
      sourceTracks: EXTREME_TRACKS,
      trailPhase: 0.34,
      variation: EXTREME_VARIATION,
    }),
    normal: Object.freeze({
      countRange: Object.freeze([1, 3]),
      salt: 0x9e3779b9,
      sizeBoost: 0.32,
      sourceTracks: NORMAL_TRACKS,
      trailPhase: 0.24,
      variation: NORMAL_VARIATION,
    }),
    rare: Object.freeze({
      countRange: Object.freeze([75, 125]),
      salt: 0x85ebca6b,
      sizeBoost: 0.95,
      sourceTracks: EXTREME_TRACKS,
      trailPhase: 0.44,
      variation: EXTREME_VARIATION,
    }),
  });

  function configForLevel(level) {
    return LEVEL_CONFIGS[level] || LEVEL_CONFIGS.normal;
  }

  function maxVaried(property, variationProperty, multiplier = false) {
    let maximum = 0;
    for (const config of Object.values(LEVEL_CONFIGS)) {
      for (const source of config.sourceTracks) {
        const variation = config.variation[variationProperty];
        const value = multiplier
          ? source[property] * (1 + variation)
          : source[property] + variation;
        maximum = Math.max(maximum, value);
      }
    }
    return maximum;
  }

  function createSurfaceBounds() {
    const emitter = Geometry.boundsForPoint(SWEAT_ORIGIN);
    const unit = Geometry.IMAGE_RECT.size;
    const maxBoost = Math.max(
      ...Object.values(LEVEL_CONFIGS).map((config) => config.sizeBoost),
    );
    const maxDropSize =
      maxVaried("size", "size", true) * (1 + maxBoost) * unit * 1.08;
    const dropRadius = maxDropSize * 1.16;
    const strokeRadius = Math.max(
      maxDropSize * 0.1,
      MIN_STROKE_WIDTH_PX / 2 / ICON_CSS_SIZE,
    );
    const padding = strokeRadius + 1 / ICON_CSS_SIZE;
    const maxLift = maxVaried("lift", "lift", true);
    const maxSway = maxVaried("sway", "sway");
    const maxTravel = maxVaried("travelX", "travel", true);
    return Object.freeze({
      bottom: emitter.bottom + dropRadius + padding,
      bottomPadding: dropRadius + padding,
      left: emitter.left - maxSway * unit - dropRadius - padding,
      right:
        emitter.right + (maxTravel + maxSway) * unit + dropRadius + padding,
      top: emitter.top - maxLift * unit - dropRadius - padding,
    });
  }

  root.PacePetsDashboardPushSweatData = Object.freeze({
    LEVEL_CONFIGS,
    SURFACE_BOUNDS: createSurfaceBounds(),
    configForLevel,
  });
})(globalThis);

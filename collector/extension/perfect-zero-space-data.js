(function attachPacePetsPerfectZeroSpaceData(root) {
  "use strict";

  const DEFAULT_PROFILE_KEY = "icon";
  const FULL_BLEED_PROFILE_KEY = "fullBleed";
  const PROFILE_KEYS = Object.freeze({
    fullBleed: FULL_BLEED_PROFILE_KEY,
    icon: DEFAULT_PROFILE_KEY,
  });
  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  const SCENE_DEFAULTS = Object.freeze({
    background: "#020617",
    cometDelayMaxMs: 18000,
    cometDelayMinMs: 8000,
    cometDurationMaxMs: 1150,
    cometDurationMinMs: 760,
    cometTailMaxLength: 38,
    cometTailMinLength: 22,
    densityReferenceArea: 96 * 96,
    fallbackSize: 96,
    asteroidCount: 5,
    asteroidCountRangeMax: null,
    asteroidSizeMaxMultiplier: 0.78,
    asteroidSizeMinMultiplier: 0.65,
    asteroidSpeedMaxMultiplier: 1,
    featuredPlanets: Object.freeze([]),
    maxAsteroidCount: 5,
    maxPixelRatio: 2,
    maxSparkleCount: 8,
    maxStarCount: 44,
    planetCount: 1,
    planetCountRangeMax: null,
    maxPlanetCount: 1,
    planetSizeMaxMultiplier: 1.25,
    planetSpeedMultiplier: 0.35,
    scaleCountsWithArea: false,
    shapeMaxOpacity: 0.2,
    shapeMinOpacity: 0.07,
    shapeMaxSize: 18,
    shapeMinSize: 9,
    shapeSpeedMaxPxPerSecond: 38,
    shapeSpeedMinPxPerSecond: 8,
    shapeSpeedSkewStrength: 10,
    sparkleCount: 8,
    starCount: 44,
    superSparkleRatio: 0.05,
  });
  const SCENE_FRAME_DEFAULTS = Object.freeze({
    edgeGlow: "rgba(148, 163, 184, 0.16)",
    heightRatio: 0.88,
    insetXRatio: 0.02,
    insetYRatio: 0.06,
    radiusRatio: 0.18,
    type: "roundedInset",
    widthRatio: 0.96,
  });
  const SCENE_GRADIENT_DEFAULTS = Object.freeze({
    centerXRatio: 0.34,
    centerYRatio: 0.25,
    innerColor: "#111827",
    middleColor: null,
    middleStop: 0.7,
    outerColor: "rgba(2, 6, 23, 0.72)",
    outerXRatio: 0.5,
    outerYRatio: 0.52,
    radiusRatio: 0.6,
  });
  const SCENE_PROFILES = Object.freeze({
    [DEFAULT_PROFILE_KEY]: Object.freeze({}),
    [FULL_BLEED_PROFILE_KEY]: Object.freeze({
      frame: Object.freeze({
        edgeGlow: null,
        type: "fullBleed",
      }),
      asteroidSizeMaxMultiplier: 1.17,
      asteroidSpeedMaxMultiplier: 1.25,
      maxPixelRatio: 1.25,
      maxAsteroidCount: 17,
      maxPlanetCount: 7,
      maxSparkleCount: 36,
      maxStarCount: 180,
      planetCount: 5,
      planetCountRangeMax: 7,
      planetSizeMaxMultiplier: 1.875,
      scaleCountsWithArea: true,
    }),
  });
  const RING_BACK_BRIGHTEN_RATIO = 0.66;
  const RING_FRONT_BRIGHTEN_RATIO = 0.92;
  const PLANET_STROKE_BRIGHTEN_RATIO = 0.52;
  const PLANET_TYPES = Object.freeze([
    "spherePlanet",
    "ringedPlanet",
    "bandedPlanet",
    "crateredPlanet",
    "eclipsePlanet",
  ]);
  const PLANET_TYPES_SET = new Set(PLANET_TYPES);

  function brightenHexColor(hexColor, ratio) {
    const normalized = hexColor.replace("#", "");
    if (normalized.length !== 6) {
      return hexColor;
    }

    const value = Number.parseInt(normalized, 16);
    if (Number.isNaN(value)) {
      return hexColor;
    }

    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    const brightenChannel = (channel) =>
      Math.round(channel + (255 - channel) * ratio)
        .toString(16)
        .padStart(2, "0");

    return `#${brightenChannel(red)}${brightenChannel(green)}${brightenChannel(
      blue,
    )}`;
  }

  const PLANETS = Object.freeze([
    Object.freeze({
      type: "spherePlanet",
      accent: "#e0f2fe",
      fill: "#38bdf8",
      shade: "#0e7490",
      stroke: "#bae6fd",
    }),
    Object.freeze({
      type: "spherePlanet",
      accent: "#ccfbf1",
      fill: "#2dd4bf",
      shade: "#0f766e",
      stroke: "#99f6e4",
    }),
    Object.freeze({
      type: "spherePlanet",
      accent: "#fce7f3",
      fill: "#fb7185",
      shade: "#be123c",
      stroke: "#ffe4e6",
    }),
    Object.freeze({
      type: "ringedPlanet",
      fill: "#ef4444",
    }),
    Object.freeze({
      type: "ringedPlanet",
      fill: "#38bdf8",
    }),
    Object.freeze({
      type: "ringedPlanet",
      fill: "#a78bfa",
    }),
    Object.freeze({
      type: "ringedPlanet",
      fill: "#facc15",
    }),
    Object.freeze({
      type: "bandedPlanet",
      accent: "#f97316",
      band: "#fde68a",
      fill: "#f59e0b",
      spot: "#b45309",
      stroke: "#fef3c7",
    }),
    Object.freeze({
      type: "bandedPlanet",
      accent: "#8b5cf6",
      band: "#e9d5ff",
      fill: "#c084fc",
      spot: "#7c3aed",
      stroke: "#f5d0fe",
    }),
    Object.freeze({
      type: "bandedPlanet",
      accent: "#2563eb",
      band: "#bfdbfe",
      fill: "#60a5fa",
      spot: "#1d4ed8",
      stroke: "#dbeafe",
    }),
    Object.freeze({
      type: "bandedPlanet",
      accent: "#fb7185",
      band: "#fecdd3",
      fill: "#f472b6",
      spot: "#be123c",
      stroke: "#ffe4e6",
    }),
    Object.freeze({
      type: "crateredPlanet",
      accent: "#cbd5e1",
      fill: "#64748b",
      shade: "#334155",
      stroke: "#e2e8f0",
    }),
    Object.freeze({
      type: "crateredPlanet",
      accent: "#bfdbfe",
      fill: "#60a5fa",
      shade: "#1d4ed8",
      stroke: "#dbeafe",
    }),
    Object.freeze({
      type: "crateredPlanet",
      accent: "#ccfbf1",
      fill: "#14b8a6",
      shade: "#0f766e",
      stroke: "#99f6e4",
    }),
    Object.freeze({
      type: "eclipsePlanet",
      accent: "#67e8f9",
      fill: "#0f172a",
      shade: "#020617",
      stroke: "#a5f3fc",
    }),
    Object.freeze({
      type: "eclipsePlanet",
      accent: "#ddd6fe",
      fill: "#1e1b4b",
      shade: "#0f172a",
      stroke: "#c4b5fd",
    }),
  ]);
  const ASTEROIDS = Object.freeze([
    Object.freeze({
      type: "asteroid",
      accent: "#f8fafc",
      fill: "#475569",
      stroke: "#f8fafc",
    }),
    Object.freeze({
      type: "asteroid",
      accent: "#e0f2fe",
      fill: "#334155",
      stroke: "#e0f2fe",
    }),
    Object.freeze({
      type: "asteroid",
      accent: "#ddd6fe",
      fill: "#3f4b5a",
      stroke: "#f1f5f9",
    }),
  ]);

  function asteroidStyleForIndex(index) {
    return ASTEROIDS[index % ASTEROIDS.length];
  }

  function isAsteroidStyle(style) {
    return style.type === "asteroid";
  }

  function isPlanetStyle(style) {
    return PLANET_TYPES_SET.has(style.type);
  }

  function planetStyleFromDefinition(style) {
    const stroke =
      style.stroke ||
      brightenHexColor(style.fill, PLANET_STROKE_BRIGHTEN_RATIO);
    const accent =
      style.accent || brightenHexColor(style.fill, RING_FRONT_BRIGHTEN_RATIO);

    return {
      ...style,
      accent,
      planetStroke: stroke,
      rearRingStroke: brightenHexColor(style.fill, RING_BACK_BRIGHTEN_RATIO),
      ringStroke: brightenHexColor(style.fill, RING_FRONT_BRIGHTEN_RATIO),
      shade:
        style.shade ||
        brightenHexColor(style.fill, PLANET_STROKE_BRIGHTEN_RATIO * 0.42),
      stroke,
    };
  }

  function planetStyleCandidates(type) {
    if (!PLANET_TYPES_SET.has(type)) {
      return PLANETS;
    }

    const candidates = PLANETS.filter((style) => style.type === type);
    return candidates.length > 0 ? candidates : PLANETS;
  }

  function planetStyleForIndex(
    index,
    { previousType = null, type = null } = {},
  ) {
    const candidates = planetStyleCandidates(type);
    const nonRepeatingCandidates = candidates.filter(
      (style) => style.type !== previousType,
    );
    const pool =
      nonRepeatingCandidates.length > 0 ? nonRepeatingCandidates : candidates;
    const style =
      pool[(index + Math.floor(Math.random() * pool.length)) % pool.length];

    return planetStyleFromDefinition(style);
  }

  root.PacePetsPerfectZeroSpaceData = Object.freeze({
    DEFAULT_PROFILE_KEY,
    PLANET_TYPES_SET,
    PROFILE_KEYS,
    REDUCED_MOTION_QUERY,
    SCENE_DEFAULTS,
    SCENE_FRAME_DEFAULTS,
    SCENE_GRADIENT_DEFAULTS,
    SCENE_PROFILES,
    asteroidStyleForIndex,
    brightenHexColor,
    isAsteroidStyle,
    isPlanetStyle,
    planetStyleForIndex,
  });
})(globalThis);

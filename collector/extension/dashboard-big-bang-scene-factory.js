(function attachPacePetsDashboardBigBangSceneFactory(root) {
  "use strict";

  const ENERGY_COLORS = Object.freeze([
    "255, 255, 255",
    "254, 243, 199",
    "250, 204, 21",
    "251, 146, 60",
    "125, 211, 252",
    "196, 181, 253",
  ]);
  const STAR_COLORS = Object.freeze([
    "255, 255, 255",
    "186, 230, 253",
    "253, 230, 138",
    "251, 207, 232",
    "196, 181, 253",
    "153, 246, 228",
  ]);
  const PLUME_COLORS = Object.freeze([
    "226, 232, 240",
    "203, 213, 225",
    "254, 243, 199",
    "251, 191, 36",
    "251, 146, 60",
    "125, 211, 252",
    "196, 181, 253",
  ]);
  const EJECTA_COUNT_BASE = 340;
  const EJECTA_COUNT_MAX = 720;
  const TWO_PI = Math.PI * 2;
  const PARTICLE_KIND_SETTINGS = Object.freeze({
    dust: Object.freeze({
      colorSet: STAR_COLORS,
      curlRange: Object.freeze([-54, 54]),
      delayRange: Object.freeze([980, 2250]),
      distanceRange: Object.freeze([0.64, 1.34]),
      distanceSource: "edgeRadius",
      opacityRange: Object.freeze([0.07, 0.26]),
      overshootRange: Object.freeze([0.04, 0.34]),
      sizeRange: Object.freeze([0.45, 1.35]),
      travelRange: Object.freeze([2200, 5000]),
    }),
    spark: Object.freeze({
      colorSet: ENERGY_COLORS,
      curlRange: Object.freeze([-18, 18]),
      delayRange: Object.freeze([110, 500]),
      distanceRange: Object.freeze([0.045, 0.17]),
      distanceSource: "minEdge",
      opacityRange: Object.freeze([0.38, 0.78]),
      overshootRange: Object.freeze([0.08, 0.2]),
      sizeRange: Object.freeze([0.65, 2.0]),
      travelRange: Object.freeze([260, 760]),
    }),
    star: Object.freeze({
      colorSet: STAR_COLORS,
      curlRange: Object.freeze([-54, 54]),
      delayRange: Object.freeze([980, 1780]),
      distanceRange: Object.freeze([0.36, 1.16]),
      distanceSource: "edgeRadius",
      opacityRange: Object.freeze([0.36, 0.95]),
      overshootRange: Object.freeze([0.04, 0.2]),
      sizeRange: Object.freeze([0.7, 2.25]),
      travelRange: Object.freeze([2500, 5400]),
    }),
  });

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomBetween(random, min, max) {
    return min + random() * (max - min);
  }

  function randomInteger(random, min, max) {
    return Math.floor(randomBetween(random, min, max + 1));
  }

  function colorChoice(random, colors) {
    return colors[randomInteger(random, 0, colors.length - 1)];
  }

  function countForArea(width, height, base, max) {
    const areaScale = Math.sqrt(Math.max(1, width * height) / (820 * 720));
    return Math.min(max, Math.max(base, Math.round(base * areaScale)));
  }

  function createEnergyRay(random, index) {
    return {
      angle: random() * TWO_PI,
      color: colorChoice(random, ENERGY_COLORS),
      delayMs: randomBetween(random, 1080, 1640),
      lengthRatio: randomBetween(random, 0.44, 1.08),
      opacity: randomBetween(random, 0.12, 0.38),
      phase: random() * TWO_PI,
      travelMs: randomBetween(random, 640, 1360),
      width: randomBetween(random, 0.024, 0.078),
      wobble: randomBetween(random, 0.01, 0.04),
      index,
    };
  }

  function createShockArc(random, index) {
    return {
      angle: random() * TWO_PI,
      color: colorChoice(random, ENERGY_COLORS),
      delayMs: randomBetween(random, 1200, 2080),
      lineWidth: randomBetween(random, 2.4, 14),
      opacity: randomBetween(random, 0.12, 0.42),
      phase: random() * TWO_PI,
      radiusRatio: randomBetween(random, 0.46, 0.94),
      span: randomBetween(random, 0.16, 0.56),
      travelMs: randomBetween(random, 900, 1900),
      index,
    };
  }

  function createIgnitionDot(random, index) {
    return {
      angle: random() * TWO_PI,
      color: colorChoice(random, ENERGY_COLORS),
      delayMs: randomBetween(random, 0, 260),
      distanceRatio: randomBetween(random, 0.01, 0.072),
      durationMs: randomBetween(random, 420, 980),
      opacity: randomBetween(random, 0.1, 0.42),
      phase: random() * TWO_PI,
      sizeRatio: randomBetween(random, 0.0012, 0.0062),
      index,
    };
  }

  function createIgnitionPlume(random, index) {
    const armCount = 11;
    const armAngle = ((index % armCount) / armCount) * TWO_PI;
    return {
      angle: armAngle + randomBetween(random, -0.28, 0.28),
      color: colorChoice(random, PLUME_COLORS),
      curlRatio: randomBetween(random, -0.035, 0.035),
      delayMs: randomBetween(random, 50, 360),
      distanceRatio: randomBetween(random, 0.016, 0.118),
      durationMs: randomBetween(random, 860, 1360),
      flatten: randomBetween(random, 0.62, 1.18),
      index,
      lobeCount: randomInteger(random, 3, 5),
      opacity: randomBetween(random, 0.07, 0.18),
      phase: random() * TWO_PI,
      rimColor: colorChoice(random, ENERGY_COLORS),
      roll: randomBetween(random, -0.48, 0.48),
      rollDirection: random() < 0.5 ? -1 : 1,
      sizeRatio: randomBetween(random, 0.0075, 0.021),
      turbulence: randomBetween(random, 0.42, 1.08),
    };
  }

  function createEjecta(random, width, height, index) {
    const centerX = width * randomBetween(random, 0.48, 0.52);
    const centerY = height * randomBetween(random, 0.46, 0.54);
    const angle = random() * TWO_PI;
    const distance = Math.max(width, height) * randomBetween(random, 0.2, 1.08);
    return {
      angle,
      color: colorChoice(random, STAR_COLORS),
      delayMs: randomBetween(random, 620, 2400),
      finalOpacity: randomBetween(random, 0.07, 0.38),
      finalX: clamp(centerX + Math.cos(angle) * distance, -18, width + 18),
      finalY: clamp(centerY + Math.sin(angle) * distance, -18, height + 18),
      index,
      originX: centerX + randomBetween(random, -10, 10),
      originY: centerY + randomBetween(random, -10, 10),
      phase: random() * TWO_PI,
      size: randomBetween(random, 0.38, 1.75),
      travelMs: randomBetween(random, 2400, 6200),
    };
  }

  function createParticle(random, width, height, index, kind) {
    const settings =
      PARTICLE_KIND_SETTINGS[kind] ?? PARTICLE_KIND_SETTINGS.star;
    const centerX = width * randomBetween(random, 0.48, 0.52);
    const centerY = height * randomBetween(random, 0.45, 0.53);
    const angle = random() * Math.PI * 2;
    const minEdge = Math.min(width, height);
    const maxEdge = Math.max(width, height);
    const edgeRadius = maxEdge * randomBetween(random, 0.48, 0.84);
    const distanceSource =
      settings.distanceSource === "minEdge" ? minEdge : edgeRadius;
    const distance =
      distanceSource *
      randomBetween(
        random,
        settings.distanceRange[0],
        settings.distanceRange[1],
      );

    return {
      angle,
      color: colorChoice(random, settings.colorSet),
      curl: randomBetween(random, settings.curlRange[0], settings.curlRange[1]),
      delayMs: randomBetween(
        random,
        settings.delayRange[0],
        settings.delayRange[1],
      ),
      finalOpacity: randomBetween(
        random,
        settings.opacityRange[0],
        settings.opacityRange[1],
      ),
      finalX: clamp(centerX + Math.cos(angle) * distance, -24, width + 24),
      finalY: clamp(centerY + Math.sin(angle) * distance, -24, height + 24),
      index,
      kind,
      originX: centerX + randomBetween(random, -8, 8),
      originY: centerY + randomBetween(random, -8, 8),
      overshoot: randomBetween(
        random,
        settings.overshootRange[0],
        settings.overshootRange[1],
      ),
      size: randomBetween(random, settings.sizeRange[0], settings.sizeRange[1]),
      travelMs: randomBetween(
        random,
        settings.travelRange[0],
        settings.travelRange[1],
      ),
    };
  }

  function createSceneState(width, height, seed) {
    const random = seededRandom(seed);
    const dustCount = countForArea(width, height, 360, 720);
    const ejectaCount = countForArea(
      width,
      height,
      EJECTA_COUNT_BASE,
      EJECTA_COUNT_MAX,
    );
    const energyRayCount = countForArea(width, height, 30, 56);
    const ignitionDotCount = countForArea(width, height, 24, 42);
    const ignitionPlumeCount = countForArea(width, height, 28, 46);
    const shockArcCount = countForArea(width, height, 20, 40);
    const sparkCount = countForArea(width, height, 46, 82);
    const starCount = countForArea(width, height, 220, 420);
    return {
      dust: Array.from({ length: dustCount }, (_, index) =>
        createParticle(random, width, height, index, "dust"),
      ),
      ejecta: Array.from({ length: ejectaCount }, (_, index) =>
        createEjecta(random, width, height, index),
      ),
      energyRays: Array.from({ length: energyRayCount }, (_, index) =>
        createEnergyRay(random, index),
      ),
      height,
      ignitionCloud: Array.from({ length: ignitionDotCount }, (_, index) =>
        createIgnitionDot(random, index),
      ),
      ignitionPlumes: Array.from({ length: ignitionPlumeCount }, (_, index) =>
        createIgnitionPlume(random, index),
      ),
      recedeSeed: random() * 1000,
      shockArcs: Array.from({ length: shockArcCount }, (_, index) =>
        createShockArc(random, index),
      ),
      sparks: Array.from({ length: sparkCount }, (_, index) =>
        createParticle(random, width, height, index, "spark"),
      ),
      stars: Array.from({ length: starCount }, (_, index) =>
        createParticle(random, width, height, index, "star"),
      ),
      width,
    };
  }

  root.PacePetsDashboardBigBangSceneFactory = Object.freeze({
    createSceneState,
  });
})(globalThis);

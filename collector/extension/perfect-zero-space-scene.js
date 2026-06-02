(function attachPacePetsPerfectZeroSpace(root) {
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

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function objectOption(value) {
    return value && typeof value === "object" ? value : {};
  }

  function sceneConfigFor(sceneOptions) {
    const options = objectOption(sceneOptions);
    const profile =
      SCENE_PROFILES[options.profile] || SCENE_PROFILES[DEFAULT_PROFILE_KEY];
    const overrides = objectOption(options.scene);

    return {
      ...SCENE_DEFAULTS,
      ...profile,
      ...overrides,
      frame: {
        ...SCENE_FRAME_DEFAULTS,
        ...objectOption(profile.frame),
        ...objectOption(overrides.frame),
      },
      gradient: {
        ...SCENE_GRADIENT_DEFAULTS,
        ...objectOption(profile.gradient),
        ...objectOption(overrides.gradient),
      },
    };
  }

  function sceneCount(scene, countKey, maxCountKey, width, height) {
    const baseCount = Math.max(0, Math.round(scene[countKey]));
    if (!scene.scaleCountsWithArea) {
      return baseCount;
    }

    const referenceArea = Math.max(1, scene.densityReferenceArea);
    const areaMultiplier = Math.sqrt(
      Math.max(1, width * height) / referenceArea,
    );
    const maxCount = Math.max(baseCount, Math.round(scene[maxCountKey]));
    return Math.min(
      maxCount,
      Math.max(baseCount, Math.round(baseCount * areaMultiplier)),
    );
  }

  function randomIntegerBetween(min, max) {
    return Math.floor(randomBetween(min, max + 1));
  }

  function sceneCountRange(
    scene,
    countKey,
    countRangeMaxKey,
    maxCountKey,
    width,
    height,
  ) {
    const baseCount = Math.max(0, Math.round(scene[countKey]));
    const scaledMaxCount = sceneCount(
      scene,
      countKey,
      maxCountKey,
      width,
      height,
    );
    const rangeMaxOption = numericOption(scene[countRangeMaxKey]);
    const rangeMaxCount =
      rangeMaxOption === null
        ? scaledMaxCount
        : Math.max(baseCount, Math.round(rangeMaxOption));
    const minCount = clamp(baseCount, 0, scaledMaxCount);
    const maxCount = clamp(rangeMaxCount, minCount, scaledMaxCount);

    return randomIntegerBetween(minCount, maxCount);
  }

  function numericOption(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function featuredPlanetOrigins(scene) {
    if (!Array.isArray(scene.featuredPlanets)) {
      return [];
    }

    return scene.featuredPlanets
      .map((featuredPlanet) => {
        const options = objectOption(featuredPlanet);
        const originX = numericOption(options.originX);
        const originY = numericOption(options.originY);
        const minSize = numericOption(options.minSize);
        const maxSize = numericOption(options.maxSize);
        const type = PLANET_TYPES_SET.has(options.type) ? options.type : null;

        if (originX === null || originY === null) {
          return null;
        }

        return {
          ...(maxSize === null ? {} : { maxSize }),
          ...(minSize === null ? {} : { minSize }),
          ...(type === null ? {} : { type }),
          originX,
          originY,
        };
      })
      .filter(Boolean);
  }

  function randomSkewedUnit(strength) {
    return Math.pow(Math.log(Math.random() * (Math.E - 1) + 1), strength);
  }

  function sparkleDelayMs(mode) {
    return mode === "super"
      ? randomBetween(4000, 12000)
      : randomBetween(1000, 4000);
  }

  function cometDelayMs(scene) {
    return randomBetween(scene.cometDelayMinMs, scene.cometDelayMaxMs);
  }

  function createComet(scene, width, height, elapsedMs) {
    const leftToRight = Math.random() > 0.5;
    const startY = randomBetween(height * 0.04, height * 0.42);
    const verticalTravel = randomBetween(height * 0.2, height * 0.42);
    const start = {
      x: leftToRight ? -width * 0.18 : width * 1.18,
      y: startY,
    };
    const end = {
      x: leftToRight ? width * 1.18 : -width * 0.18,
      y: startY + verticalTravel,
    };

    return {
      durationMs: randomBetween(
        scene.cometDurationMinMs,
        scene.cometDurationMaxMs,
      ),
      end,
      startedAtMs: elapsedMs,
      start,
      tailLength: randomBetween(
        scene.cometTailMinLength,
        scene.cometTailMaxLength,
      ),
    };
  }

  function createStars(scene, width, height) {
    const starCount = sceneCount(
      scene,
      "starCount",
      "maxStarCount",
      width,
      height,
    );
    const sparkleCount = Math.min(
      starCount,
      sceneCount(scene, "sparkleCount", "maxSparkleCount", width, height),
    );
    const superSparkleCount = Math.floor(starCount * scene.superSparkleRatio);

    return Array.from({ length: starCount }, (_, index) => {
      const baseOpacity = randomBetween(0.3, 1);
      const sparkleMode = index < superSparkleCount ? "super" : "regular";

      return {
        baseOpacity,
        nextSparkleAtMs: randomBetween(0, 1000),
        size: randomBetween(0.6, 1.35),
        sparkleEnabled: index < sparkleCount,
        sparkleMode,
        sparkleStartedAtMs: null,
        x: Math.random() * width,
        y: Math.random() * height,
      };
    }).sort(() => Math.random() - 0.5);
  }

  function shapeSizeRange(scene, style, origin) {
    const defaultMinSize = isAsteroidStyle(style)
      ? scene.shapeMinSize * scene.asteroidSizeMinMultiplier
      : scene.shapeMinSize;
    const defaultMaxSize = isAsteroidStyle(style)
      ? scene.shapeMaxSize * scene.asteroidSizeMaxMultiplier
      : scene.shapeMaxSize * scene.planetSizeMaxMultiplier;
    const originMinSize = numericOption(origin?.minSize);
    const originMaxSize = numericOption(origin?.maxSize);
    const minSize = originMinSize === null ? defaultMinSize : originMinSize;
    const maxSize =
      originMaxSize === null
        ? Math.max(minSize, defaultMaxSize)
        : Math.max(minSize, originMaxSize);

    return { maxSize, minSize };
  }

  function shapeSpeedRange(scene, style) {
    return {
      minSpeed: scene.shapeSpeedMinPxPerSecond,
      maxSpeed: isAsteroidStyle(style)
        ? scene.shapeSpeedMaxPxPerSecond * scene.asteroidSpeedMaxMultiplier
        : scene.shapeSpeedMaxPxPerSecond,
    };
  }

  function createShape(scene, width, height, style, origin) {
    const { minSize, maxSize } = shapeSizeRange(scene, style, origin);
    const size = randomBetween(minSize, maxSize);
    const maxX = Math.max(width - size, 0);
    const maxY = Math.max(height - size, 0);
    const { minSpeed, maxSpeed } = shapeSpeedRange(scene, style);
    const speed =
      minSpeed +
      (maxSpeed - minSpeed) * randomSkewedUnit(scene.shapeSpeedSkewStrength);
    const shapeSpeed = isPlanetStyle(style)
      ? speed * scene.planetSpeedMultiplier
      : speed;
    const angle = Math.random() * Math.PI * 2;
    const rotationDegreesPerMs = isPlanetStyle(style)
      ? randomBetween(0.01, 0.02875)
      : randomBetween(0.02, 0.17);
    const rotationDirection = Math.random() > 0.5 ? 1 : -1;
    const originX = numericOption(origin?.originX);
    const originY = numericOption(origin?.originY);

    return {
      fill: style.fill,
      opacity: Math.min(
        0.38,
        randomBetween(scene.shapeMinOpacity, scene.shapeMaxOpacity) * 1.8,
      ),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed:
        rotationDirection * rotationDegreesPerMs * 1000 * (Math.PI / 180),
      size,
      stroke: style.stroke,
      type: style.type,
      accent: style.accent,
      band: style.band,
      planetStroke: style.planetStroke,
      rearRingStroke: style.rearRingStroke,
      ringStroke: style.ringStroke,
      shade: style.shade,
      spot: style.spot,
      vx: Math.cos(angle) * shapeSpeed,
      vy: Math.sin(angle) * shapeSpeed,
      x:
        originX === null
          ? Math.random() * maxX
          : clamp(originX - size / 2, 0, maxX),
      y:
        originY === null
          ? Math.random() * maxY
          : clamp(originY - size / 2, 0, maxY),
    };
  }

  function createSceneState(scene, width, height) {
    const planetCount = sceneCountRange(
      scene,
      "planetCount",
      "planetCountRangeMax",
      "maxPlanetCount",
      width,
      height,
    );
    const featuredOrigins = featuredPlanetOrigins(scene).slice(0, planetCount);
    const randomPlanetCount = Math.max(0, planetCount - featuredOrigins.length);
    let previousPlanetType = null;
    const featuredPlanets = featuredOrigins.map((origin, index) => {
      const style = planetStyleForIndex(index, {
        previousType: previousPlanetType,
        type: origin.type,
      });
      previousPlanetType = style.type;

      return createShape(scene, width, height, style, origin);
    });
    const asteroidCount = sceneCountRange(
      scene,
      "asteroidCount",
      "asteroidCountRangeMax",
      "maxAsteroidCount",
      width,
      height,
    );
    const planets = Array.from({ length: randomPlanetCount }, (_, index) => {
      const style = planetStyleForIndex(index, {
        previousType: previousPlanetType,
      });
      previousPlanetType = style.type;

      return createShape(scene, width, height, style);
    });
    const asteroids = Array.from({ length: asteroidCount }, (_, index) =>
      createShape(scene, width, height, asteroidStyleForIndex(index)),
    );

    return {
      comet: null,
      height,
      nextCometAtMs: cometDelayMs(scene),
      shapes: [...featuredPlanets, ...planets, ...asteroids],
      stars: createStars(scene, width, height),
      width,
    };
  }

  function updateShapeMotion(shape, width, height, deltaSeconds) {
    const maxX = Math.max(width - shape.size, 0);
    const maxY = Math.max(height - shape.size, 0);

    shape.x += shape.vx * deltaSeconds;
    shape.y += shape.vy * deltaSeconds;
    shape.rotation += shape.rotationSpeed * deltaSeconds;

    if (shape.x < 0) {
      shape.x = -shape.x;
      shape.vx *= -1;
    } else if (shape.x > maxX) {
      shape.x = maxX - (shape.x - maxX);
      shape.vx *= -1;
    }

    if (shape.y < 0) {
      shape.y = -shape.y;
      shape.vy *= -1;
    } else if (shape.y > maxY) {
      shape.y = maxY - (shape.y - maxY);
      shape.vy *= -1;
    }
  }

  function updateComet(scene, sceneState, elapsedMs) {
    if (
      sceneState.comet &&
      elapsedMs - sceneState.comet.startedAtMs >= sceneState.comet.durationMs
    ) {
      sceneState.comet = null;
      sceneState.nextCometAtMs = elapsedMs + cometDelayMs(scene);
    }

    if (!sceneState.comet && elapsedMs >= sceneState.nextCometAtMs) {
      sceneState.comet = createComet(
        scene,
        sceneState.width,
        sceneState.height,
        elapsedMs,
      );
    }
  }

  function updateSceneState(scene, sceneState, deltaMs, elapsedMs) {
    const deltaSeconds = Math.min(Math.max(deltaMs, 0), 64) / 1000;
    if (deltaSeconds === 0) {
      return;
    }

    for (const shape of sceneState.shapes) {
      updateShapeMotion(
        shape,
        sceneState.width,
        sceneState.height,
        deltaSeconds,
      );
    }

    updateComet(scene, sceneState, elapsedMs);
  }

  function updateStarSparkle(star, elapsedMs) {
    if (!star.sparkleEnabled) {
      return;
    }

    const durationMs = star.sparkleMode === "super" ? 1000 : 1400;
    if (star.sparkleStartedAtMs === null && elapsedMs >= star.nextSparkleAtMs) {
      star.sparkleStartedAtMs = elapsedMs;
    }

    if (
      star.sparkleStartedAtMs !== null &&
      elapsedMs - star.sparkleStartedAtMs >= durationMs
    ) {
      star.sparkleStartedAtMs = null;
      star.nextSparkleAtMs = elapsedMs + sparkleDelayMs(star.sparkleMode);
    }
  }

  function starProgress(star, elapsedMs) {
    if (star.sparkleStartedAtMs === null) {
      return { opacity: star.baseOpacity, scale: 1 };
    }

    const elapsedSparkleMs = elapsedMs - star.sparkleStartedAtMs;
    if (star.sparkleMode === "super") {
      const peakOpacity = Math.min(star.baseOpacity * 2, 1);
      if (elapsedSparkleMs < 300) {
        const progress = elapsedSparkleMs / 300;
        return {
          opacity:
            star.baseOpacity + (peakOpacity - star.baseOpacity) * progress,
          scale: 1 + progress,
        };
      }

      if (elapsedSparkleMs < 500) {
        return { opacity: peakOpacity, scale: 2 };
      }

      const progress = Math.min((elapsedSparkleMs - 500) / 500, 1);
      return {
        opacity: peakOpacity + (star.baseOpacity - peakOpacity) * progress,
        scale: 2 - progress,
      };
    }

    if (elapsedSparkleMs < 700) {
      const progress = elapsedSparkleMs / 700;
      return {
        opacity:
          star.baseOpacity +
          (star.baseOpacity * 0.2 - star.baseOpacity) * progress,
        scale: 1,
      };
    }

    const progress = Math.min((elapsedSparkleMs - 700) / 700, 1);
    return {
      opacity:
        star.baseOpacity * 0.2 +
        (star.baseOpacity - star.baseOpacity * 0.2) * progress,
      scale: 1,
    };
  }

  function drawRoundedRectPath(context, x, y, width, height, radius) {
    const cornerRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + cornerRadius, y);
    context.lineTo(x + width - cornerRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
    context.lineTo(x + width, y + height - cornerRadius);
    context.quadraticCurveTo(
      x + width,
      y + height,
      x + width - cornerRadius,
      y + height,
    );
    context.lineTo(x + cornerRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
    context.lineTo(x, y + cornerRadius);
    context.quadraticCurveTo(x, y, x + cornerRadius, y);
    context.closePath();
  }

  function drawSceneFramePath(context, frame, width, height) {
    if (frame.type === "fullBleed") {
      context.rect(0, 0, width, height);
      return;
    }

    drawRoundedRectPath(
      context,
      width * frame.insetXRatio,
      height * frame.insetYRatio,
      width * frame.widthRatio,
      height * frame.heightRatio,
      Math.min(width, height) * frame.radiusRatio,
    );
  }

  function createBackgroundGradient(context, scene, width, height) {
    const gradient = scene.gradient;
    const backgroundGradient = context.createRadialGradient(
      width * gradient.centerXRatio,
      height * gradient.centerYRatio,
      0,
      width * gradient.outerXRatio,
      height * gradient.outerYRatio,
      Math.max(width, height) * gradient.radiusRatio,
    );
    backgroundGradient.addColorStop(0, gradient.innerColor);
    backgroundGradient.addColorStop(
      gradient.middleStop,
      gradient.middleColor || scene.background,
    );
    backgroundGradient.addColorStop(1, gradient.outerColor);
    return backgroundGradient;
  }

  function drawPlanetDiscPath(context, half, xRatio = 0.74, yRatio = 0.76) {
    context.beginPath();
    context.ellipse(0, 0, half * xRatio, half * yRatio, 0, 0, Math.PI * 2);
  }

  function drawPlanetDisc(context, shape, half, xRatio = 0.74, yRatio = 0.76) {
    context.fillStyle = shape.fill;
    context.strokeStyle = shape.planetStroke || shape.stroke;
    context.lineWidth = Math.max(0.9, shape.size * 0.1);
    drawPlanetDiscPath(context, half, xRatio, yRatio);
    context.fill();
    context.stroke();
  }

  function drawSpherePlanet(context, shape, half) {
    drawPlanetDisc(context, shape, half);

    context.save();
    context.globalAlpha *= 0.46;
    context.fillStyle = shape.shade;
    context.beginPath();
    context.ellipse(
      half * 0.18,
      half * 0.06,
      half * 0.42,
      half * 0.56,
      0.24,
      -Math.PI * 0.5,
      Math.PI * 0.5,
    );
    context.fill();
    context.restore();

    context.fillStyle = shape.accent;
    context.beginPath();
    context.arc(-half * 0.28, -half * 0.3, half * 0.14, 0, Math.PI * 2);
    context.fill();
  }

  function drawBandedPlanet(context, shape, half) {
    context.save();
    drawPlanetDiscPath(context, half, 0.78, 0.72);
    context.clip();

    context.fillStyle = shape.fill;
    context.fillRect(-half, -half, shape.size, shape.size);
    context.fillStyle = shape.band || shape.accent;
    context.fillRect(-half * 0.84, -half * 0.36, half * 1.68, half * 0.18);
    context.fillRect(-half * 0.84, half * 0.2, half * 1.68, half * 0.16);
    context.fillStyle = shape.accent;
    context.fillRect(-half * 0.84, -half * 0.04, half * 1.68, half * 0.12);
    context.fillStyle = shape.spot || shape.shade;
    context.beginPath();
    context.ellipse(
      half * 0.28,
      half * 0.2,
      half * 0.17,
      half * 0.11,
      -0.2,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();

    context.strokeStyle = shape.planetStroke || shape.stroke;
    context.lineWidth = Math.max(0.9, shape.size * 0.1);
    drawPlanetDiscPath(context, half, 0.78, 0.72);
    context.stroke();
  }

  function drawCrateredPlanet(context, shape, half) {
    drawPlanetDisc(context, shape, half, 0.72, 0.72);

    context.save();
    context.globalAlpha *= 0.56;
    context.strokeStyle = shape.accent;
    context.fillStyle = shape.shade;
    context.lineWidth = Math.max(0.65, shape.size * 0.06);

    for (const crater of [
      [-0.26, -0.18, 0.16],
      [0.26, 0.18, 0.13],
      [0.08, -0.38, 0.08],
    ]) {
      context.beginPath();
      context.arc(
        half * crater[0],
        half * crater[1],
        Math.max(0.8, half * crater[2]),
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    }
    context.restore();
  }

  function drawEclipsePlanet(context, shape, half) {
    drawPlanetDisc(context, shape, half, 0.72, 0.72);

    context.save();
    context.rotate(-0.24);
    context.strokeStyle = shape.accent;
    context.lineCap = "round";
    context.lineWidth = Math.max(1, shape.size * 0.12);
    context.beginPath();
    context.arc(0, 0, half * 0.66, -Math.PI * 0.64, Math.PI * 0.64);
    context.stroke();
    context.restore();

    context.fillStyle = shape.stroke;
    context.beginPath();
    context.arc(-half * 0.2, -half * 0.24, half * 0.08, 0, Math.PI * 2);
    context.fill();
  }

  function drawRingedPlanet(context, shape, half) {
    context.lineCap = "round";
    context.lineJoin = "round";

    context.save();
    context.rotate(-0.34);
    context.strokeStyle = shape.rearRingStroke;
    context.lineWidth = Math.max(1, shape.size * 0.14);
    context.beginPath();
    context.ellipse(0, 0, half * 1.26, half * 0.42, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    context.fillStyle = shape.fill;
    context.strokeStyle = shape.planetStroke;
    context.lineWidth = Math.max(0.9, shape.size * 0.11);
    context.beginPath();
    context.ellipse(0, 0, half * 0.7, half * 0.76, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.save();
    context.rotate(-0.34);
    context.strokeStyle = shape.ringStroke;
    context.lineWidth = Math.max(1, shape.size * 0.12);
    context.beginPath();
    context.ellipse(0, 0, half * 1.26, half * 0.42, 0, 0.05, Math.PI - 0.05);
    context.stroke();
    context.restore();
  }

  function drawAsteroid(context, shape, half) {
    context.lineCap = "round";
    context.lineJoin = "round";

    context.fillStyle = shape.fill;
    context.strokeStyle = shape.stroke;
    context.lineWidth = Math.max(1, shape.size * 0.1);
    context.beginPath();
    context.moveTo(-half * 0.72, -half * 0.22);
    context.quadraticCurveTo(-half * 0.54, -half * 0.82, half * 0.04, -half);
    context.quadraticCurveTo(
      half * 0.62,
      -half * 0.92,
      half * 0.88,
      -half * 0.32,
    );
    context.quadraticCurveTo(half * 1.04, half * 0.2, half * 0.58, half * 0.72);
    context.quadraticCurveTo(
      half * 0.02,
      half * 1.02,
      -half * 0.56,
      half * 0.72,
    );
    context.quadraticCurveTo(
      -half * 1.02,
      half * 0.42,
      -half * 0.72,
      -half * 0.22,
    );
    context.closePath();
    context.fill();
    context.stroke();

    context.strokeStyle = shape.accent;
    context.lineWidth = Math.max(0.7, shape.size * 0.07);

    context.beginPath();
    context.arc(-half * 0.24, -half * 0.12, half * 0.2, 0, Math.PI * 2);
    context.stroke();

    context.beginPath();
    context.arc(half * 0.34, half * 0.2, half * 0.17, 0, Math.PI * 2);
    context.stroke();

    for (const x of [-half * 0.38, half * 0.1]) {
      context.beginPath();
      context.moveTo(x, half * 0.42);
      context.lineTo(x + half * 0.06, half * 0.62);
      context.stroke();
    }

    for (const x of [-half * 0.48, half * 0.16, half * 0.54]) {
      context.beginPath();
      context.arc(x, -half * 0.42, Math.max(0.65, half * 0.08), 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawShape(context, shape) {
    const half = shape.size / 2;
    context.save();
    context.translate(shape.x + half, shape.y + half);
    context.rotate(shape.rotation);
    context.globalAlpha = shape.opacity;

    if (shape.type === "ringedPlanet") {
      drawRingedPlanet(context, shape, half);
    } else if (shape.type === "spherePlanet") {
      drawSpherePlanet(context, shape, half);
    } else if (shape.type === "bandedPlanet") {
      drawBandedPlanet(context, shape, half);
    } else if (shape.type === "crateredPlanet") {
      drawCrateredPlanet(context, shape, half);
    } else if (shape.type === "eclipsePlanet") {
      drawEclipsePlanet(context, shape, half);
    } else if (shape.type === "asteroid") {
      drawAsteroid(context, shape, half);
    }

    context.restore();
  }

  function drawComet(context, comet, elapsedMs) {
    if (!comet) {
      return;
    }

    const progress = Math.min(
      Math.max((elapsedMs - comet.startedAtMs) / comet.durationMs, 0),
      1,
    );
    const fade = Math.sin(progress * Math.PI);
    const x = comet.start.x + (comet.end.x - comet.start.x) * progress;
    const y = comet.start.y + (comet.end.y - comet.start.y) * progress;
    const dx = comet.end.x - comet.start.x;
    const dy = comet.end.y - comet.start.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const tailX = x - (dx / distance) * comet.tailLength;
    const tailY = y - (dy / distance) * comet.tailLength;

    context.save();
    context.lineCap = "round";
    context.shadowBlur = 5;
    context.shadowColor = `rgba(186, 230, 253, ${0.34 * fade})`;

    const tailGradient = context.createLinearGradient(tailX, tailY, x, y);
    tailGradient.addColorStop(0, "rgba(186, 230, 253, 0)");
    tailGradient.addColorStop(0.72, `rgba(224, 242, 254, ${0.48 * fade})`);
    tailGradient.addColorStop(1, `rgba(255, 255, 255, ${0.9 * fade})`);
    context.strokeStyle = tailGradient;
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.lineTo(x, y);
    context.stroke();

    context.fillStyle = `rgba(255, 255, 255, ${0.92 * fade})`;
    context.beginPath();
    context.arc(x, y, 1.4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawFrame(context, scene, sceneState, elapsedMs) {
    const { width, height } = sceneState;
    const { frame } = scene;
    context.clearRect(0, 0, width, height);

    context.save();
    context.beginPath();
    drawSceneFramePath(context, frame, width, height);

    context.fillStyle = createBackgroundGradient(context, scene, width, height);
    context.fill();
    context.clip();

    for (const star of sceneState.stars) {
      updateStarSparkle(star, elapsedMs);
      const { opacity, scale } = starProgress(star, elapsedMs);
      context.beginPath();
      context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      context.arc(star.x, star.y, star.size * scale, 0, Math.PI * 2);
      context.fill();
    }

    drawComet(context, sceneState.comet, elapsedMs);

    for (const shape of sceneState.shapes) {
      drawShape(context, shape);
    }

    context.restore();

    if (!frame.edgeGlow) {
      return;
    }

    context.save();
    context.beginPath();
    drawSceneFramePath(context, frame, width, height);
    context.strokeStyle = frame.edgeGlow;
    context.lineWidth = 1;
    context.stroke();
    context.restore();
  }

  function measuredSceneSize(container, canvas, scene) {
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return {
      height: Math.max(
        1,
        Math.round(
          canvasRect.height || containerRect.height || scene.fallbackSize,
        ),
      ),
      width: Math.max(
        1,
        Math.round(
          canvasRect.width || containerRect.width || scene.fallbackSize,
        ),
      ),
    };
  }

  function configureCanvas(container, canvas, context, currentState, scene) {
    const { width, height } = measuredSceneSize(container, canvas, scene);
    const pixelRatio = Math.max(
      1,
      Math.min(root.devicePixelRatio || 1, scene.maxPixelRatio),
    );
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    const changed =
      !currentState ||
      currentState.width !== width ||
      currentState.height !== height ||
      canvas.width !== pixelWidth ||
      canvas.height !== pixelHeight;

    if (changed) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return changed ? createSceneState(scene, width, height) : currentState;
  }

  function addMediaChangeListener(mediaQuery, listener) {
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }

  function create(container, canvas, options) {
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    const scene = sceneConfigFor(options);
    const reducedMotionMedia = root.matchMedia(REDUCED_MOTION_QUERY);
    let sceneState = null;
    let animationFrameId = null;
    let elapsedMs = 0;
    let isStopped = false;
    let lastFrameAtMs = null;

    function drawStaticFrame() {
      sceneState = configureCanvas(
        container,
        canvas,
        context,
        sceneState,
        scene,
      );
      drawFrame(context, scene, sceneState, elapsedMs);
    }

    function cancelAnimationFrameIfNeeded() {
      if (animationFrameId !== null) {
        root.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }

    function requestNextFrame() {
      if (
        isStopped ||
        animationFrameId !== null ||
        reducedMotionMedia.matches ||
        root.document.hidden
      ) {
        return;
      }

      animationFrameId = root.requestAnimationFrame(renderFrame);
    }

    function renderFrame(frameTimeMs) {
      animationFrameId = null;
      sceneState = configureCanvas(
        container,
        canvas,
        context,
        sceneState,
        scene,
      );

      const deltaMs = lastFrameAtMs === null ? 0 : frameTimeMs - lastFrameAtMs;
      lastFrameAtMs = frameTimeMs;
      elapsedMs += Math.max(0, Math.min(deltaMs, 64));
      updateSceneState(scene, sceneState, deltaMs, elapsedMs);
      drawFrame(context, scene, sceneState, elapsedMs);
      requestNextFrame();
    }

    function handleMotionPreferenceChange() {
      cancelAnimationFrameIfNeeded();
      lastFrameAtMs = null;
      drawStaticFrame();
      requestNextFrame();
    }

    function handleVisibilityChange() {
      cancelAnimationFrameIfNeeded();
      lastFrameAtMs = null;
      if (root.document.hidden) {
        drawStaticFrame();
        return;
      }

      requestNextFrame();
    }

    const removeMotionPreferenceListener = addMediaChangeListener(
      reducedMotionMedia,
      handleMotionPreferenceChange,
    );
    const resizeObserver =
      typeof root.ResizeObserver === "function"
        ? new root.ResizeObserver(() => {
            if (isStopped) {
              return;
            }

            sceneState = null;
            drawStaticFrame();
          })
        : null;

    if (resizeObserver) {
      resizeObserver.observe(container);
    } else {
      root.addEventListener("resize", handleMotionPreferenceChange);
    }
    root.document.addEventListener("visibilitychange", handleVisibilityChange);

    drawStaticFrame();
    requestNextFrame();

    return {
      stop() {
        isStopped = true;
        cancelAnimationFrameIfNeeded();
        removeMotionPreferenceListener();
        resizeObserver?.disconnect();
        root.removeEventListener("resize", handleMotionPreferenceChange);
        root.document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      },
    };
  }

  root.PacePetsPerfectZeroSpace = Object.freeze({
    create,
    profiles: PROFILE_KEYS,
  });
})(globalThis);

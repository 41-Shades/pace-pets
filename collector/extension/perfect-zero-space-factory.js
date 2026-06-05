(function attachPacePetsPerfectZeroSpaceFactory(root) {
  "use strict";

  const DATA = root.PacePetsPerfectZeroSpaceData;
  if (!DATA) {
    throw new Error(
      "Perfect-zero scene data must load before perfect-zero-space-factory.js.",
    );
  }
  const {
    DEFAULT_PROFILE_KEY,
    PLANET_TYPES_SET,
    SCENE_DEFAULTS,
    SCENE_FRAME_DEFAULTS,
    SCENE_GRADIENT_DEFAULTS,
    SCENE_PROFILES,
    asteroidStyleForIndex,
    isAsteroidStyle,
    isPlanetStyle,
    planetStyleForIndex,
  } = DATA;

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

  function sceneCountRange({
    countKey,
    countRangeMaxKey,
    height,
    maxCountKey,
    scene,
    width,
  }) {
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
    const planetCount = sceneCountRange({
      countKey: "planetCount",
      countRangeMaxKey: "planetCountRangeMax",
      height,
      maxCountKey: "maxPlanetCount",
      scene,
      width,
    });
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
    const asteroidCount = sceneCountRange({
      countKey: "asteroidCount",
      countRangeMaxKey: "asteroidCountRangeMax",
      height,
      maxCountKey: "maxAsteroidCount",
      scene,
      width,
    });
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

  root.PacePetsPerfectZeroSpaceFactory = Object.freeze({
    cometDelayMs,
    createComet,
    createSceneState,
    sceneConfigFor,
    sparkleDelayMs,
  });
})(globalThis);

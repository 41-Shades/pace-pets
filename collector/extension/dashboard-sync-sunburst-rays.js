((root) => {
  "use strict";

  const INITIAL_EXTRA_RAY_COUNT = 30;
  const LENGTH_MOTION_MAX_SCALE = 1.08;
  const LENGTH_MOTION_MIN_SCALE = 0.93;
  const LENGTH_MOTION_RAMP_MS = 4200;
  const RAY_COUNT = 42;
  const TWO_PI = Math.PI * 2;

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function smooth(value) {
    return value * value * (3 - 2 * value);
  }

  function mix(from, to, amount) {
    return from + (to - from) * amount;
  }

  function randomBetween(from, to) {
    return mix(from, to, Math.random());
  }

  function randomInteger(from, to) {
    return Math.floor(randomBetween(from, to + 1));
  }

  function rayKind(index) {
    const isBroadAnchor = index % 6 === 0 || index % 11 === 4;
    const isSpikeAnchor = index % 4 === 1 || index % 9 === 2;
    const isBroad = isBroadAnchor ? Math.random() > 0.18 : Math.random() > 0.9;
    return {
      isBroad,
      isSpike:
        !isBroad &&
        (isSpikeAnchor ? Math.random() > 0.16 : Math.random() > 0.68),
    };
  }

  function rayWidth(kind) {
    if (kind.isSpike) {
      return randomBetween(0.014, 0.033);
    }
    if (kind.isBroad) {
      return randomBetween(0.062, 0.13);
    }
    return randomBetween(0.032, 0.078);
  }

  function rayAlpha(kind) {
    if (kind.isSpike) {
      return randomBetween(0.34, 0.72);
    }
    return randomBetween(0.18, 0.52);
  }

  function rayDuration(kind) {
    if (kind.isSpike) {
      return randomBetween(0.5, 0.84);
    }
    return randomBetween(0.6, 1);
  }

  function rayLayer(kind) {
    if (kind.isBroad) {
      return 0;
    }
    return kind.isSpike ? 2 : 1;
  }

  function rayLength(kind) {
    if (kind.isSpike) {
      return randomBetween(0.92, 1.1);
    }
    if (kind.isBroad) {
      return randomBetween(0.82, 1.04);
    }
    return randomBetween(0.8, 1.06);
  }

  function rayLengthMotion(kind) {
    const amplitude = kind.isSpike
      ? randomBetween(0.035, 0.08)
      : randomBetween(0.018, 0.055);
    return {
      lengthMotionAmplitude: amplitude,
      lengthMotionDurationMs: randomBetween(5200, 13800),
      lengthMotionPhase: randomBetween(0, TWO_PI),
      lengthMotionSecondaryDurationMs: randomBetween(9000, 22000),
      lengthMotionSecondaryPhase: randomBetween(0, TWO_PI),
    };
  }

  function rayTone() {
    return {
      bodyLightness: randomBetween(62, 78),
      highlightLightness: randomBetween(88, 99),
      tipLightness: randomBetween(92, 99),
    };
  }

  function rayProfile(index, rayCount, angleOffset) {
    const kind = rayKind(index);
    const tone = rayTone();
    return Object.freeze({
      alpha: rayAlpha(kind),
      angle:
        (index / rayCount) * TWO_PI + angleOffset + randomBetween(-0.08, 0.08),
      blur: kind.isBroad ? randomBetween(2, 6) : 0,
      delay: randomBetween(0, 0.3),
      duration: rayDuration(kind),
      hue: randomBetween(45, 56),
      ...tone,
      innerWidth: kind.isSpike ? 0.12 : 0.24,
      layer: rayLayer(kind),
      length: rayLength(kind),
      ...rayLengthMotion(kind),
      saturation: randomBetween(76, 100),
      width: rayWidth(kind),
    });
  }

  function rayLayerCompare(first, second) {
    return first.layer - second.layer;
  }

  function create() {
    const rayCount = randomInteger(
      RAY_COUNT - 4 + INITIAL_EXTRA_RAY_COUNT,
      RAY_COUNT + 4 + INITIAL_EXTRA_RAY_COUNT,
    );
    const angleOffset = randomBetween(0, TWO_PI);
    return Array.from({ length: rayCount }, (_, index) =>
      rayProfile(index, rayCount, angleOffset),
    ).sort(rayLayerCompare);
  }

  function createReplacement() {
    return rayProfile(
      randomInteger(0, RAY_COUNT - 1),
      RAY_COUNT,
      randomBetween(0, TWO_PI),
    );
  }

  function lengthMotionProgress(timestamp, finishedAtMs) {
    if (finishedAtMs === null) {
      return 0;
    }
    return smooth(clamp((timestamp - finishedAtMs) / LENGTH_MOTION_RAMP_MS));
  }

  function rayLengthScale(timestamp, ray) {
    const primary =
      Math.sin(
        (timestamp / ray.lengthMotionDurationMs) * TWO_PI +
          ray.lengthMotionPhase,
      ) * 0.72;
    const secondary =
      Math.sin(
        (timestamp / ray.lengthMotionSecondaryDurationMs) * TWO_PI +
          ray.lengthMotionSecondaryPhase,
      ) * 0.28;
    return clamp(
      1 + (primary + secondary) * ray.lengthMotionAmplitude,
      LENGTH_MOTION_MIN_SCALE,
      LENGTH_MOTION_MAX_SCALE,
    );
  }

  function lengthMultipliers(timestamp, rays, finishedAtMs) {
    const progress = lengthMotionProgress(timestamp, finishedAtMs);
    if (progress <= 0) {
      return null;
    }

    const multipliers = new WeakMap();
    for (const ray of rays) {
      multipliers.set(ray, mix(1, rayLengthScale(timestamp, ray), progress));
    }
    return multipliers;
  }

  root.PacePetsDashboardSyncSunburstRays = Object.freeze({
    create,
    createReplacement,
    lengthMultipliers,
  });
})(globalThis);

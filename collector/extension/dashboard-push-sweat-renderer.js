((root) => {
  "use strict";

  const PushStretch = root.PacePetsDashboardPushStretch;
  const SweatVariation = root.PacePetsDashboardPushSweatVariation;
  if (!PushStretch || !SweatVariation) {
    throw new Error(
      "Pace push stretch and sweat variation renderers must load before dashboard-push-sweat-renderer.js.",
    );
  }

  const DROP_FILL = "#78bed4";
  const DROP_STROKE = "#243044";
  const DROP_DESCENT_ANGLE = 0;
  const DROP_LAUNCH_TURN = -Math.PI;
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
  const RARE_EXIT_TRAIL_PHASE = 0.12;
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

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function smooth(value) {
    return value * value * (3 - 2 * value);
  }

  function mix(from, to, amount) {
    return from + (to - from) * amount;
  }

  function dropAngle(track, progress) {
    const launchAngle = track.angle + DROP_LAUNCH_TURN + track.spin * progress;
    const descent = smooth(clamp((progress - 0.48) / 0.4));
    return mix(launchAngle, DROP_DESCENT_ANGLE, descent);
  }

  function trackProgress(track, phase, allowPhaseWrap) {
    const adjustedPhase =
      allowPhaseWrap && phase < track.start && track.start + track.duration > 1
        ? phase + 1
        : phase;
    const progress = (adjustedPhase - track.start) / track.duration;
    if (progress < 0 || progress > 1) {
      return null;
    }
    return progress;
  }

  function configForLevel(level) {
    return LEVEL_CONFIGS[level] || LEVEL_CONFIGS.normal;
  }

  function trailPhaseForTransition(previousLevel, currentLevel) {
    if (previousLevel === "rare" && currentLevel !== "rare") {
      return RARE_EXIT_TRAIL_PHASE;
    }
    return configForLevel(previousLevel).trailPhase;
  }

  function sizeBoost(maxBoost, amount) {
    return 1 + maxBoost * amount;
  }

  function releasedTrackState(frame, track) {
    const launchAmount = PushStretch.pulseAmount(frame.profile, track.start);
    return {
      origin: frame.iconRenderer.pointFor(
        frame.profile,
        launchAmount,
        track.emitter,
      ),
      sizeBoost: sizeBoost(frame.sizeBoost, launchAmount),
      unit: frame.iconRenderer.imageUnit(),
    };
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { height, width };
  }

  function groundY(canvas, groundElement, dimensions) {
    const canvasRect = canvas.getBoundingClientRect();
    if (!groundElement || canvasRect.height <= 0) {
      return dimensions.height;
    }
    const groundRect = groundElement.getBoundingClientRect();
    const pixelRatio = dimensions.height / canvasRect.height;
    return clamp(
      (groundRect.bottom - canvasRect.top) * pixelRatio,
      0,
      dimensions.height,
    );
  }

  function drawDrop(context, drop) {
    context.save();
    context.globalAlpha = drop.opacity;
    context.translate(drop.x, drop.y);
    context.rotate(drop.angle);
    const long = drop.size * 1.16;
    const wide = drop.size * 0.5;
    context.beginPath();
    context.moveTo(0, -long);
    context.bezierCurveTo(
      wide * 0.85,
      -long * 0.5,
      wide * 1.16,
      long * 0.12,
      wide * 0.72,
      long * 0.62,
    );
    context.bezierCurveTo(
      wide * 0.34,
      long * 1.02,
      -wide * 0.34,
      long * 1.02,
      -wide * 0.72,
      long * 0.62,
    );
    context.bezierCurveTo(
      -wide * 1.16,
      long * 0.12,
      -wide * 0.85,
      -long * 0.5,
      0,
      -long,
    );
    context.fillStyle = DROP_FILL;
    context.strokeStyle = DROP_STROKE;
    context.lineWidth = Math.max(1.2, drop.size * 0.2);
    context.fill();
    context.stroke();
    context.restore();
  }

  function drawTrack(context, frame, track) {
    const progress = trackProgress(track, frame.phase, frame.allowPhaseWrap);
    if (progress === null) {
      return 0;
    }
    const released = releasedTrackState(frame, track);
    const eased = smooth(progress);
    const arc = Math.sin(progress * Math.PI);
    const sway = Math.sin(progress * Math.PI * 2) * track.sway;
    const unitPixels = released.unit * frame.dimensions.height;
    const originY = released.origin.y * frame.dimensions.height;
    const x =
      (released.origin.x + (track.travelX * eased + sway) * released.unit) *
      frame.dimensions.width;
    const fallProgress = mix(
      progress * progress,
      smooth(progress),
      track.fallY,
    );
    const y =
      originY +
      (frame.groundY - originY) * fallProgress -
      track.lift * arc * unitPixels;
    const opacity =
      track.opacity * clamp(progress / 0.12) * clamp((1 - progress) / 0.04);
    const size =
      track.size *
      released.sizeBoost *
      released.unit *
      Math.min(frame.dimensions.width, frame.dimensions.height);
    drawDrop(context, {
      angle: dropAngle(track, progress),
      opacity,
      size: size * (0.88 + arc * 0.2),
      x,
      y,
    });
    return opacity * track.size * released.sizeBoost;
  }

  function drawTracks(context, frame, tracks) {
    let sweatLoad = 0;
    for (const track of tracks) {
      sweatLoad += drawTrack(context, frame, track);
    }
    return sweatLoad;
  }

  function createTrackCaches() {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(LEVEL_CONFIGS).map(([level, config]) => [
          level,
          SweatVariation.createTrackCache(config.sourceTracks, {
            countRange: config.countRange,
            salt: config.salt,
            variation: config.variation,
          }),
        ]),
      ),
    );
  }

  function createRenderer(canvas, groundElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    const trackCaches = createTrackCaches();
    return {
      render({
        cycleIndex,
        iconRenderer,
        profile,
        amount,
        phase,
        previousCycleIndex,
        previousProfile,
        previousPulseLevel,
        pulseLevel,
      }) {
        const dimensions = resizeCanvas(canvas);
        const frame = {
          amount,
          dimensions,
          groundY: groundY(canvas, groundElement, dimensions),
          iconRenderer,
          phase,
          profile,
          allowPhaseWrap: true,
        };
        const currentConfig = configForLevel(pulseLevel);
        const currentFrame = {
          ...frame,
          allowPhaseWrap: false,
          sizeBoost: currentConfig.sizeBoost,
        };
        context.clearRect(0, 0, dimensions.width, dimensions.height);
        let sweatLoad = drawTracks(
          context,
          currentFrame,
          trackCaches[pulseLevel].forCycle(cycleIndex),
        );
        const previousConfig = configForLevel(previousPulseLevel);
        if (
          previousCycleIndex >= 0 &&
          phase <= trailPhaseForTransition(previousPulseLevel, pulseLevel)
        ) {
          sweatLoad += drawTracks(
            context,
            {
              ...frame,
              allowPhaseWrap: true,
              profile: previousProfile || PushStretch.NORMAL_PROFILE,
              sizeBoost: previousConfig.sizeBoost,
            },
            trackCaches[previousPulseLevel].forCycle(previousCycleIndex),
          );
        }
        return sweatLoad;
      },
    };
  }

  root.PacePetsDashboardPushSweat = Object.freeze({ createRenderer });
})(globalThis);

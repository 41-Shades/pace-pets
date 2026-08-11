((root) => {
  "use strict";

  const PushStretch = root.PacePetsDashboardPushStretch;
  const SweatData = root.PacePetsDashboardPushSweatData;
  const SweatSurface = root.PacePetsDashboardPushSweatSurface;
  const SweatVariation = root.PacePetsDashboardPushSweatVariation;
  if (!PushStretch || !SweatData || !SweatSurface || !SweatVariation) {
    throw new Error(
      "Pace push stretch, sweat data, surface, and variation must load before dashboard-push-sweat-renderer.js.",
    );
  }

  const DROP_FILL = "#78bed4";
  const DROP_STROKE = "#243044";
  const DROP_DESCENT_ANGLE = 0;
  const DROP_LAUNCH_TURN = -Math.PI;
  const { LEVEL_CONFIGS } = SweatData;

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
    return progress < 0 || progress > 1 ? null : progress;
  }

  function completionPhaseForTrack(track) {
    return track.start + track.duration - 1;
  }

  function completionPhaseForTracks(tracks) {
    let phase = 0;
    for (const track of tracks) {
      phase = Math.max(phase, completionPhaseForTrack(track));
    }
    return phase;
  }

  function trailPhaseForTransition(previousLevel, currentLevel, tracks) {
    const completionPhase = completionPhaseForTracks(tracks);
    if (previousLevel === "rare" && currentLevel !== "rare") {
      return completionPhase;
    }
    return Math.max(
      SweatData.configForLevel(previousLevel).trailPhase,
      completionPhase,
    );
  }

  function sizeBoost(maxBoost, amount) {
    return 1 + maxBoost * amount;
  }

  function releasedTrackState(frame, track) {
    const cached = frame.releasedTracks.get(track);
    if (cached?.profile === frame.profile) {
      return cached;
    }
    const launchAmount = PushStretch.pulseAmount(frame.profile, track.start);
    const released = {
      origin: frame.iconRenderer.pointFor(
        frame.profile,
        launchAmount,
        track.emitter,
      ),
      profile: frame.profile,
      sizeBoost: sizeBoost(frame.sizeBoost, launchAmount),
      unit: frame.iconRenderer.imageUnit(),
    };
    frame.releasedTracks.set(track, released);
    return released;
  }

  function landingY(layout, waterLevel) {
    return clamp(
      layout.relativeBottom - layout.relativeHeight * clamp(waterLevel),
      0,
      layout.height,
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

  function positionDrop(frame, track, progress) {
    const released = releasedTrackState(frame, track);
    const eased = smooth(progress);
    const arc = Math.sin(progress * Math.PI);
    const sway = Math.sin(progress * Math.PI * 2) * track.sway;
    const { dimensions } = frame;
    const unitPixels =
      released.unit * Math.min(dimensions.unitX, dimensions.unitY);
    const originY =
      (released.origin.y - dimensions.worldTop) * dimensions.unitY;
    const fallProgress = mix(
      progress * progress,
      smooth(progress),
      track.fallY,
    );
    frame.drop.angle = dropAngle(track, progress);
    frame.drop.opacity =
      track.opacity * clamp(progress / 0.12) * clamp((1 - progress) / 0.04);
    frame.drop.size =
      track.size * released.sizeBoost * unitPixels * (0.88 + arc * 0.2);
    frame.drop.x =
      (released.origin.x +
        (track.travelX * eased + sway) * released.unit -
        dimensions.worldLeft) *
      dimensions.unitX;
    frame.drop.y =
      originY +
      (frame.groundY - originY) * fallProgress -
      track.lift * arc * unitPixels;
    return released;
  }

  function drawTrack(context, frame, track) {
    const progress = trackProgress(track, frame.phase, frame.allowPhaseWrap);
    if (progress === null) {
      return 0;
    }
    const released = positionDrop(frame, track, progress);
    frame.surface.includeDrop(frame.drop);
    drawDrop(context, frame.drop);
    return frame.drop.opacity * track.size * released.sizeBoost;
  }

  function drawTracks(context, frame, tracks, shouldDrawTrack = null) {
    let sweatLoad = 0;
    for (const track of tracks) {
      if (!shouldDrawTrack || shouldDrawTrack(track)) {
        sweatLoad += drawTrack(context, frame, track);
      }
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
    const surface = SweatSurface.create(
      canvas,
      groundElement,
      SweatData.SURFACE_BOUNDS,
    );
    const frame = {
      allowPhaseWrap: false,
      dimensions: null,
      drop: { angle: 0, opacity: 0, size: 0, x: 0, y: 0 },
      groundY: 0,
      iconRenderer: null,
      phase: 0,
      profile: null,
      releasedTracks: new WeakMap(),
      sizeBoost: 0,
      surface,
    };

    return {
      invalidateLayout() {
        surface.invalidate();
      },
      render({
        cycleIndex,
        iconRenderer,
        profile,
        phase,
        previousCycleIndex,
        previousProfile,
        previousPulseLevel,
        pulseLevel,
        waterLevel = 0,
      }) {
        const dimensions = surface.current();
        frame.dimensions = dimensions;
        frame.groundY = landingY(dimensions, waterLevel);
        frame.iconRenderer = iconRenderer;
        frame.phase = phase;
        frame.profile = profile;
        const currentConfig = SweatData.configForLevel(pulseLevel);
        frame.allowPhaseWrap = false;
        frame.sizeBoost = currentConfig.sizeBoost;
        surface.beginFrame(context, dimensions);
        const currentTracks = trackCaches[pulseLevel].forCycle(cycleIndex);
        let sweatLoad = drawTracks(context, frame, currentTracks);
        const previousConfig = SweatData.configForLevel(previousPulseLevel);
        const previousTrackCache = trackCaches[previousPulseLevel];
        const previousTracks =
          previousCycleIndex >= 0 && previousTrackCache
            ? previousTrackCache.forCycle(previousCycleIndex)
            : null;
        if (
          previousTracks &&
          phase <=
            trailPhaseForTransition(
              previousPulseLevel,
              pulseLevel,
              previousTracks,
            )
        ) {
          frame.allowPhaseWrap = true;
          frame.profile = previousProfile || PushStretch.NORMAL_PROFILE;
          frame.sizeBoost = previousConfig.sizeBoost;
          sweatLoad += drawTracks(
            context,
            frame,
            previousTracks,
            (track) => phase <= completionPhaseForTrack(track),
          );
        }
        surface.finishFrame();
        return sweatLoad;
      },
    };
  }

  root.PacePetsDashboardPushSweat = Object.freeze({ createRenderer });
})(globalThis);

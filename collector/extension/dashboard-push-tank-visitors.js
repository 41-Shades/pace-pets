((root) => {
  "use strict";

  const TANK_DATA = root.PacePetsDashboardPushTankData;
  if (!TANK_DATA) {
    throw new Error(
      "Push tank data must load before dashboard-push-tank-visitors.js.",
    );
  }

  const { SPECIAL_THRESHOLD, SPECIAL_VISITORS } = TANK_DATA;

  function randomFromRange(randomInRange, [min, max]) {
    return randomInRange(min, max);
  }

  function specialOpacity(clamp, progress, visitor) {
    const exitFade = visitor.config.exitFade ?? 0.18;
    return clamp(Math.min(progress / 0.16, (1 - progress) / exitFade), 0, 0.72);
  }

  function specialVisitorY(frame, asset, lane, size, tankY) {
    if (asset.waterBand === "surface") {
      return frame.top - size * 0.34;
    }
    return tankY(frame, lane, size);
  }

  function specialVisitorLane(visitor, progress, clamp) {
    if (!visitor.glideAmplitude) {
      return visitor.lane;
    }
    const glide =
      Math.sin(progress * Math.PI * 2.2 + visitor.glidePhase) *
      visitor.glideAmplitude;
    return clamp(visitor.lane + visitor.glideOffset + glide, 0.24, 0.82);
  }

  function createSpecialVisitor(key) {
    return {
      config: SPECIAL_VISITORS[key],
      durationMs: 0,
      glideAmplitude: 0,
      glideOffset: 0,
      glidePhase: 0,
      hold: null,
      key,
      lane: 0,
      nextStart: null,
    };
  }

  function createVisitorHold(config, randomInRange) {
    const hasHold = config.holdRatio && config.holdProgress;
    if (!hasHold || Math.random() > (config.holdChance ?? 1)) {
      return null;
    }
    return {
      progress: randomFromRange(randomInRange, config.holdProgress),
      ratio: randomFromRange(randomInRange, config.holdRatio),
    };
  }

  function scheduleSpecialVisitor(visitor, timestamp, initial, randomInRange) {
    const { config } = visitor;
    const delayRange = initial ? config.initialDelayMs : config.delayMs;
    visitor.durationMs = randomFromRange(randomInRange, config.durationMs);
    visitor.glideAmplitude = config.glideAmplitude
      ? randomFromRange(randomInRange, config.glideAmplitude)
      : 0;
    visitor.glideOffset = visitor.glideAmplitude
      ? randomInRange(-0.08, 0.08)
      : 0;
    visitor.glidePhase = randomInRange(0, Math.PI * 2);
    visitor.hold = createVisitorHold(config, randomInRange);
    visitor.lane = randomFromRange(randomInRange, config.lane);
    visitor.nextStart = timestamp + randomFromRange(randomInRange, delayRange);
  }

  function specialVisitorProgress(visitor, timestamp, randomInRange) {
    if (visitor.nextStart === null) {
      scheduleSpecialVisitor(visitor, timestamp, true, randomInRange);
    }
    const progress = (timestamp - visitor.nextStart) / visitor.durationMs;
    if (progress > 1) {
      scheduleSpecialVisitor(visitor, timestamp, false, randomInRange);
      return null;
    }
    return progress < 0 ? null : progress;
  }

  function specialTravelProgress(visitor, progress) {
    if (!visitor.hold) {
      return progress;
    }
    const movingRatio = 1 - visitor.hold.ratio;
    const holdStart = visitor.hold.progress * movingRatio;
    const holdEnd = holdStart + visitor.hold.ratio;
    if (progress < holdStart) {
      return progress / movingRatio;
    }
    if (progress < holdEnd) {
      return visitor.hold.progress;
    }
    return visitor.hold.progress + (progress - holdEnd) / movingRatio;
  }

  function drawSpecialVisitor({
    context,
    frame,
    helpers,
    images,
    timestamp,
    visitor,
  }) {
    const { key } = visitor;
    const asset = helpers.tankAsset(key);
    const image = images.get(key);
    if (!helpers.imageReady(image) || frame.stage < SPECIAL_THRESHOLD) {
      return;
    }
    const progress = specialVisitorProgress(
      visitor,
      timestamp,
      helpers.randomInRange,
    );
    if (progress === null) {
      return;
    }
    const direction = asset.facing || 1;
    const size = frame.height * visitor.config.scale;
    const travel = frame.width + size * 2;
    const travelProgress = specialTravelProgress(visitor, progress);
    const x =
      direction > 0
        ? -size + travelProgress * travel
        : frame.width + size - travelProgress * travel;
    const isHolding = visitor.hold && travelProgress === visitor.hold.progress;
    const bobble = isHolding
      ? Math.sin(timestamp / 360 + visitor.glidePhase) *
        frame.height *
        (visitor.config.holdBobble || 0)
      : 0;
    const lane = specialVisitorLane(visitor, progress, helpers.clamp);
    const y = specialVisitorY(frame, asset, lane, size, helpers.tankY) + bobble;
    helpers.drawIcon(context, image, {
      direction,
      key,
      opacity: specialOpacity(helpers.clamp, progress, visitor),
      size,
      x,
      y,
    });
  }

  function createVisitors() {
    return {
      shark: createSpecialVisitor("shark"),
      whale: createSpecialVisitor("whale"),
    };
  }

  root.PacePetsDashboardPushTankVisitors = Object.freeze({
    createVisitors,
    drawSpecialVisitor,
  });
})(globalThis);

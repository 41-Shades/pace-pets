((root) => {
  "use strict";

  const THEME_ASSETS = root.CodexThemeAssets;
  const TANK_DATA = root.PacePetsDashboardPushTankData;
  const TANK_VISITORS = root.PacePetsDashboardPushTankVisitors;
  if (!THEME_ASSETS || !TANK_DATA || !TANK_VISITORS) {
    throw new Error(
      "Codex theme assets, push tank data, and push tank visitors must load before dashboard-push-tank-renderer.js.",
    );
  }

  const {
    BOTTOM_FLOOR_INSET_RATIO,
    BOTTOM_SLOTS,
    SPECIAL_VISITORS,
    SWIMMER_SLOTS,
    TANK_ASSETS,
  } = TANK_DATA;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomChoice(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function randomDirection() {
    return Math.random() < 0.5 ? -1 : 1;
  }

  function tankAsset(key) {
    return TANK_ASSETS[key] || TANK_ASSETS.clownfish;
  }

  function directionForMovement(asset) {
    if (asset.movement === "static") {
      return 0;
    }
    if (
      asset.movement === "bidirectional" ||
      asset.movement === "crawler" ||
      (asset.movement === "drift" && asset.facing === 0)
    ) {
      return randomDirection();
    }
    return asset.facing || 1;
  }

  function speedForMovement(baseSpeed, asset, direction) {
    if (!direction || asset.movement === "static" || !baseSpeed) {
      return 0;
    }
    const movementScale = asset.movement === "drift" ? 0.32 : 1;
    return baseSpeed * randomInRange(0.82, 1.2) * movementScale * direction;
  }

  function swimmerVariation(slot) {
    const key = randomChoice(slot.choices);
    const asset = tankAsset(key);
    const direction = directionForMovement(asset);
    return {
      direction,
      key,
      lane: clamp(slot.lane + randomInRange(-0.055, 0.055), 0.18, 0.82),
      movement: asset.movement,
      phase: randomInRange(0, Math.PI * 2),
      scale: slot.scale * asset.scale * randomInRange(0.88, 1.08),
      speed: speedForMovement(slot.speed, asset, direction),
    };
  }

  function iconPath(key) {
    return THEME_ASSETS.pushTankOceanIconPath(key);
  }

  function preloadImages(keys) {
    const images = new Map();
    for (const key of keys) {
      const image = new Image();
      image.decoding = "async";
      image.src = iconPath(key);
      images.set(key, image);
    }
    return images;
  }

  function imageReady(image) {
    return image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  }

  function tankY(frame, lane, size) {
    const waterHeight = frame.height - frame.top;
    const centerY = frame.top + waterHeight * lane;
    return clamp(centerY - size / 2, frame.top + 2, frame.height - size - 4);
  }

  function drawIcon(context, image, options) {
    const { facing } = tankAsset(options.key);
    const shouldFlip =
      facing !== 0 && options.direction !== 0 && options.direction !== facing;
    context.save();
    context.globalAlpha *= options.opacity ?? 1;
    if (shouldFlip) {
      context.translate(options.x + options.size, options.y);
      context.scale(-1, 1);
      context.drawImage(image, 0, 0, options.size, options.size);
    } else {
      context.drawImage(
        image,
        options.x,
        options.y,
        options.size,
        options.size,
      );
    }
    context.restore();
  }

  function createSwimmer(slot) {
    const entity = { slot, threshold: slot.threshold };
    Object.assign(entity, swimmerVariation(slot));
    entity.x =
      entity.direction > 0
        ? randomInRange(-0.18, -0.06)
        : randomInRange(1.06, 1.18);
    return entity;
  }

  function createBottomEntity(slot) {
    const key = randomChoice(slot.choices);
    const asset = tankAsset(key);
    const direction = directionForMovement(asset);
    return {
      direction,
      floorSink: asset.floorSink || 0,
      key,
      movement: asset.movement,
      phase: randomInRange(0, Math.PI * 2),
      scale: slot.scale * randomInRange(0.9, 1.08),
      speed: speedForMovement(slot.speed || 0, asset, direction),
      threshold: slot.threshold,
      x: clamp(slot.x + randomInRange(-0.07, 0.07), 0.12, 0.9),
    };
  }

  function updateSwimmer(entity, frame) {
    const size = frame.height * entity.scale;
    const buffer = size / Math.max(1, frame.width);
    entity.x += entity.speed * frame.deltaSeconds;
    if (entity.speed > 0 && entity.x > 1 + buffer) {
      Object.assign(entity, swimmerVariation(entity.slot));
      entity.x = entity.speed > 0 ? -buffer : 1 + buffer;
    } else if (entity.speed < 0 && entity.x < -buffer) {
      Object.assign(entity, swimmerVariation(entity.slot));
      entity.x = entity.speed > 0 ? -buffer : 1 + buffer;
    }
  }

  function updateCrawler(entity, frame) {
    if (entity.movement !== "crawler") {
      return;
    }
    entity.x += entity.speed * frame.deltaSeconds;
    if (entity.x < 0.14 || entity.x > 0.86) {
      entity.x = clamp(entity.x, 0.14, 0.86);
      entity.speed *= -1;
      entity.direction *= -1;
    }
  }

  function drawSwimmer(context, images, entity, frame, timestamp) {
    const image = images.get(entity.key);
    if (!imageReady(image) || frame.stage < entity.threshold) {
      return;
    }
    updateSwimmer(entity, frame);
    const size = frame.height * entity.scale;
    const x = entity.x * frame.width - size / 2;
    const bob = Math.sin(timestamp / 860 + entity.phase) * frame.height * 0.018;
    const y = tankY(frame, entity.lane, size) + bob;
    drawIcon(context, image, {
      direction: entity.direction,
      key: entity.key,
      opacity: 0.88,
      size,
      x,
      y,
    });
  }

  function drawBottomEntity(context, images, entity, frame, timestamp) {
    const image = images.get(entity.key);
    if (!imageReady(image) || frame.stage < entity.threshold) {
      return;
    }
    updateCrawler(entity, frame);
    const size = frame.height * entity.scale;
    const footLift =
      entity.movement === "crawler" &&
      Math.sin(timestamp / 240 + entity.phase) > 0.25
        ? frame.height * 0.012
        : 0;
    const x = entity.x * frame.width - size / 2;
    const floorInset = frame.height * BOTTOM_FLOOR_INSET_RATIO;
    const floorSink = size * entity.floorSink;
    const y = frame.height - size - floorInset + floorSink - footLift;
    drawIcon(context, image, {
      direction: entity.direction,
      key: entity.key,
      opacity: 0.8,
      size,
      x,
      y,
    });
  }

  function collectPreloadKeys() {
    const keys = new Set(Object.keys(SPECIAL_VISITORS));
    for (const slot of SWIMMER_SLOTS) {
      for (const key of slot.choices) {
        keys.add(key);
      }
    }
    for (const slot of BOTTOM_SLOTS) {
      for (const key of slot.choices) {
        keys.add(key);
      }
    }
    return keys;
  }

  function createRenderer() {
    const swimmers = SWIMMER_SLOTS.map(createSwimmer);
    const bottomEntities = BOTTOM_SLOTS.map(createBottomEntity);
    const specialVisitors = TANK_VISITORS.createVisitors();
    const helpers = {
      clamp,
      drawIcon,
      imageReady,
      randomInRange,
      tankAsset,
      tankY,
    };
    const images = preloadImages(collectPreloadKeys());

    return {
      renderSubmerged(context, frame, timestamp) {
        if (frame.stage < SWIMMER_SLOTS[0].threshold) {
          return;
        }
        for (const entity of bottomEntities) {
          drawBottomEntity(context, images, entity, frame, timestamp);
        }
        for (const entity of swimmers) {
          drawSwimmer(context, images, entity, frame, timestamp);
        }
        TANK_VISITORS.drawSpecialVisitor({
          context,
          frame,
          helpers,
          images,
          timestamp,
          visitor: specialVisitors.shark,
        });
      },
      renderSurface(context, frame, timestamp) {
        TANK_VISITORS.drawSpecialVisitor({
          context,
          frame,
          helpers,
          images,
          timestamp,
          visitor: specialVisitors.whale,
        });
      },
      render(context, frame, timestamp) {
        this.renderSubmerged(context, frame, timestamp);
        this.renderSurface(context, frame, timestamp);
      },
    };
  }

  root.PacePetsDashboardPushTank = Object.freeze({ createRenderer });
})(globalThis);

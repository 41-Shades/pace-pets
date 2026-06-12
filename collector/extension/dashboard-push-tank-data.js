((root) => {
  "use strict";

  function frozen(value) {
    return Object.freeze(value);
  }

  function tankAssetMetadata(
    facing,
    movement,
    waterBand,
    floorSink = 0,
    scale = 1,
  ) {
    return frozen({ facing, floorSink, movement, scale, waterBand });
  }

  const SWIMMER_SLOTS = frozen([
    frozen({
      choices: ["clownfish", "yellow_tang"],
      lane: 0.64,
      scale: 0.19,
      speed: 0.046,
      threshold: 0.22,
    }),
    frozen({
      choices: ["blue_tang", "clownfish"],
      lane: 0.46,
      scale: 0.17,
      speed: 0.034,
      threshold: 0.38,
    }),
    frozen({
      choices: ["seahorse", "jellyfish"],
      lane: 0.34,
      scale: 0.18,
      speed: 0.023,
      threshold: 0.56,
    }),
    frozen({
      choices: ["sea_turtle", "pufferfish"],
      lane: 0.72,
      scale: 0.2,
      speed: 0.022,
      threshold: 0.76,
    }),
  ]);

  const BOTTOM_SLOTS = frozen([
    frozen({
      choices: ["seaweed", "coral"],
      scale: 0.22,
      threshold: 0.58,
      x: 0.86,
    }),
    frozen({
      choices: ["crab", "shrimp"],
      scale: 0.16,
      speed: 0.016,
      threshold: 0.74,
      x: 0.24,
    }),
    frozen({
      choices: ["starfish", "sea_urchin"],
      scale: 0.16,
      threshold: 0.88,
      x: 0.68,
    }),
  ]);

  const SPECIAL_VISITORS = frozen({
    shark: frozen({
      delayMs: [9000, 22000],
      durationMs: [11000, 18000],
      exitFade: 0.045,
      glideAmplitude: [0.1, 0.22],
      initialDelayMs: [700, 6000],
      lane: [0.5, 0.76],
      scale: 0.34,
    }),
    whale: frozen({
      delayMs: [30000, 62000],
      durationMs: [28000, 42000],
      holdBobble: 0.018,
      holdChance: 0.82,
      holdProgress: [0.34, 0.62],
      holdRatio: [0.12, 0.2],
      initialDelayMs: [17000, 34000],
      lane: [0.04, 0.09],
      scale: 0.32,
    }),
  });

  const TANK_ASSETS = frozen({
    blue_tang: tankAssetMetadata(-1, "bidirectional", "mid"),
    clownfish: tankAssetMetadata(1, "bidirectional", "mid"),
    coral: tankAssetMetadata(0, "static", "bottom", 0.04),
    crab: tankAssetMetadata(0, "crawler", "bottom", 0.11),
    jellyfish: tankAssetMetadata(0, "drift", "mid"),
    pufferfish: tankAssetMetadata(-1, "bidirectional", "mid"),
    sea_turtle: tankAssetMetadata(-1, "bidirectional", "mid", 0, 1.25),
    sea_urchin: tankAssetMetadata(0, "static", "bottom", 0.05),
    seahorse: tankAssetMetadata(-1, "drift", "mid"),
    seaweed: tankAssetMetadata(0, "static", "bottom", 0.05),
    shark: tankAssetMetadata(-1, "bidirectional", "mid"),
    shrimp: tankAssetMetadata(-1, "crawler", "bottom", 0.08),
    starfish: tankAssetMetadata(0, "static", "bottom", 0.14),
    whale: tankAssetMetadata(-1, "fixed", "surface"),
    yellow_tang: tankAssetMetadata(-1, "bidirectional", "mid"),
  });

  root.PacePetsDashboardPushTankData = frozen({
    BOTTOM_FLOOR_INSET_RATIO: 0.012,
    BOTTOM_SLOTS,
    SPECIAL_THRESHOLD: 0.98,
    SPECIAL_VISITORS,
    SWIMMER_SLOTS,
    TANK_ASSETS,
  });
})(globalThis);

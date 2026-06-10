(function attachPacePetsDashboardSingularityTransitionMotion(root) {
  "use strict";

  const DATA = root.PacePetsDashboardSingularityTransitionData;
  if (!DATA) {
    throw new Error(
      "Singularity transition data must load before transition motion.",
    );
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function easeInCubic(value) {
    return value * value * value;
  }

  function easeOutCubic(value) {
    const inverse = 1 - value;
    return 1 - inverse * inverse * inverse;
  }

  function easeInOutCubic(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function phase(elapsedMs, startMs, durationMs) {
    return clamp((elapsedMs - startMs) / durationMs, 0, 1);
  }

  function randomIn(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
  }

  function tileGrid(width, height) {
    return {
      columns: Math.max(
        12,
        Math.min(DATA.TILE_COLUMNS, Math.floor(width / DATA.MIN_TILE_SIZE_PX)),
      ),
      rows: Math.max(
        8,
        Math.min(DATA.TILE_ROWS, Math.floor(height / DATA.MIN_TILE_SIZE_PX)),
      ),
    };
  }

  function createTiles(width, height, center) {
    const grid = tileGrid(width, height);
    const tileWidth = width / grid.columns;
    const tileHeight = height / grid.rows;
    const diagonal = Math.hypot(width, height);
    const tiles = [];

    for (let row = 0; row < grid.rows; row += 1) {
      for (let column = 0; column < grid.columns; column += 1) {
        const x = column * tileWidth;
        const y = row * tileHeight;
        const midX = x + tileWidth / 2;
        const midY = y + tileHeight / 2;
        const distance = Math.hypot(midX - center.x, midY - center.y);
        tiles.push({
          delayMs: 90 + (distance / diagonal) * 520 + randomIn([0, 180]),
          depth: randomIn([0.78, 1.18]),
          endScale: randomIn([0.04, 0.14]),
          h: Math.ceil(tileHeight) + 1,
          orbit: randomIn([1.85, 3.45]) * (Math.random() > 0.5 ? 1 : -1),
          spin: randomIn([-2.8, 2.8]),
          startLift: randomIn([-8, 8]),
          w: Math.ceil(tileWidth) + 1,
          x,
          y,
        });
      }
    }

    return tiles;
  }

  function createStreaks(width, height, center) {
    const longest = Math.hypot(width, height);
    return Array.from({ length: 76 }, () => {
      const angle = randomIn([0, Math.PI * 2]);
      const radius = randomIn([longest * 0.05, longest * 0.72]);
      return {
        angle,
        length: randomIn([70, 280]),
        offset: randomIn([0, 1]),
        speed: randomIn([0.7, 1.8]),
        width: randomIn([0.8, 2.6]),
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
    });
  }

  function createBangParticles(center) {
    const colors = ["#ffffff", "#7dd3fc", "#f8d66d", "#f0abfc", "#99f6e4"];
    return Array.from({ length: 180 }, (_, index) => ({
      angle: randomIn([0, Math.PI * 2]),
      color: colors[index % colors.length],
      delay: randomIn([0, 0.18]),
      radius: randomIn([110, 780]),
      size: randomIn([1.2, 4.8]),
      spin: randomIn([-0.8, 0.8]),
      startX: center.x + randomIn([-4, 4]),
      startY: center.y + randomIn([-4, 4]),
    }));
  }

  root.PacePetsDashboardSingularityTransitionMotion = Object.freeze({
    clamp,
    createBangParticles,
    createStreaks,
    createTiles,
    easeInCubic,
    easeInOutCubic,
    easeOutCubic,
    phase,
  });
})(globalThis);

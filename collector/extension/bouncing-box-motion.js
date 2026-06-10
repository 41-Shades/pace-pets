((root) => {
  "use strict";

  function boundedDimension(value) {
    return Number.isFinite(value) ? Math.max(value, 0) : 0;
  }

  function boxWidth(box) {
    return boundedDimension(box.width ?? box.size);
  }

  function boxHeight(box) {
    return boundedDimension(box.height ?? box.size);
  }

  function maxPosition(containerSize, boxSize) {
    return Math.max(containerSize - boxSize, 0);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function containBouncingBox(box, width, height) {
    box.x = clamp(box.x, 0, maxPosition(width, boxWidth(box)));
    box.y = clamp(box.y, 0, maxPosition(height, boxHeight(box)));
  }

  function updateBouncingBox(box, width, height, deltaSeconds) {
    const seconds = Number.isFinite(deltaSeconds)
      ? Math.max(deltaSeconds, 0)
      : 0;
    const maxX = maxPosition(width, boxWidth(box));
    const maxY = maxPosition(height, boxHeight(box));

    box.x += box.vx * seconds;
    box.y += box.vy * seconds;

    if (box.x < 0) {
      box.x = -box.x;
      box.vx *= -1;
    } else if (box.x > maxX) {
      box.x = maxX - (box.x - maxX);
      box.vx *= -1;
    }

    if (box.y < 0) {
      box.y = -box.y;
      box.vy *= -1;
    } else if (box.y > maxY) {
      box.y = maxY - (box.y - maxY);
      box.vy *= -1;
    }
  }

  root.PacePetsBouncingBoxMotion = Object.freeze({
    containBouncingBox,
    updateBouncingBox,
  });
})(globalThis);

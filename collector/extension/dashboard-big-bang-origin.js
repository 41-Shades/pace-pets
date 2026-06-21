(function attachPacePetsDashboardBigBangOrigin(root) {
  "use strict";

  const WEBGL_ORIGIN_SPACE_X = -0.12;
  const WEBGL_ORIGIN_SPACE_Y = 0.002;

  function pointForSize(width, height) {
    const aspect = width / Math.max(1, height);
    return {
      x: width * (0.5 + WEBGL_ORIGIN_SPACE_X / (2 * aspect)),
      y: height * (0.5 - WEBGL_ORIGIN_SPACE_Y / 2),
    };
  }

  root.PacePetsDashboardBigBangOrigin = Object.freeze({
    pointForSize,
  });
})(globalThis);

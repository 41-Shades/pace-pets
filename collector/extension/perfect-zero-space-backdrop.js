(function attachPacePetsPerfectZeroSpaceBackdrop(root) {
  "use strict";

  const DRAW = root.PacePetsPerfectZeroSpaceDraw;
  if (!DRAW) {
    throw new Error(
      "Perfect-zero drawing must load before perfect-zero-space-backdrop.js.",
    );
  }

  function create(scene, sceneState, pixelRatio) {
    const canvas = root.document.createElement("canvas");
    canvas.width = Math.round(sceneState.width * pixelRatio);
    canvas.height = Math.round(sceneState.height * pixelRatio);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Perfect-zero backdrop canvas context is unavailable.");
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    DRAW.drawBackdrop(context, scene, sceneState);
    return canvas;
  }

  root.PacePetsPerfectZeroSpaceBackdrop = Object.freeze({ create });
})(globalThis);

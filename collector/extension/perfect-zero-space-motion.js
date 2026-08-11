(function attachPacePetsPerfectZeroSpaceMotion(root) {
  "use strict";

  const BOUNCE = root.PacePetsBouncingBoxMotion;
  const FACTORY = root.PacePetsPerfectZeroSpaceFactory;
  if (!BOUNCE || !FACTORY) {
    throw new Error(
      "Bouncing-box motion and perfect-zero scene factory must load before perfect-zero-space-motion.js.",
    );
  }
  const { cometDelayMs, createComet, sparkleDelayMs } = FACTORY;

  function updateShapeMotion(shape, width, height, deltaSeconds) {
    BOUNCE.updateBouncingBox(shape, width, height, deltaSeconds);
    shape.rotation += shape.rotationSpeed * deltaSeconds;
  }

  function updateComet(scene, sceneState, elapsedMs) {
    if (
      sceneState.comet &&
      elapsedMs - sceneState.comet.startedAtMs >= sceneState.comet.durationMs
    ) {
      sceneState.comet = null;
      sceneState.nextCometAtMs = elapsedMs + cometDelayMs(scene);
    }

    if (!sceneState.comet && elapsedMs >= sceneState.nextCometAtMs) {
      sceneState.comet = createComet(
        scene,
        sceneState.width,
        sceneState.height,
        elapsedMs,
      );
    }
  }

  function updateSceneState(scene, sceneState, deltaMs, elapsedMs) {
    const deltaSeconds = Math.min(Math.max(deltaMs, 0), 64) / 1000;
    if (deltaSeconds === 0) {
      return;
    }

    for (const shape of sceneState.shapes) {
      updateShapeMotion(
        shape,
        sceneState.width,
        sceneState.height,
        deltaSeconds,
      );
    }

    updateComet(scene, sceneState, elapsedMs);
  }

  function updateStarSparkle(star, elapsedMs) {
    if (!star.sparkleEnabled) {
      return;
    }

    const durationMs = star.sparkleMode === "super" ? 1000 : 1400;
    if (star.sparkleStartedAtMs === null && elapsedMs >= star.nextSparkleAtMs) {
      star.sparkleStartedAtMs = elapsedMs;
    }

    if (
      star.sparkleStartedAtMs !== null &&
      elapsedMs - star.sparkleStartedAtMs >= durationMs
    ) {
      star.sparkleStartedAtMs = null;
      star.nextSparkleAtMs = elapsedMs + sparkleDelayMs(star.sparkleMode);
    }
  }

  function starProgress(star, elapsedMs, result = {}) {
    if (star.sparkleStartedAtMs === null) {
      result.opacity = star.baseOpacity;
      result.scale = 1;
      return result;
    }

    const elapsedSparkleMs = elapsedMs - star.sparkleStartedAtMs;
    if (star.sparkleMode === "super") {
      const peakOpacity = Math.min(star.baseOpacity * 2, 1);
      if (elapsedSparkleMs < 300) {
        const progress = elapsedSparkleMs / 300;
        result.opacity =
          star.baseOpacity + (peakOpacity - star.baseOpacity) * progress;
        result.scale = 1 + progress;
        return result;
      }

      if (elapsedSparkleMs < 500) {
        result.opacity = peakOpacity;
        result.scale = 2;
        return result;
      }

      const progress = Math.min((elapsedSparkleMs - 500) / 500, 1);
      result.opacity =
        peakOpacity + (star.baseOpacity - peakOpacity) * progress;
      result.scale = 2 - progress;
      return result;
    }

    if (elapsedSparkleMs < 700) {
      const progress = elapsedSparkleMs / 700;
      result.opacity =
        star.baseOpacity +
        (star.baseOpacity * 0.2 - star.baseOpacity) * progress;
      result.scale = 1;
      return result;
    }

    const progress = Math.min((elapsedSparkleMs - 700) / 700, 1);
    result.opacity =
      star.baseOpacity * 0.2 +
      (star.baseOpacity - star.baseOpacity * 0.2) * progress;
    result.scale = 1;
    return result;
  }

  root.PacePetsPerfectZeroSpaceMotion = Object.freeze({
    starProgress,
    updateStarSparkle,
    updateSceneState,
  });
})(globalThis);

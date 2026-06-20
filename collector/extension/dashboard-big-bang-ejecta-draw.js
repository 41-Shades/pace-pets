(function attachPacePetsDashboardBigBangEjectaDraw(root) {
  "use strict";

  const TWO_PI = Math.PI * 2;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function unit(value) {
    return clamp(value, 0, 1);
  }

  function easeOutCubic(value) {
    return 1 - (1 - value) ** 3;
  }

  function drawEjectaShape(context, ejecta, elapsedMs) {
    const progress = easeOutCubic(
      unit((elapsedMs - ejecta.delayMs) / ejecta.travelMs),
    );
    if (progress <= 0) {
      return false;
    }

    const lateGlow = unit((elapsedMs - 2600) / 4200);
    const fade = 1 - unit((elapsedMs - 7600) / 3600);
    if (fade <= 0) {
      return false;
    }

    const x = ejecta.originX + (ejecta.finalX - ejecta.originX) * progress;
    const y = ejecta.originY + (ejecta.finalY - ejecta.originY) * progress;
    const shimmer = 0.82 + 0.18 * Math.sin(elapsedMs * 0.0022 + ejecta.phase);
    const opacity =
      ejecta.finalOpacity *
      easeOutCubic(unit(progress * 1.8)) *
      (0.55 + lateGlow * 0.45) *
      fade *
      shimmer;

    context.globalAlpha = opacity;
    context.fillStyle = `rgba(${ejecta.color}, 1)`;
    context.beginPath();
    context.arc(x, y, ejecta.size, 0, TWO_PI);
    context.fill();
    return true;
  }

  function drawEjecta(context, ejecta, elapsedMs) {
    context.save();
    context.globalCompositeOperation = "lighter";
    drawEjectaShape(context, ejecta, elapsedMs);
    context.restore();
  }

  function drawEjectaLayer(context, ejectaItems, elapsedMs) {
    context.save();
    context.globalCompositeOperation = "lighter";
    for (const ejecta of ejectaItems) {
      drawEjectaShape(context, ejecta, elapsedMs);
    }
    context.restore();
  }

  root.PacePetsDashboardBigBangEjectaDraw = Object.freeze({
    drawEjecta,
    drawEjectaLayer,
  });
})(globalThis);

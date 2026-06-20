(function attachPacePetsDashboardBigBangRecedeDraw(root) {
  "use strict";

  const TWO_PI = Math.PI * 2;
  const COLORS = Object.freeze([
    "254, 243, 199",
    "125, 211, 252",
    "251, 146, 60",
    "196, 181, 253",
  ]);

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function unit(value) {
    return clamp(value, 0, 1);
  }

  function easeInCubic(value) {
    return value ** 3;
  }

  function pointFor(origin, angle, radius) {
    return {
      x: origin.x + Math.cos(angle) * radius,
      y: origin.y + Math.sin(angle) * radius,
    };
  }

  function noise(index, offset = 0) {
    return (Math.sin(index * 12.9898 + offset * 78.233) * 43758.5453) % 1;
  }

  function positiveNoise(index, offset = 0) {
    return Math.abs(noise(index, offset));
  }

  function drawAmbientGlow(context, frame) {
    const innerRadius = Math.max(1, frame.radius * 0.08);
    const gradient = context.createRadialGradient(
      frame.center.x,
      frame.center.y,
      innerRadius,
      frame.center.x,
      frame.center.y,
      Math.max(innerRadius + 1, frame.radius),
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.16 * frame.intensity})`);
    gradient.addColorStop(
      0.28,
      `rgba(254, 243, 199, ${0.13 * frame.intensity})`,
    );
    gradient.addColorStop(
      0.56,
      `rgba(125, 211, 252, ${0.08 * frame.intensity})`,
    );
    gradient.addColorStop(1, "rgba(2, 6, 23, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, frame.width, frame.height);
  }

  function residuePoint(frame, index, count) {
    const clusterCount = Math.max(1, Math.round(Math.sqrt(count)));
    const cluster = index % clusterCount;
    const angle =
      (cluster / clusterCount) * TWO_PI +
      (positiveNoise(index + frame.seed, 5) - 0.5) * 0.72 +
      Math.sin(frame.elapsedMs * 0.001 + frame.seed + cluster * 2.4) * 0.24;
    const drift =
      frame.radius *
      (0.12 + positiveNoise(index + frame.seed, 6) * 0.52) *
      (0.92 - frame.progress * 0.36);
    return pointFor(frame.center, angle, drift);
  }

  function drawCloudlet(context, frame, index) {
    const speed = 0.44 + positiveNoise(index + frame.seed, 12) * 0.38;
    const cloudProgress = unit(frame.progress * speed);
    const cloudRadius = frame.edge * (1.24 - 1.16 * cloudProgress);
    const point = residuePoint(
      { ...frame, progress: cloudProgress, radius: cloudRadius },
      index,
      12,
    );
    const driftPhase =
      frame.elapsedMs *
      (0.00065 + positiveNoise(index + frame.seed, 11) * 0.00062);
    const driftAmount = 0.28 + (1 - cloudProgress) * 0.92;
    point.x +=
      Math.cos(driftPhase + frame.seed + index) *
      frame.edge *
      0.028 *
      driftAmount;
    point.y +=
      Math.sin(driftPhase + frame.seed * 0.7 + index) *
      frame.edge *
      0.022 *
      driftAmount;
    const size =
      frame.edge *
      (0.014 + positiveNoise(index + frame.seed, 9) * 0.034) *
      (1 - cloudProgress * 0.4);
    const alpha =
      frame.intensity * (0.035 + positiveNoise(index + frame.seed, 10) * 0.09);
    const color = COLORS[Math.floor(index + frame.seed) % COLORS.length];
    const gradient = context.createRadialGradient(
      point.x,
      point.y,
      0,
      point.x,
      point.y,
      size,
    );
    gradient.addColorStop(0, `rgba(${color}, ${alpha})`);
    gradient.addColorStop(0.38, `rgba(${color}, ${alpha * 0.42})`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(point.x - size, point.y - size, size * 2, size * 2);
  }

  function drawResidueSpeck(context, frame, index) {
    const point = residuePoint(frame, index, 60);
    const opacity =
      frame.intensity *
      (0.035 + positiveNoise(index + frame.seed, 7) * 0.14) *
      (1 - frame.progress * 0.62);
    context.fillStyle = `rgba(254, 243, 199, ${opacity})`;
    context.beginPath();
    context.arc(
      point.x,
      point.y,
      Math.max(
        0.48,
        frame.edge * (0.00042 + positiveNoise(index + frame.seed, 8) * 0.00055),
      ),
      0,
      TWO_PI,
    );
    context.fill();
  }

  function drawRecedingEnvelope(context, width, height, elapsedMs, seed = 0) {
    const progress = unit((elapsedMs - 2950) / 5800);
    const fade = 1 - unit((elapsedMs - 8350) / 2100);
    if (progress <= 0 || fade <= 0) {
      return;
    }

    const edge = Math.max(width, height);
    const radius = edge * (1.24 - 1.16 * progress);
    const intensity = fade * (1 - easeInCubic(progress) * 0.64);
    const center = {
      x:
        width / 2 +
        Math.sin(elapsedMs * 0.0011) * edge * 0.012 * (1 - progress),
      y:
        height / 2 +
        Math.cos(elapsedMs * 0.0013) * edge * 0.01 * (1 - progress),
    };
    const frame = {
      center,
      edge,
      elapsedMs,
      height,
      intensity,
      progress,
      radius,
      seed,
      width,
    };

    context.save();
    context.globalCompositeOperation = "lighter";
    drawAmbientGlow(context, frame);
    for (let index = 0; index < 12; index += 1) {
      drawCloudlet(context, frame, index);
    }
    for (let index = 0; index < 60; index += 1) {
      drawResidueSpeck(context, frame, index);
    }
    context.restore();
  }

  root.PacePetsDashboardBigBangRecedeDraw = Object.freeze({
    drawRecedingEnvelope,
  });
})(globalThis);

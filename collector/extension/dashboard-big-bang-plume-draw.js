(function attachPacePetsDashboardBigBangPlumeDraw(root) {
  "use strict";

  const ORIGIN = root.PacePetsDashboardBigBangOrigin;
  if (!ORIGIN) {
    throw new Error("Big Bang origin helper must load before plume draw.");
  }

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

  function easeInCubic(value) {
    return value ** 3;
  }

  function pointFor(origin, angle, radius) {
    return {
      x: origin.x + Math.cos(angle) * radius,
      y: origin.y + Math.sin(angle) * radius,
    };
  }

  function plumePosition(plume, frame, progress, inhale) {
    const growth = easeOutCubic(progress);
    const roll =
      plume.roll *
      Math.sin(progress * Math.PI) *
      (0.62 + plume.turbulence * 0.46);
    const angle =
      plume.angle +
      roll +
      Math.sin(frame.elapsedMs * 0.0021 + plume.phase) * 0.18 * (1 - progress);
    const distance =
      frame.edge * plume.distanceRatio * growth * (1 - inhale * 0.34);
    const point = pointFor(frame.center, angle, distance);
    const curl =
      frame.edge *
      plume.curlRatio *
      Math.sin(progress * Math.PI) *
      (0.42 + plume.turbulence * 0.58);

    return {
      angle,
      growth,
      inhale,
      x: point.x - Math.sin(angle) * curl,
      y: point.y + Math.cos(angle) * curl,
    };
  }

  function drawSoftLobe(context, lobe) {
    const { alpha, color, radius, x, y } = lobe;
    if (radius <= 0 || alpha <= 0) {
      return;
    }

    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${color}, ${alpha})`);
    gradient.addColorStop(0.42, `rgba(${color}, ${alpha * 0.38})`);
    gradient.addColorStop(0.72, `rgba(${color}, ${alpha * 0.13})`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function lobeOffset(plume, index, elapsedMs, radius, progress) {
    const angle =
      plume.phase +
      (index / plume.lobeCount) * TWO_PI +
      plume.roll * progress * 1.4 +
      Math.sin(elapsedMs * 0.0028 + index + plume.phase) * 0.2;
    const distance =
      radius *
      (0.24 + ((index % 3) + 1) * 0.08) *
      (0.72 + plume.turbulence * 0.28);

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * plume.flatten,
    };
  }

  function drawPlumeBody(context, plume, frame) {
    const progress = unit((frame.elapsedMs - plume.delayMs) / plume.durationMs);
    if (progress <= 0) {
      return false;
    }

    const fade =
      1 -
      easeInCubic(
        unit(
          (frame.elapsedMs - plume.delayMs - plume.durationMs * 0.58) /
            (plume.durationMs * 0.72),
        ),
      );
    if (fade <= 0) {
      return false;
    }

    const inhale = easeOutCubic(unit((frame.elapsedMs - 720) / 520));
    const position = plumePosition(plume, frame, progress, inhale);
    const radius =
      frame.edge *
      plume.sizeRatio *
      (0.72 + position.growth * (1.14 + plume.turbulence * 0.28)) *
      (1 - inhale * 0.42);
    const alpha =
      plume.opacity *
      frame.stageAlpha *
      fade *
      (0.42 + Math.sin(progress * Math.PI) * 0.36) *
      (1 - inhale * 0.5);

    drawSoftLobe(context, {
      alpha,
      color: plume.color,
      radius,
      x: position.x,
      y: position.y,
    });
    for (let index = 0; index < plume.lobeCount; index += 1) {
      const offset = lobeOffset(
        plume,
        index,
        frame.elapsedMs,
        radius,
        progress,
      );
      drawSoftLobe(context, {
        alpha: alpha * (0.32 + (index % 3) * 0.08),
        color: plume.color,
        radius: radius * (0.42 + (index % 4) * 0.06),
        x: position.x + offset.x,
        y: position.y + offset.y,
      });
    }

    return true;
  }

  function drawVortexRoll(context, plume, frame) {
    const progress = unit((frame.elapsedMs - plume.delayMs) / plume.durationMs);
    if (progress <= 0.12 || progress >= 0.82 || plume.index % 3 === 0) {
      return;
    }

    const inhale = easeOutCubic(unit((frame.elapsedMs - 720) / 520));
    const position = plumePosition(plume, frame, progress, inhale);
    const length = frame.edge * plume.sizeRatio * (1.2 + progress * 1.1);
    const opacity =
      plume.opacity *
      frame.stageAlpha *
      Math.sin(progress * Math.PI) *
      (0.12 + plume.turbulence * 0.08) *
      (1 - inhale * 0.72);
    if (opacity <= 0) {
      return;
    }

    const angle =
      position.angle +
      plume.roll * 0.48 +
      Math.sin(frame.elapsedMs * 0.0032 + plume.phase) * 0.22;
    const start = pointFor(
      position,
      angle - plume.rollDirection * 1.6,
      length * 0.45,
    );
    const control = pointFor(
      position,
      angle + plume.rollDirection * 0.4,
      length,
    );
    const end = pointFor(
      position,
      angle + plume.rollDirection * 1.1,
      length * 0.62,
    );

    context.strokeStyle = `rgba(${plume.rimColor}, ${opacity})`;
    context.lineCap = "round";
    context.lineWidth = Math.max(0.7, frame.edge * plume.sizeRatio * 0.08);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(control.x, control.y, end.x, end.y);
    context.stroke();
  }

  function drawIgnitionPlumes(context, plumes, width, height, elapsedMs) {
    const attack = easeOutCubic(unit((elapsedMs - 80) / 620));
    const fade = 1 - easeInCubic(unit((elapsedMs - 980) / 620));
    const stageAlpha = attack * fade;
    if (stageAlpha <= 0) {
      return;
    }

    const edge = Math.min(width, height);
    const origin = ORIGIN.pointForSize(width, height);
    const center = {
      x: origin.x + Math.sin(elapsedMs * 0.0016) * edge * 0.006,
      y: origin.y + Math.cos(elapsedMs * 0.0014) * edge * 0.005,
    };
    const frame = { center, edge, elapsedMs, stageAlpha };

    context.save();
    context.globalCompositeOperation = "source-over";
    context.filter = `blur(${1.2 + 2.2 * (1 - stageAlpha)}px)`;
    for (const plume of plumes) {
      drawPlumeBody(context, plume, frame);
    }

    context.globalCompositeOperation = "lighter";
    context.filter = `blur(${0.8 + 1.4 * (1 - stageAlpha)}px)`;
    for (const plume of plumes) {
      drawVortexRoll(context, plume, frame);
    }
    context.restore();
  }

  root.PacePetsDashboardBigBangPlumeDraw = Object.freeze({
    drawIgnitionPlumes,
  });
})(globalThis);

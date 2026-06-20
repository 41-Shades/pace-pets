(function attachPacePetsDashboardBigBangParticleDraw(root) {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function unit(value) {
    return clamp(value, 0, 1);
  }

  function easeOutCubic(value) {
    return 1 - (1 - value) ** 3;
  }

  function easeInOutCubic(value) {
    return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
  }

  function particlePosition(particle, elapsedMs) {
    const expand = easeOutCubic(
      unit((elapsedMs - particle.delayMs) / particle.travelMs),
    );
    const settle =
      particle.kind === "spark"
        ? 0
        : easeInOutCubic(unit((elapsedMs - 3100) / 1900));
    const pulse = Math.sin(unit((elapsedMs - 900) / 4100) * Math.PI);
    const radialScale =
      expand * (1 + particle.overshoot * pulse * (1 - settle));
    const dx = particle.finalX - particle.originX;
    const dy = particle.finalY - particle.originY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const curl = particle.curl * Math.sin(expand * Math.PI) * (1 - settle);
    return {
      settle,
      x: particle.originX + dx * radialScale + (-dy / distance) * curl,
      y: particle.originY + dy * radialScale + (dx / distance) * curl,
    };
  }

  function particleRenderState(particle, elapsedMs) {
    const progress = unit((elapsedMs - particle.delayMs) / particle.travelMs);
    if (progress <= 0) {
      return null;
    }

    const isSpark = particle.kind === "spark";
    const sparkFade = isSpark
      ? 1 - unit((elapsedMs - particle.delayMs - 360) / 560)
      : 1;
    if (sparkFade <= 0) {
      return null;
    }
    const position = particlePosition(particle, elapsedMs);
    const glow = isSpark ? sparkFade : 1 - position.settle;
    return {
      arrival: easeOutCubic(progress),
      glow,
      isSpark,
      position,
      progress,
      sparkFade,
    };
  }

  function particleShadowBlur(particle, renderState) {
    if (particle.kind === "dust") {
      return 0;
    }
    return renderState.isSpark ? 12 * renderState.glow : 5 * renderState.glow;
  }

  function drawParticleTail(context, particle, renderState) {
    if (renderState.isSpark || renderState.glow <= 0.08) {
      return;
    }

    const tailLength = particle.kind === "dust" ? 18 : 34;
    context.strokeStyle = `rgba(${particle.color}, ${0.32 * renderState.glow})`;
    context.lineWidth = Math.max(0.6, particle.size * 0.6);
    context.beginPath();
    context.moveTo(
      renderState.position.x -
        Math.cos(particle.angle) *
          tailLength *
          renderState.glow *
          renderState.arrival,
      renderState.position.y -
        Math.sin(particle.angle) *
          tailLength *
          renderState.glow *
          renderState.arrival,
    );
    context.lineTo(renderState.position.x, renderState.position.y);
    context.stroke();
  }

  function drawParticle(context, particle, elapsedMs) {
    const renderState = particleRenderState(particle, elapsedMs);
    if (!renderState) {
      return;
    }

    const opacity =
      particle.finalOpacity *
      easeOutCubic(
        unit(renderState.progress * (renderState.isSpark ? 3.2 : 2.1)),
      ) *
      renderState.sparkFade *
      (0.72 + renderState.position.settle * 0.28);

    context.globalCompositeOperation =
      particle.kind === "dust" ? "source-over" : "lighter";
    context.globalAlpha = opacity;
    drawParticleTail(context, particle, renderState);
    context.fillStyle = `rgba(${particle.color}, 1)`;
    context.shadowBlur = particleShadowBlur(particle, renderState);
    context.shadowColor = `rgba(${particle.color}, 0.8)`;
    context.beginPath();
    context.arc(
      renderState.position.x,
      renderState.position.y,
      particle.size,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  root.PacePetsDashboardBigBangParticleDraw = Object.freeze({
    drawParticle,
  });
})(globalThis);

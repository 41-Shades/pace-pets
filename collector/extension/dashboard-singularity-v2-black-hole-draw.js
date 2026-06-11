(function attachPacePetsDashboardSingularityV2BlackHoleDraw(root) {
  "use strict";

  const APPROACH_DURATION_MS = 5400;
  const FADE_DURATION_MS = 900;
  const HOLD_DURATION_MS = 1400;
  const PARTICLE_COUNT = 96;
  const TAU = Math.PI * 2;
  const TOTAL_DURATION_MS =
    APPROACH_DURATION_MS + HOLD_DURATION_MS + FADE_DURATION_MS;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  }

  function easeInOutCubic(value) {
    const progress = clamp(value, 0, 1);
    if (progress < 0.5) {
      return 4 * progress * progress * progress;
    }

    return 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  function smoothStep(start, end, value) {
    const progress = clamp((value - start) / (end - start), 0, 1);
    return progress * progress * (3 - 2 * progress);
  }

  function seededUnit(index, salt) {
    const value = Math.sin((index + 1) * (salt + 3.73) * 91.17) * 10000;
    return value - Math.floor(value);
  }

  function color(alpha, red, green, blue) {
    return `rgb(${red} ${green} ${blue} / ${clamp(alpha, 0, 1)})`;
  }

  function particleColor(particle, alpha) {
    return `hsl(${particle.hue} ${particle.saturation}% ${particle.lightness}% / ${clamp(
      alpha,
      0,
      1,
    )})`;
  }

  function createParticles() {
    return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
      angle: seededUnit(index, 1) * TAU,
      arc: 0.015 + seededUnit(index, 2) * 0.045,
      hue: seededUnit(index, 3) > 0.44 ? 36 : 198,
      lightness: 58 + seededUnit(index, 4) * 28,
      orbit: 0.74 + seededUnit(index, 5) * 0.9,
      saturation: 72 + seededUnit(index, 6) * 22,
      size: 1.4 + seededUnit(index, 7) * 4,
      speed: 0.00018 + seededUnit(index, 8) * 0.00032,
    }));
  }

  function createState() {
    return {
      particles: createParticles(),
    };
  }

  function sceneCenter(width, height, progress) {
    return {
      x: width * (0.56 - (1 - progress) * 0.04),
      y: height * (0.43 - (1 - progress) * 0.06),
    };
  }

  function sceneRadius(width, height, progress) {
    const maxRadius = clamp(Math.min(width, height) * 0.24, 116, 250);
    return 2 + maxRadius * easeOutCubic(progress);
  }

  function drawRadialGlow(context, center, radius, opacity) {
    const glow = context.createRadialGradient(
      center.x,
      center.y,
      radius * 0.3,
      center.x,
      center.y,
      radius * 4.2,
    );
    glow.addColorStop(0, color(opacity * 0.46, 216, 237, 255));
    glow.addColorStop(0.14, color(opacity * 0.24, 90, 183, 255));
    glow.addColorStop(0.44, color(opacity * 0.12, 45, 90, 210));
    glow.addColorStop(1, color(0, 1, 6, 20));

    context.save();
    context.globalCompositeOperation = "screen";
    context.fillStyle = glow;
    context.beginPath();
    context.arc(center.x, center.y, radius * 4.2, 0, TAU);
    context.fill();
    context.restore();
  }

  function drawJets(context, center, radius, progress, opacity) {
    const jetAlpha = opacity * smoothStep(0.26, 0.78, progress);
    if (jetAlpha <= 0) {
      return;
    }

    const beam = context.createLinearGradient(
      center.x,
      center.y - radius * 4.2,
      center.x,
      center.y + radius * 4.2,
    );
    beam.addColorStop(0, color(0, 120, 165, 255));
    beam.addColorStop(0.4, color(jetAlpha * 0.3, 156, 190, 255));
    beam.addColorStop(0.5, color(jetAlpha * 0.78, 244, 248, 255));
    beam.addColorStop(0.6, color(jetAlpha * 0.3, 156, 190, 255));
    beam.addColorStop(1, color(0, 120, 165, 255));

    context.save();
    context.globalCompositeOperation = "screen";
    context.strokeStyle = beam;
    context.lineCap = "round";
    context.lineWidth = Math.max(2, radius * 0.08);
    context.beginPath();
    context.moveTo(center.x, center.y - radius * 4.2);
    context.lineTo(center.x, center.y + radius * 4.2);
    context.stroke();
    context.restore();
  }

  function drawDiskRings(context, center, radius, elapsedMs, opacity) {
    const rotation = elapsedMs * 0.00018;
    context.save();
    context.translate(center.x, center.y);
    context.rotate(-0.12 + Math.sin(rotation) * 0.02);
    context.scale(1, 0.34);
    context.globalCompositeOperation = "screen";

    for (let ring = 0; ring < 5; ring += 1) {
      const ringRadius = radius * (1.04 + ring * 0.26);
      const alpha = opacity * (0.42 - ring * 0.054);
      context.strokeStyle =
        ring % 2 === 0
          ? color(alpha, 255, 236, 192)
          : color(alpha * 0.72, 111, 207, 255);
      context.lineWidth = Math.max(1, radius * (0.055 - ring * 0.006));
      context.beginPath();
      context.ellipse(0, 0, ringRadius, ringRadius, 0, 0, TAU);
      context.stroke();
    }

    context.restore();
  }

  function drawDiskParticles(context, state, center, radius, elapsedMs) {
    context.save();
    context.translate(center.x, center.y);
    context.rotate(-0.12);
    context.scale(1, 0.34);
    context.globalCompositeOperation = "screen";
    context.lineCap = "round";

    for (const particle of state.particles) {
      const angle = particle.angle + elapsedMs * particle.speed;
      const orbitRadius = radius * particle.orbit;
      const frontBoost = Math.sin(angle) > 0 ? 1.22 : 0.64;
      context.strokeStyle = particleColor(
        particle,
        state.opacity * frontBoost * 0.62,
      );
      context.lineWidth = Math.max(1, particle.size);
      context.beginPath();
      context.arc(0, 0, orbitRadius, angle, angle + particle.arc);
      context.stroke();
    }

    context.restore();
  }

  function drawHorizon(context, center, radius, opacity) {
    context.save();
    context.shadowBlur = radius * 0.28;
    context.shadowColor = color(opacity * 0.9, 0, 0, 0);
    context.fillStyle = color(opacity, 0, 0, 2);
    context.beginPath();
    context.ellipse(
      center.x,
      center.y,
      radius * 0.88,
      radius * 0.56,
      0,
      0,
      TAU,
    );
    context.fill();

    context.shadowBlur = 0;
    context.strokeStyle = color(opacity * 0.76, 240, 248, 255);
    context.lineWidth = Math.max(1, radius * 0.035);
    context.beginPath();
    context.ellipse(
      center.x,
      center.y,
      radius * 1.02,
      radius * 0.68,
      0,
      0,
      TAU,
    );
    context.stroke();
    context.restore();
  }

  function drawFrame(context, state, size, elapsedMs) {
    const approachProgress = easeInOutCubic(elapsedMs / APPROACH_DURATION_MS);
    const fadeProgress = easeInOutCubic(
      (elapsedMs - APPROACH_DURATION_MS - HOLD_DURATION_MS) / FADE_DURATION_MS,
    );
    const opacity =
      smoothStep(0.03, 0.24, approachProgress) * (1 - fadeProgress);
    const center = sceneCenter(size.width, size.height, approachProgress);
    const radius = sceneRadius(size.width, size.height, approachProgress);
    state.opacity = opacity;

    context.clearRect(0, 0, size.width, size.height);
    if (opacity <= 0) {
      return;
    }

    drawRadialGlow(context, center, radius, opacity);
    drawJets(context, center, radius, approachProgress, opacity);
    drawDiskRings(context, center, radius, elapsedMs, opacity);
    drawDiskParticles(context, state, center, radius, elapsedMs);
    drawHorizon(context, center, radius, opacity);
  }

  root.PacePetsDashboardSingularityV2BlackHoleDraw = Object.freeze({
    createState,
    drawFrame,
    totalDurationMs: TOTAL_DURATION_MS,
  });
})(globalThis);

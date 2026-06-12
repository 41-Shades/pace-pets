(function attachPacePetsDashboardSingularityBlackHoleV1Draw(root) {
  "use strict";

  const APPROACH_DURATION_MS = 7600;
  const PARTICLE_COUNT = 128;
  const TAU = Math.PI * 2;

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
      arc: 0.012 + seededUnit(index, 2) * 0.07,
      hue: seededUnit(index, 3) > 0.44 ? 36 : 198,
      lightness: 54 + seededUnit(index, 4) * 34,
      orbit: 0.68 + seededUnit(index, 5) * 1.18,
      saturation: 74 + seededUnit(index, 6) * 24,
      size: 1.1 + seededUnit(index, 7) * 5.2,
      speed: 0.0002 + seededUnit(index, 8) * 0.00042,
    }));
  }

  function createState() {
    return {
      particles: createParticles(),
    };
  }

  function sceneCenter(width, height, progress) {
    return {
      x: width * (0.58 - (1 - progress) * 0.08),
      y: height * (0.43 - (1 - progress) * 0.1),
    };
  }

  function sceneRadius(width, height, progress) {
    const maxRadius = clamp(Math.min(width, height) * 0.32, 150, 340);
    return 0.6 + maxRadius * easeOutCubic(progress);
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
    glow.addColorStop(0, color(opacity * 0.5, 232, 244, 255));
    glow.addColorStop(0.12, color(opacity * 0.25, 99, 197, 255));
    glow.addColorStop(0.38, color(opacity * 0.09, 42, 90, 220));
    glow.addColorStop(1, color(0, 1, 6, 20));

    context.save();
    context.globalCompositeOperation = "screen";
    context.fillStyle = glow;
    context.beginPath();
    context.arc(center.x, center.y, radius * 4.2, 0, TAU);
    context.fill();
    context.restore();
  }

  function drawJets(context, center, radius, state) {
    const jetAlpha =
      state.opacity * smoothStep(0.42, 0.86, state.approachProgress);
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

  function drawDiskRings(context, state, center, radius, elapsedMs) {
    const rotation = elapsedMs * 0.00018;
    context.save();
    context.translate(center.x, center.y);
    context.rotate(-0.12 + Math.sin(rotation) * 0.02);
    context.scale(1, 0.34);
    context.globalCompositeOperation = "screen";

    for (let ring = 0; ring < 5; ring += 1) {
      const ringRadius = radius * (1.04 + ring * 0.26);
      const alpha = state.diskOpacity * (0.46 - ring * 0.05);
      context.lineWidth = Math.max(1, radius * (0.055 - ring * 0.006));
      context.beginPath();
      context.strokeStyle = color(alpha * 0.28, 116, 187, 255);
      context.ellipse(0, 0, ringRadius, ringRadius, 0, 0, TAU);
      context.stroke();
      context.beginPath();
      context.strokeStyle = color(alpha * 1.05, 255, 241, 205);
      context.ellipse(0, 0, ringRadius, ringRadius, 0, 0.08 * TAU, 0.46 * TAU);
      context.stroke();
      context.beginPath();
      context.strokeStyle = color(alpha * 0.82, 87, 206, 255);
      context.ellipse(0, 0, ringRadius, ringRadius, 0, 0.56 * TAU, 0.9 * TAU);
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
      const frontBoost = Math.sin(angle) > 0 ? 1.55 : 0.38;
      const sideBoost = 0.72 + smoothStep(-0.25, 1, Math.cos(angle)) * 0.72;
      context.strokeStyle = particleColor(
        particle,
        state.diskOpacity * frontBoost * sideBoost * 0.62,
      );
      context.lineWidth = Math.max(1, particle.size);
      context.beginPath();
      context.arc(0, 0, orbitRadius, angle, angle + particle.arc);
      context.stroke();
    }

    context.restore();
  }

  function drawHorizon(context, center, radius, state) {
    context.save();
    context.shadowBlur = radius * 0.5;
    context.shadowColor = color(state.opacity, 0, 0, 0);
    context.fillStyle = color(state.opacity, 0, 0, 1);
    context.beginPath();
    context.ellipse(
      center.x,
      center.y,
      radius * 0.98,
      radius * 0.63,
      0,
      0,
      TAU,
    );
    context.fill();

    context.shadowBlur = 0;
    context.strokeStyle = color(state.diskOpacity * 0.94, 249, 253, 255);
    context.lineWidth = Math.max(1, radius * 0.052);
    context.beginPath();
    context.ellipse(
      center.x,
      center.y,
      radius * 1.08,
      radius * 0.72,
      0,
      0,
      TAU,
    );
    context.stroke();
    context.restore();
  }

  function drawFrame(context, state, size, elapsedMs) {
    const approachProgress = easeInOutCubic(elapsedMs / APPROACH_DURATION_MS);
    const opacity = smoothStep(0.02, 0.38, approachProgress);
    const center = sceneCenter(size.width, size.height, approachProgress);
    const radius = sceneRadius(size.width, size.height, approachProgress);
    state.approachProgress = approachProgress;
    state.diskOpacity = opacity * smoothStep(0.18, 0.58, approachProgress);
    state.opacity = opacity;

    context.clearRect(0, 0, size.width, size.height);
    if (opacity <= 0) {
      return;
    }

    drawRadialGlow(context, center, radius, opacity);
    drawJets(context, center, radius, state);
    drawDiskRings(context, state, center, radius, elapsedMs);
    drawDiskParticles(context, state, center, radius, elapsedMs);
    drawHorizon(context, center, radius, state);
  }

  root.PacePetsDashboardSingularityBlackHoleV1Draw = Object.freeze({
    createState,
    drawFrame,
  });
})(globalThis);

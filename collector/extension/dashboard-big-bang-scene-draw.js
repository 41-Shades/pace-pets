(function attachPacePetsDashboardBigBangSceneDraw(root) {
  "use strict";

  const EJECTA_DRAW = root.PacePetsDashboardBigBangEjectaDraw;
  const PARTICLE_DRAW = root.PacePetsDashboardBigBangParticleDraw;
  const PLUME_DRAW = root.PacePetsDashboardBigBangPlumeDraw;
  const RECEDE_DRAW = root.PacePetsDashboardBigBangRecedeDraw;
  if (!EJECTA_DRAW || !PARTICLE_DRAW || !PLUME_DRAW || !RECEDE_DRAW) {
    throw new Error("Big Bang draw helpers must load before scene draw.");
  }

  const TWO_PI = Math.PI * 2;
  const SEED_SPARKLE_MS = 720;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function unit(value) {
    return clamp(value, 0, 1);
  }

  function easeOutCubic(value) {
    return 1 - (1 - value) ** 3;
  }

  function easeOutQuart(value) {
    return 1 - (1 - value) ** 4;
  }

  function easeInCubic(value) {
    return value ** 3;
  }

  function easeInOutCubic(value) {
    return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
  }

  function pointFor(origin, angle, radius) {
    return {
      x: origin.x + Math.cos(angle) * radius,
      y: origin.y + Math.sin(angle) * radius,
    };
  }

  function resetDrawState(context) {
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.shadowBlur = 0;
  }

  function drawBackground(context, width, height, elapsedMs) {
    context.clearRect(0, 0, width, height);
    resetDrawState(context);
    context.fillStyle = "#020617";
    context.fillRect(0, 0, width, height);

    const bloom = unit((elapsedMs - 900) / 5200);
    const gradient = context.createRadialGradient(
      width * 0.5,
      height * 0.48,
      0,
      width * 0.5,
      height * 0.52,
      Math.max(width, height) * 0.84,
    );
    gradient.addColorStop(0, `rgba(49, 46, 129, ${0.34 * bloom})`);
    gradient.addColorStop(0.42, `rgba(15, 23, 42, ${0.48 * bloom})`);
    gradient.addColorStop(1, "rgba(2, 6, 23, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  function drawStageOneExplosion(context, scene, elapsedMs) {
    const seed =
      elapsedMs < 0 ? unit((elapsedMs + SEED_SPARKLE_MS) / SEED_SPARKLE_MS) : 0;
    const attack = unit(elapsedMs / 520);
    const fade = 1 - unit((elapsedMs - 760) / 620);
    const seedTwinkle =
      seed * (0.68 + 0.32 * Math.sin((elapsedMs + SEED_SPARKLE_MS) * 0.044));
    const intensity = Math.max(
      seedTwinkle,
      easeOutCubic(attack) * Math.max(0, fade),
    );
    if (intensity <= 0) {
      return;
    }

    const { width, height } = scene;
    const center = { x: width / 2, y: height / 2 };
    const edge = Math.min(width, height);
    const contraction = easeInOutCubic(unit((elapsedMs - 560) / 620));
    const radius =
      seed > 0
        ? edge * (0.0038 + 0.0044 * seedTwinkle)
        : edge *
          (0.014 + 0.088 * easeOutCubic(attack) * (1 - contraction * 0.14));
    const gradient = context.createRadialGradient(
      center.x,
      center.y,
      0,
      center.x,
      center.y,
      radius,
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.98 * intensity})`);
    gradient.addColorStop(0.18, `rgba(254, 243, 199, ${0.9 * intensity})`);
    gradient.addColorStop(0.5, `rgba(250, 204, 21, ${0.48 * intensity})`);
    gradient.addColorStop(1, "rgba(248, 113, 113, 0)");

    context.save();
    context.globalCompositeOperation = "lighter";
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    for (const dot of scene.ignitionCloud) {
      const progress = easeOutCubic(
        unit((elapsedMs - dot.delayMs) / dot.durationMs),
      );
      const dotFade =
        1 - unit((elapsedMs - dot.delayMs - dot.durationMs * 0.42) / 520);
      if (progress <= 0 || dotFade <= 0) {
        continue;
      }

      const drift =
        edge * dot.distanceRatio * progress * (1 - contraction * 0.22);
      const wobble = Math.sin(elapsedMs * 0.0028 + dot.phase) * edge * 0.005;
      const point = pointFor(
        center,
        dot.angle,
        drift + wobble * (1 - progress),
      );
      context.globalAlpha = dot.opacity * dotFade * intensity;
      context.fillStyle = `rgba(${dot.color}, 1)`;
      context.shadowBlur = edge * dot.sizeRatio * 4;
      context.shadowColor = `rgba(${dot.color}, 0.86)`;
      context.beginPath();
      context.arc(point.x, point.y, edge * dot.sizeRatio, 0, TWO_PI);
      context.fill();
    }
    context.restore();
  }

  function drawStageTwoCore(context, width, height, elapsedMs) {
    const attack = unit((elapsedMs - 1120) / 700);
    const fade = 1 - unit((elapsedMs - 2700) / 1900);
    const flicker = 0.9 + 0.1 * Math.sin(elapsedMs * 0.014 + 0.7);
    const intensity = easeOutQuart(attack) * Math.max(0, fade) * flicker;
    if (intensity <= 0) {
      return;
    }

    const radius =
      Math.max(width, height) * (0.035 + 0.42 * easeOutCubic(attack));
    const gradient = context.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      radius,
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.95 * intensity})`);
    gradient.addColorStop(0.12, `rgba(254, 249, 195, ${0.86 * intensity})`);
    gradient.addColorStop(0.34, `rgba(125, 211, 252, ${0.42 * intensity})`);
    gradient.addColorStop(0.58, `rgba(249, 115, 22, ${0.22 * intensity})`);
    gradient.addColorStop(1, "rgba(2, 6, 23, 0)");

    context.save();
    context.globalCompositeOperation = "lighter";
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  function drawExpansionEnvelope(context, width, height, elapsedMs) {
    const progress = easeOutCubic(unit((elapsedMs - 1240) / 1550));
    const fade = 1 - easeInCubic(unit((elapsedMs - 2500) / 980));
    if (progress <= 0 || fade <= 0) {
      return;
    }

    const edge = Math.max(width, height);
    const radius = edge * (0.08 + progress * 1.26);
    const center = { x: width / 2, y: height / 2 };
    const intensity = fade * (0.9 + 0.1 * Math.sin(elapsedMs * 0.012));
    const gradient = context.createRadialGradient(
      center.x,
      center.y,
      edge * 0.018,
      center.x,
      center.y,
      radius,
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.74 * intensity})`);
    gradient.addColorStop(0.18, `rgba(254, 243, 199, ${0.52 * intensity})`);
    gradient.addColorStop(0.44, `rgba(125, 211, 252, ${0.32 * intensity})`);
    gradient.addColorStop(0.72, `rgba(249, 115, 22, ${0.18 * intensity})`);
    gradient.addColorStop(1, "rgba(2, 6, 23, 0)");

    context.save();
    context.globalCompositeOperation = "lighter";
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = `rgba(255, 248, 220, ${0.16 * intensity * progress})`;
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  function drawEnergyRay(context, ray, width, height, elapsedMs) {
    const progress = easeOutCubic(
      unit((elapsedMs - ray.delayMs) / ray.travelMs),
    );
    const fade =
      1 -
      easeInCubic(
        unit(
          (elapsedMs - ray.delayMs - ray.travelMs * 0.48) /
            (ray.travelMs * 0.84),
        ),
      );
    if (progress <= 0 || fade <= 0) {
      return;
    }

    const center = { x: width / 2, y: height / 2 };
    const angle =
      ray.angle +
      Math.sin(elapsedMs * 0.012 + ray.phase) * ray.wobble * (1 - progress);
    const reach = Math.max(width, height) * ray.lengthRatio * progress;
    const innerRadius = Math.max(width, height) * 0.02 * progress;
    const innerWidth = ray.width * 0.5;
    const outerWidth = ray.width * (0.3 + 0.8 * (1 - progress));
    const leftInner = pointFor(center, angle - innerWidth, innerRadius);
    const rightInner = pointFor(center, angle + innerWidth, innerRadius);
    const leftOuter = pointFor(center, angle - outerWidth, reach);
    const rightOuter = pointFor(center, angle + outerWidth, reach);
    const tip = pointFor(center, angle, reach);
    const gradient = context.createLinearGradient(
      center.x,
      center.y,
      tip.x,
      tip.y,
    );
    const opacity =
      ray.opacity * fade * (0.9 + 0.1 * Math.sin(elapsedMs * 0.018));
    gradient.addColorStop(0, `rgba(${ray.color}, 0)`);
    gradient.addColorStop(0.22, `rgba(${ray.color}, ${opacity * 0.6})`);
    gradient.addColorStop(0.62, `rgba(${ray.color}, ${opacity})`);
    gradient.addColorStop(1, `rgba(${ray.color}, 0)`);

    context.save();
    context.globalCompositeOperation = "lighter";
    context.filter = `blur(${2 + 4.4 * (1 - progress)}px)`;
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(leftInner.x, leftInner.y);
    context.lineTo(leftOuter.x, leftOuter.y);
    context.lineTo(tip.x, tip.y);
    context.lineTo(rightOuter.x, rightOuter.y);
    context.lineTo(rightInner.x, rightInner.y);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawShockArc(context, arc, width, height, elapsedMs) {
    const progress = easeOutCubic(
      unit((elapsedMs - arc.delayMs) / arc.travelMs),
    );
    const fade =
      1 -
      easeInCubic(
        unit(
          (elapsedMs - arc.delayMs - arc.travelMs * 0.5) /
            (arc.travelMs * 0.82),
        ),
      );
    if (progress <= 0 || fade <= 0) {
      return;
    }

    const radius = Math.max(width, height) * arc.radiusRatio * progress;
    const wobble =
      Math.sin(elapsedMs * 0.009 + arc.phase) * 0.06 * (1 - progress);
    const start = arc.angle + wobble;
    const opacity =
      arc.opacity * fade * (0.88 + 0.12 * Math.sin(elapsedMs * 0.02));
    context.save();
    context.globalCompositeOperation = "lighter";
    context.filter = `blur(${1.4 + 2.6 * (1 - progress)}px)`;
    context.lineCap = "round";
    context.lineWidth = Math.max(0.8, arc.lineWidth * (1 - progress * 0.62));
    context.strokeStyle = `rgba(${arc.color}, ${opacity})`;
    context.shadowBlur = 24 * fade;
    context.shadowColor = `rgba(${arc.color}, 0.8)`;
    context.beginPath();
    context.arc(width / 2, height / 2, radius, start, start + arc.span);
    context.stroke();
    context.restore();
  }

  function drawFrame(context, scene, elapsedMs) {
    const bangElapsedMs = elapsedMs - SEED_SPARKLE_MS;
    drawBackground(context, scene.width, scene.height, bangElapsedMs);
    EJECTA_DRAW.drawEjectaLayer(context, scene.ejecta, bangElapsedMs);
    drawStageOneExplosion(context, scene, bangElapsedMs);
    PLUME_DRAW.drawIgnitionPlumes(
      context,
      scene.ignitionPlumes,
      scene.width,
      scene.height,
      bangElapsedMs,
    );
    for (const spark of scene.sparks) {
      PARTICLE_DRAW.drawParticle(context, spark, bangElapsedMs);
    }
    resetDrawState(context);
    drawStageTwoCore(context, scene.width, scene.height, bangElapsedMs);
    drawExpansionEnvelope(context, scene.width, scene.height, bangElapsedMs);
    for (const ray of scene.energyRays) {
      drawEnergyRay(context, ray, scene.width, scene.height, bangElapsedMs);
    }
    for (const arc of scene.shockArcs) {
      drawShockArc(context, arc, scene.width, scene.height, bangElapsedMs);
    }
    RECEDE_DRAW.drawRecedingEnvelope(
      context,
      scene.width,
      scene.height,
      bangElapsedMs,
      scene.recedeSeed,
    );
    for (const particle of scene.dust) {
      PARTICLE_DRAW.drawParticle(context, particle, bangElapsedMs);
    }
    for (const star of scene.stars) {
      PARTICLE_DRAW.drawParticle(context, star, bangElapsedMs);
    }
    resetDrawState(context);
  }

  root.PacePetsDashboardBigBangSceneDraw = Object.freeze({ drawFrame, unit });
})(globalThis);

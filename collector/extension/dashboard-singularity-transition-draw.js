(function attachPacePetsDashboardSingularityTransitionDraw(root) {
  "use strict";

  const DATA = root.PacePetsDashboardSingularityTransitionData;
  const MOTION = root.PacePetsDashboardSingularityTransitionMotion;
  if (!DATA || !MOTION) {
    throw new Error(
      "Singularity transition data and motion must load before draw helpers.",
    );
  }

  function drawTileImage(scene, tile) {
    const context = scene.context;
    const left = -tile.w / 2;
    const top = -tile.h / 2;
    if (!scene.image) {
      context.fillStyle = "rgb(228 235 244 / 0.82)";
      context.fillRect(left, top, tile.w, tile.h);
      return;
    }

    const sourceX = (tile.x / scene.size.width) * scene.image.width;
    const sourceY = (tile.y / scene.size.height) * scene.image.height;
    const sourceW = (tile.w / scene.size.width) * scene.image.width;
    const sourceH = (tile.h / scene.size.height) * scene.image.height;
    context.drawImage(
      scene.image,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      left,
      top,
      tile.w,
      tile.h,
    );
  }

  function drawTile(scene, tile, elapsedMs, intro) {
    const localProgress = MOTION.phase(
      elapsedMs,
      DATA.TIMELINE.gravityMs + tile.delayMs,
      DATA.TIMELINE.intakeMs * 0.82,
    );
    if (localProgress >= 1) {
      return;
    }

    const eased = MOTION.easeInCubic(localProgress);
    const centerX = tile.x + tile.w / 2;
    const centerY = tile.y + tile.h / 2;
    const angle =
      Math.atan2(centerY - scene.center.y, centerX - scene.center.x) +
      tile.orbit * eased;
    const distance = Math.hypot(
      centerX - scene.center.x,
      centerY - scene.center.y,
    );
    const radius = distance * Math.pow(1 - eased, 1.92);
    const scale = 1 - eased * (1 - tile.endScale);
    const lift = Math.sin(intro * Math.PI) * tile.startLift;
    const x = scene.center.x + Math.cos(angle) * radius;
    const y = scene.center.y + Math.sin(angle) * radius + lift;

    scene.context.save();
    scene.context.globalAlpha = MOTION.clamp(1 - eased * 1.12, 0, 1);
    scene.context.translate(x, y);
    scene.context.rotate(tile.spin * eased);
    scene.context.scale(scale * tile.depth, scale * tile.depth);
    drawTileImage(scene, tile);
    scene.context.restore();
  }

  function drawIntake(scene, elapsedMs) {
    const intro = MOTION.phase(elapsedMs, 0, DATA.TIMELINE.gravityMs);
    const intake = MOTION.phase(
      elapsedMs,
      DATA.TIMELINE.gravityMs,
      DATA.TIMELINE.intakeMs,
    );
    const backdropOpacity = 1 - intake * DATA.BACKDROP_FADE_OPACITY;

    if (scene.image) {
      scene.context.globalAlpha = backdropOpacity;
      scene.context.drawImage(
        scene.image,
        0,
        0,
        scene.size.width,
        scene.size.height,
      );
      scene.context.globalAlpha = 1;
    }

    for (const tile of scene.tiles) {
      drawTile(scene, tile, elapsedMs, intro);
    }
  }

  function drawBlackHole(scene, elapsedMs) {
    const intake = MOTION.phase(
      elapsedMs,
      DATA.TIMELINE.gravityMs,
      DATA.TIMELINE.intakeMs,
    );
    const bang = MOTION.phase(
      elapsedMs,
      scene.starts.holdEnd,
      DATA.TIMELINE.bangMs,
    );
    const ringRadius = 42 + intake * 92 - bang * 34;
    const context = scene.context;
    const gradient = context.createRadialGradient(
      scene.center.x,
      scene.center.y,
      ringRadius * 0.32,
      scene.center.x,
      scene.center.y,
      ringRadius * 1.7,
    );

    gradient.addColorStop(0, "rgb(0 0 0 / 1)");
    gradient.addColorStop(0.42, "rgb(0 0 0 / 0.95)");
    gradient.addColorStop(0.58, "rgb(125 211 252 / 0.34)");
    gradient.addColorStop(0.7, "rgb(250 204 21 / 0.34)");
    gradient.addColorStop(1, "rgb(0 0 0 / 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(
      scene.center.x,
      scene.center.y,
      ringRadius * 1.75,
      0,
      Math.PI * 2,
    );
    context.fill();

    context.save();
    context.translate(scene.center.x, scene.center.y);
    context.rotate(elapsedMs / 860);
    context.strokeStyle = "rgb(249 250 251 / 0.52)";
    context.lineWidth = 1.4;
    context.beginPath();
    context.ellipse(
      0,
      0,
      ringRadius * 1.34,
      ringRadius * 0.28,
      -0.3,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
  }

  function drawStreak(scene, streak, progress, elapsedMs) {
    const pulse =
      (progress * streak.speed + streak.offset + elapsedMs / 2400) % 1;
    const radius = streak.length * (0.4 + pulse * 2.2);
    const startX = scene.center.x + Math.cos(streak.angle) * radius * 0.26;
    const startY = scene.center.y + Math.sin(streak.angle) * radius * 0.26;
    const endX = scene.center.x + Math.cos(streak.angle) * radius;
    const endY = scene.center.y + Math.sin(streak.angle) * radius;

    scene.context.globalAlpha = progress * (1 - pulse) * 0.72;
    scene.context.strokeStyle = "rgb(148 219 255 / 0.86)";
    scene.context.lineWidth = streak.width;
    scene.context.beginPath();
    scene.context.moveTo(startX, startY);
    scene.context.lineTo(endX, endY);
    scene.context.stroke();
    scene.context.globalAlpha = 1;
  }

  function drawTunnel(scene, elapsedMs) {
    const progress = MOTION.phase(
      elapsedMs,
      scene.starts.intakeEnd - 420,
      DATA.TIMELINE.tunnelMs + 520,
    );
    if (progress <= 0) {
      return;
    }

    for (const streak of scene.streaks) {
      drawStreak(scene, streak, progress, elapsedMs);
    }
  }

  function drawSingularityPoint(scene, elapsedMs) {
    const hold = MOTION.phase(
      elapsedMs,
      scene.starts.tunnelEnd - 140,
      DATA.TIMELINE.holdMs + 180,
    );
    const bang = MOTION.phase(
      elapsedMs,
      scene.starts.holdEnd,
      DATA.TIMELINE.bangMs,
    );
    if (hold <= 0 || bang > 0.62) {
      return;
    }

    const pulse = 0.5 + Math.sin(elapsedMs / 80) * 0.5;
    const radius = 1.8 + hold * 4.2 + pulse * 1.4 + bang * 18;
    scene.context.fillStyle = `rgb(255 255 255 / ${0.28 + hold * 0.7})`;
    scene.context.beginPath();
    scene.context.arc(scene.center.x, scene.center.y, radius, 0, Math.PI * 2);
    scene.context.fill();
  }

  function drawShockwave(scene, eased) {
    const radius = eased * Math.hypot(scene.size.width, scene.size.height);
    scene.context.globalAlpha = Math.max(0, 1 - eased);
    scene.context.fillStyle = "rgb(255 255 255 / 0.84)";
    scene.context.beginPath();
    scene.context.arc(
      scene.center.x,
      scene.center.y,
      radius * 0.18,
      0,
      Math.PI * 2,
    );
    scene.context.fill();
    scene.context.strokeStyle = "rgb(255 255 255 / 0.7)";
    scene.context.lineWidth = 4;
    scene.context.beginPath();
    scene.context.arc(
      scene.center.x,
      scene.center.y,
      radius * 0.36,
      0,
      Math.PI * 2,
    );
    scene.context.stroke();
    scene.context.globalAlpha = 1;
  }

  function drawBangParticle(scene, particle, progress) {
    const local = MOTION.clamp((progress - particle.delay) / 0.82, 0, 1);
    if (local <= 0) {
      return;
    }

    const eased = MOTION.easeOutCubic(local);
    const x =
      particle.startX + Math.cos(particle.angle) * particle.radius * eased;
    const y =
      particle.startY + Math.sin(particle.angle) * particle.radius * eased;
    scene.context.globalAlpha = Math.max(0, 1 - local);
    scene.context.fillStyle = particle.color;
    scene.context.beginPath();
    scene.context.arc(x, y, particle.size * (1 - local * 0.55), 0, Math.PI * 2);
    scene.context.fill();
    scene.context.globalAlpha = 1;
  }

  function drawBigBang(scene, elapsedMs) {
    const progress = MOTION.phase(
      elapsedMs,
      scene.starts.holdEnd,
      DATA.TIMELINE.bangMs,
    );
    if (progress <= 0) {
      return;
    }

    drawShockwave(scene, MOTION.easeOutCubic(progress));
    for (const particle of scene.bangParticles) {
      drawBangParticle(scene, particle, progress);
    }
  }

  function drawFade(scene, elapsedMs) {
    const fade = MOTION.phase(
      elapsedMs,
      scene.starts.bangEnd,
      DATA.TIMELINE.fadeMs,
    );
    if (fade <= 0) {
      return;
    }

    document.body.classList.remove(DATA.BODY_CLASS);
    scene.overlay.style.opacity = String(1 - MOTION.easeInOutCubic(fade));
  }

  function drawReducedMotion(scene, elapsedMs) {
    const progress = MOTION.phase(elapsedMs, 0, DATA.TIMELINE.holdMs);
    const radius = 18 + progress * 260;
    const gradient = scene.context.createRadialGradient(
      scene.center.x,
      scene.center.y,
      0,
      scene.center.x,
      scene.center.y,
      radius,
    );
    gradient.addColorStop(0, "rgb(255 255 255 / 0.9)");
    gradient.addColorStop(0.18, "rgb(125 211 252 / 0.36)");
    gradient.addColorStop(1, "rgb(1 1 4 / 0)");
    scene.context.fillStyle = gradient;
    scene.context.fillRect(0, 0, scene.size.width, scene.size.height);
    if (elapsedMs >= DATA.TIMELINE.holdMs) {
      scene.finish(true);
    }
  }

  function drawFrame(scene, elapsedMs) {
    scene.context.clearRect(0, 0, scene.size.width, scene.size.height);
    scene.context.fillStyle = "#010104";
    scene.context.fillRect(0, 0, scene.size.width, scene.size.height);

    if (scene.reducedMotion) {
      drawReducedMotion(scene, elapsedMs);
      return;
    }

    drawIntake(scene, elapsedMs);
    drawTunnel(scene, elapsedMs);
    drawBlackHole(scene, elapsedMs);
    drawSingularityPoint(scene, elapsedMs);
    drawBigBang(scene, elapsedMs);
    drawFade(scene, elapsedMs);
  }

  root.PacePetsDashboardSingularityTransitionDraw = Object.freeze({
    drawFrame,
  });
})(globalThis);

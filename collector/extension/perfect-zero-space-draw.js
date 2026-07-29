(function attachPacePetsPerfectZeroSpaceDraw(root) {
  "use strict";

  const DATA = root.PacePetsPerfectZeroSpaceData;
  const MOTION = root.PacePetsPerfectZeroSpaceMotion;
  if (!DATA || !MOTION) {
    throw new Error(
      "Perfect-zero scene data and motion helpers must load before perfect-zero-space-draw.js.",
    );
  }
  const { starProgress, updateStarSparkle } = MOTION;

  function drawRoundedRectPath(context, rect) {
    const { height, radius, width, x, y } = rect;
    const cornerRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + cornerRadius, y);
    context.lineTo(x + width - cornerRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
    context.lineTo(x + width, y + height - cornerRadius);
    context.quadraticCurveTo(
      x + width,
      y + height,
      x + width - cornerRadius,
      y + height,
    );
    context.lineTo(x + cornerRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
    context.lineTo(x, y + cornerRadius);
    context.quadraticCurveTo(x, y, x + cornerRadius, y);
    context.closePath();
  }

  function drawSceneFramePath(context, frame, width, height) {
    if (frame.type === "fullBleed") {
      context.rect(0, 0, width, height);
      return;
    }

    drawRoundedRectPath(context, {
      height: height * frame.heightRatio,
      radius: Math.min(width, height) * frame.radiusRatio,
      width: width * frame.widthRatio,
      x: width * frame.insetXRatio,
      y: height * frame.insetYRatio,
    });
  }

  function createBackgroundGradient(context, scene, width, height) {
    const gradient = scene.gradient;
    const backgroundGradient = context.createRadialGradient(
      width * gradient.centerXRatio,
      height * gradient.centerYRatio,
      0,
      width * gradient.outerXRatio,
      height * gradient.outerYRatio,
      Math.max(width, height) * gradient.radiusRatio,
    );
    backgroundGradient.addColorStop(0, gradient.innerColor);
    backgroundGradient.addColorStop(
      gradient.middleStop,
      gradient.middleColor || scene.background,
    );
    backgroundGradient.addColorStop(1, gradient.outerColor);
    return backgroundGradient;
  }

  function drawBackdrop(context, scene, sceneState) {
    const { width, height } = sceneState;
    context.beginPath();
    drawSceneFramePath(context, scene.frame, width, height);
    context.fillStyle = createBackgroundGradient(context, scene, width, height);
    context.fill();
  }

  function drawPlanetDiscPath(context, half, xRatio = 0.74, yRatio = 0.76) {
    context.beginPath();
    context.ellipse(0, 0, half * xRatio, half * yRatio, 0, 0, Math.PI * 2);
  }

  function drawPlanetDisc(context, shape, half, xRatio = 0.74, yRatio = 0.76) {
    context.fillStyle = shape.fill;
    context.strokeStyle = shape.planetStroke || shape.stroke;
    context.lineWidth = Math.max(0.9, shape.size * 0.1);
    drawPlanetDiscPath(context, half, xRatio, yRatio);
    context.fill();
    context.stroke();
  }

  function drawSpherePlanet(context, shape, half) {
    drawPlanetDisc(context, shape, half);

    context.save();
    context.globalAlpha *= 0.46;
    context.fillStyle = shape.shade;
    context.beginPath();
    context.ellipse(
      half * 0.18,
      half * 0.06,
      half * 0.42,
      half * 0.56,
      0.24,
      -Math.PI * 0.5,
      Math.PI * 0.5,
    );
    context.fill();
    context.restore();

    context.fillStyle = shape.accent;
    context.beginPath();
    context.arc(-half * 0.28, -half * 0.3, half * 0.14, 0, Math.PI * 2);
    context.fill();
  }

  function drawBandedPlanet(context, shape, half) {
    context.save();
    drawPlanetDiscPath(context, half, 0.78, 0.72);
    context.clip();

    context.fillStyle = shape.fill;
    context.fillRect(-half, -half, shape.size, shape.size);
    context.fillStyle = shape.band || shape.accent;
    context.fillRect(-half * 0.84, -half * 0.36, half * 1.68, half * 0.18);
    context.fillRect(-half * 0.84, half * 0.2, half * 1.68, half * 0.16);
    context.fillStyle = shape.accent;
    context.fillRect(-half * 0.84, -half * 0.04, half * 1.68, half * 0.12);
    context.fillStyle = shape.spot || shape.shade;
    context.beginPath();
    context.ellipse(
      half * 0.28,
      half * 0.2,
      half * 0.17,
      half * 0.11,
      -0.2,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();

    context.strokeStyle = shape.planetStroke || shape.stroke;
    context.lineWidth = Math.max(0.9, shape.size * 0.1);
    drawPlanetDiscPath(context, half, 0.78, 0.72);
    context.stroke();
  }

  function drawCrateredPlanet(context, shape, half) {
    drawPlanetDisc(context, shape, half, 0.72, 0.72);

    context.save();
    context.globalAlpha *= 0.56;
    context.strokeStyle = shape.accent;
    context.fillStyle = shape.shade;
    context.lineWidth = Math.max(0.65, shape.size * 0.06);

    for (const crater of [
      [-0.26, -0.18, 0.16],
      [0.26, 0.18, 0.13],
      [0.08, -0.38, 0.08],
    ]) {
      context.beginPath();
      context.arc(
        half * crater[0],
        half * crater[1],
        Math.max(0.8, half * crater[2]),
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    }
    context.restore();
  }

  function drawEclipsePlanet(context, shape, half) {
    drawPlanetDisc(context, shape, half, 0.72, 0.72);

    context.save();
    context.rotate(-0.24);
    context.strokeStyle = shape.accent;
    context.lineCap = "round";
    context.lineWidth = Math.max(1, shape.size * 0.12);
    context.beginPath();
    context.arc(0, 0, half * 0.66, -Math.PI * 0.64, Math.PI * 0.64);
    context.stroke();
    context.restore();

    context.fillStyle = shape.stroke;
    context.beginPath();
    context.arc(-half * 0.2, -half * 0.24, half * 0.08, 0, Math.PI * 2);
    context.fill();
  }

  function drawRingedPlanet(context, shape, half) {
    context.lineCap = "round";
    context.lineJoin = "round";

    context.save();
    context.rotate(-0.34);
    context.strokeStyle = shape.rearRingStroke;
    context.lineWidth = Math.max(1, shape.size * 0.14);
    context.beginPath();
    context.ellipse(0, 0, half * 1.26, half * 0.42, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    context.fillStyle = shape.fill;
    context.strokeStyle = shape.planetStroke;
    context.lineWidth = Math.max(0.9, shape.size * 0.11);
    context.beginPath();
    context.ellipse(0, 0, half * 0.7, half * 0.76, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.save();
    context.rotate(-0.34);
    context.strokeStyle = shape.ringStroke;
    context.lineWidth = Math.max(1, shape.size * 0.12);
    context.beginPath();
    context.ellipse(0, 0, half * 1.26, half * 0.42, 0, 0.05, Math.PI - 0.05);
    context.stroke();
    context.restore();
  }

  function drawAsteroid(context, shape, half) {
    context.lineCap = "round";
    context.lineJoin = "round";

    context.fillStyle = shape.fill;
    context.strokeStyle = shape.stroke;
    context.lineWidth = Math.max(1, shape.size * 0.1);
    context.beginPath();
    context.moveTo(-half * 0.72, -half * 0.22);
    context.quadraticCurveTo(-half * 0.54, -half * 0.82, half * 0.04, -half);
    context.quadraticCurveTo(
      half * 0.62,
      -half * 0.92,
      half * 0.88,
      -half * 0.32,
    );
    context.quadraticCurveTo(half * 1.04, half * 0.2, half * 0.58, half * 0.72);
    context.quadraticCurveTo(
      half * 0.02,
      half * 1.02,
      -half * 0.56,
      half * 0.72,
    );
    context.quadraticCurveTo(
      -half * 1.02,
      half * 0.42,
      -half * 0.72,
      -half * 0.22,
    );
    context.closePath();
    context.fill();
    context.stroke();

    context.strokeStyle = shape.accent;
    context.lineWidth = Math.max(0.7, shape.size * 0.07);

    context.beginPath();
    context.arc(-half * 0.24, -half * 0.12, half * 0.2, 0, Math.PI * 2);
    context.stroke();

    context.beginPath();
    context.arc(half * 0.34, half * 0.2, half * 0.17, 0, Math.PI * 2);
    context.stroke();

    for (const x of [-half * 0.38, half * 0.1]) {
      context.beginPath();
      context.moveTo(x, half * 0.42);
      context.lineTo(x + half * 0.06, half * 0.62);
      context.stroke();
    }

    for (const x of [-half * 0.48, half * 0.16, half * 0.54]) {
      context.beginPath();
      context.arc(x, -half * 0.42, Math.max(0.65, half * 0.08), 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawShape(context, shape) {
    const half = shape.size / 2;
    context.save();
    context.translate(shape.x + half, shape.y + half);
    context.rotate(shape.rotation);
    context.globalAlpha = shape.opacity;

    if (shape.type === "ringedPlanet") {
      drawRingedPlanet(context, shape, half);
    } else if (shape.type === "spherePlanet") {
      drawSpherePlanet(context, shape, half);
    } else if (shape.type === "bandedPlanet") {
      drawBandedPlanet(context, shape, half);
    } else if (shape.type === "crateredPlanet") {
      drawCrateredPlanet(context, shape, half);
    } else if (shape.type === "eclipsePlanet") {
      drawEclipsePlanet(context, shape, half);
    } else if (shape.type === "asteroid") {
      drawAsteroid(context, shape, half);
    }

    context.restore();
  }

  function drawComet(context, comet, elapsedMs) {
    if (!comet) {
      return;
    }

    const progress = Math.min(
      Math.max((elapsedMs - comet.startedAtMs) / comet.durationMs, 0),
      1,
    );
    const fade = Math.sin(progress * Math.PI);
    const x = comet.start.x + (comet.end.x - comet.start.x) * progress;
    const y = comet.start.y + (comet.end.y - comet.start.y) * progress;
    const dx = comet.end.x - comet.start.x;
    const dy = comet.end.y - comet.start.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const tailX = x - (dx / distance) * comet.tailLength;
    const tailY = y - (dy / distance) * comet.tailLength;

    context.save();
    context.lineCap = "round";
    context.shadowBlur = 5;
    context.shadowColor = `rgba(186, 230, 253, ${0.34 * fade})`;

    const tailGradient = context.createLinearGradient(tailX, tailY, x, y);
    tailGradient.addColorStop(0, "rgba(186, 230, 253, 0)");
    tailGradient.addColorStop(0.72, `rgba(224, 242, 254, ${0.48 * fade})`);
    tailGradient.addColorStop(1, `rgba(255, 255, 255, ${0.9 * fade})`);
    context.strokeStyle = tailGradient;
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.lineTo(x, y);
    context.stroke();

    context.fillStyle = `rgba(255, 255, 255, ${0.92 * fade})`;
    context.beginPath();
    context.arc(x, y, 1.4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawFrame(context, scene, sceneState, elapsedMs, backdropLayer) {
    const { width, height } = sceneState;
    const { frame } = scene;
    context.clearRect(0, 0, width, height);
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(backdropLayer, 0, 0);
    context.restore();

    context.save();
    context.beginPath();
    drawSceneFramePath(context, frame, width, height);
    context.clip();

    for (const star of sceneState.stars) {
      updateStarSparkle(star, elapsedMs);
      const { opacity, scale } = starProgress(star, elapsedMs);
      context.beginPath();
      context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      context.arc(star.x, star.y, star.size * scale, 0, Math.PI * 2);
      context.fill();
    }

    drawComet(context, sceneState.comet, elapsedMs);

    for (const shape of sceneState.shapes) {
      drawShape(context, shape);
    }

    context.restore();

    if (!frame.edgeGlow) {
      return;
    }

    context.save();
    context.beginPath();
    drawSceneFramePath(context, frame, width, height);
    context.strokeStyle = frame.edgeGlow;
    context.lineWidth = 1;
    context.stroke();
    context.restore();
  }

  root.PacePetsPerfectZeroSpaceDraw = Object.freeze({
    drawBackdrop,
    drawFrame,
  });
})(globalThis);

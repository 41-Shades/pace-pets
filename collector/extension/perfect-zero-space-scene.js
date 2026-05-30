(function attachPacePetsPerfectZeroSpace(root) {
  "use strict";

  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  const SCENE = Object.freeze({
    background: "#020617",
    cometDelayMaxMs: 18000,
    cometDelayMinMs: 8000,
    cometDurationMaxMs: 1150,
    cometDurationMinMs: 760,
    cometTailMaxLength: 38,
    cometTailMinLength: 22,
    edgeGlow: "rgba(148, 163, 184, 0.16)",
    shapeCount: 6,
    shapeMaxOpacity: 0.2,
    shapeMinOpacity: 0.07,
    shapeMaxSize: 18,
    shapeMinSize: 9,
    shapeSpeedMaxPxPerSecond: 38,
    shapeSpeedMinPxPerSecond: 8,
    shapeSpeedSkewStrength: 10,
    sparkleCount: 8,
    starCount: 44,
    superSparkleRatio: 0.05,
  });
  const RING_BACK_BRIGHTEN_RATIO = 0.66;
  const RING_FRONT_BRIGHTEN_RATIO = 0.92;
  const PLANET_STROKE_BRIGHTEN_RATIO = 0.52;

  function brightenHexColor(hexColor, ratio) {
    const normalized = hexColor.replace("#", "");
    if (normalized.length !== 6) {
      return hexColor;
    }

    const value = Number.parseInt(normalized, 16);
    if (Number.isNaN(value)) {
      return hexColor;
    }

    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    const brightenChannel = (channel) =>
      Math.round(channel + (255 - channel) * ratio)
        .toString(16)
        .padStart(2, "0");

    return `#${brightenChannel(red)}${brightenChannel(green)}${brightenChannel(
      blue,
    )}`;
  }

  const ASTEROID_MIN_SIZE_MULTIPLIER = 0.65;
  const ASTEROID_MAX_SIZE_MULTIPLIER = 0.78;
  const RINGED_PLANET_MAX_SIZE_MULTIPLIER = 1.25;
  const RINGED_PLANET_FILLS = Object.freeze([
    "#ef4444",
    "#38bdf8",
    "#facc15",
    "#22c55e",
    "#fb7185",
    "#a78bfa",
  ]);
  const ASTEROIDS = Object.freeze([
    Object.freeze({
      type: "asteroid",
      accent: "#f8fafc",
      fill: "#475569",
      stroke: "#f8fafc",
    }),
    Object.freeze({
      type: "asteroid",
      accent: "#e0f2fe",
      fill: "#334155",
      stroke: "#e0f2fe",
    }),
    Object.freeze({
      type: "asteroid",
      accent: "#ddd6fe",
      fill: "#3f4b5a",
      stroke: "#f1f5f9",
    }),
  ]);

  function shapeStyleForIndex(index) {
    return index === 0
      ? ringedPlanetStyle()
      : ASTEROIDS[(index - 1) % ASTEROIDS.length];
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomArrayValue(values) {
    return values[Math.floor(Math.random() * values.length)];
  }

  function ringedPlanetStyle() {
    const fill = randomArrayValue(RINGED_PLANET_FILLS);
    return {
      type: "ringedPlanet",
      fill,
      planetStroke: brightenHexColor(fill, PLANET_STROKE_BRIGHTEN_RATIO),
      rearRingStroke: brightenHexColor(fill, RING_BACK_BRIGHTEN_RATIO),
      ringStroke: brightenHexColor(fill, RING_FRONT_BRIGHTEN_RATIO),
    };
  }

  function randomSkewedUnit(strength) {
    return Math.pow(Math.log(Math.random() * (Math.E - 1) + 1), strength);
  }

  function sparkleDelayMs(mode) {
    return mode === "super"
      ? randomBetween(4000, 12000)
      : randomBetween(1000, 4000);
  }

  function cometDelayMs() {
    return randomBetween(SCENE.cometDelayMinMs, SCENE.cometDelayMaxMs);
  }

  function createComet(width, height, elapsedMs) {
    const leftToRight = Math.random() > 0.5;
    const startY = randomBetween(height * 0.04, height * 0.42);
    const verticalTravel = randomBetween(height * 0.2, height * 0.42);
    const start = {
      x: leftToRight ? -width * 0.18 : width * 1.18,
      y: startY,
    };
    const end = {
      x: leftToRight ? width * 1.18 : -width * 0.18,
      y: startY + verticalTravel,
    };

    return {
      durationMs: randomBetween(
        SCENE.cometDurationMinMs,
        SCENE.cometDurationMaxMs,
      ),
      end,
      startedAtMs: elapsedMs,
      start,
      tailLength: randomBetween(
        SCENE.cometTailMinLength,
        SCENE.cometTailMaxLength,
      ),
    };
  }

  function createStars(width, height) {
    const superSparkleCount = Math.floor(
      SCENE.starCount * SCENE.superSparkleRatio,
    );

    return Array.from({ length: SCENE.starCount }, (_, index) => {
      const baseOpacity = randomBetween(0.3, 1);
      const sparkleMode = index < superSparkleCount ? "super" : "regular";

      return {
        baseOpacity,
        nextSparkleAtMs: randomBetween(0, 1000),
        size: randomBetween(0.6, 1.35),
        sparkleEnabled: index < SCENE.sparkleCount,
        sparkleMode,
        sparkleStartedAtMs: null,
        x: Math.random() * width,
        y: Math.random() * height,
      };
    }).sort(() => Math.random() - 0.5);
  }

  function createShape(width, height, index) {
    const style = shapeStyleForIndex(index);
    const size =
      style.type === "asteroid"
        ? randomBetween(
            SCENE.shapeMinSize * ASTEROID_MIN_SIZE_MULTIPLIER,
            SCENE.shapeMaxSize * ASTEROID_MAX_SIZE_MULTIPLIER,
          )
        : randomBetween(
            SCENE.shapeMinSize,
            SCENE.shapeMaxSize * RINGED_PLANET_MAX_SIZE_MULTIPLIER,
          );
    const maxX = Math.max(width - size, 0);
    const maxY = Math.max(height - size, 0);
    const speed =
      SCENE.shapeSpeedMinPxPerSecond +
      (SCENE.shapeSpeedMaxPxPerSecond - SCENE.shapeSpeedMinPxPerSecond) *
        randomSkewedUnit(SCENE.shapeSpeedSkewStrength);
    const shapeSpeed = style.type === "ringedPlanet" ? speed * 0.35 : speed;
    const angle = Math.random() * Math.PI * 2;
    const rotationDegreesPerMs =
      style.type === "ringedPlanet"
        ? randomBetween(0.01, 0.02875)
        : randomBetween(0.02, 0.17);
    const rotationDirection = Math.random() > 0.5 ? 1 : -1;

    return {
      fill: style.fill,
      opacity: Math.min(
        0.38,
        randomBetween(SCENE.shapeMinOpacity, SCENE.shapeMaxOpacity) * 1.8,
      ),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed:
        rotationDirection * rotationDegreesPerMs * 1000 * (Math.PI / 180),
      size,
      stroke: style.stroke,
      type: style.type,
      accent: style.accent,
      planetStroke: style.planetStroke,
      rearRingStroke: style.rearRingStroke,
      ringStroke: style.ringStroke,
      vx: Math.cos(angle) * shapeSpeed,
      vy: Math.sin(angle) * shapeSpeed,
      x: Math.random() * maxX,
      y: Math.random() * maxY,
    };
  }

  function createSceneState(width, height) {
    return {
      comet: null,
      height,
      nextCometAtMs: cometDelayMs(),
      shapes: Array.from({ length: SCENE.shapeCount }, (_, index) =>
        createShape(width, height, index),
      ),
      stars: createStars(width, height),
      width,
    };
  }

  function updateShapeMotion(shape, width, height, deltaSeconds) {
    const maxX = Math.max(width - shape.size, 0);
    const maxY = Math.max(height - shape.size, 0);

    shape.x += shape.vx * deltaSeconds;
    shape.y += shape.vy * deltaSeconds;
    shape.rotation += shape.rotationSpeed * deltaSeconds;

    if (shape.x < 0) {
      shape.x = -shape.x;
      shape.vx *= -1;
    } else if (shape.x > maxX) {
      shape.x = maxX - (shape.x - maxX);
      shape.vx *= -1;
    }

    if (shape.y < 0) {
      shape.y = -shape.y;
      shape.vy *= -1;
    } else if (shape.y > maxY) {
      shape.y = maxY - (shape.y - maxY);
      shape.vy *= -1;
    }
  }

  function updateComet(sceneState, elapsedMs) {
    if (
      sceneState.comet &&
      elapsedMs - sceneState.comet.startedAtMs >= sceneState.comet.durationMs
    ) {
      sceneState.comet = null;
      sceneState.nextCometAtMs = elapsedMs + cometDelayMs();
    }

    if (!sceneState.comet && elapsedMs >= sceneState.nextCometAtMs) {
      sceneState.comet = createComet(
        sceneState.width,
        sceneState.height,
        elapsedMs,
      );
    }
  }

  function updateSceneState(sceneState, deltaMs, elapsedMs) {
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

    updateComet(sceneState, elapsedMs);
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

  function starProgress(star, elapsedMs) {
    if (star.sparkleStartedAtMs === null) {
      return { opacity: star.baseOpacity, scale: 1 };
    }

    const elapsedSparkleMs = elapsedMs - star.sparkleStartedAtMs;
    if (star.sparkleMode === "super") {
      const peakOpacity = Math.min(star.baseOpacity * 2, 1);
      if (elapsedSparkleMs < 300) {
        const progress = elapsedSparkleMs / 300;
        return {
          opacity:
            star.baseOpacity + (peakOpacity - star.baseOpacity) * progress,
          scale: 1 + progress,
        };
      }

      if (elapsedSparkleMs < 500) {
        return { opacity: peakOpacity, scale: 2 };
      }

      const progress = Math.min((elapsedSparkleMs - 500) / 500, 1);
      return {
        opacity: peakOpacity + (star.baseOpacity - peakOpacity) * progress,
        scale: 2 - progress,
      };
    }

    if (elapsedSparkleMs < 700) {
      const progress = elapsedSparkleMs / 700;
      return {
        opacity:
          star.baseOpacity +
          (star.baseOpacity * 0.2 - star.baseOpacity) * progress,
        scale: 1,
      };
    }

    const progress = Math.min((elapsedSparkleMs - 700) / 700, 1);
    return {
      opacity:
        star.baseOpacity * 0.2 +
        (star.baseOpacity - star.baseOpacity * 0.2) * progress,
      scale: 1,
    };
  }

  function drawRoundedRectPath(context, x, y, width, height, radius) {
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

  function drawFrame(context, sceneState, elapsedMs) {
    const { width, height } = sceneState;
    context.clearRect(0, 0, width, height);

    context.save();
    context.beginPath();
    drawRoundedRectPath(
      context,
      width * 0.02,
      height * 0.06,
      width * 0.96,
      height * 0.88,
      Math.min(width, height) * 0.18,
    );

    const backgroundGradient = context.createRadialGradient(
      width * 0.34,
      height * 0.25,
      0,
      width * 0.5,
      height * 0.52,
      Math.max(width, height) * 0.6,
    );
    backgroundGradient.addColorStop(0, "#111827");
    backgroundGradient.addColorStop(0.7, SCENE.background);
    backgroundGradient.addColorStop(1, "rgba(2, 6, 23, 0.72)");
    context.fillStyle = backgroundGradient;
    context.fill();
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

    context.save();
    context.beginPath();
    drawRoundedRectPath(
      context,
      width * 0.02,
      height * 0.06,
      width * 0.96,
      height * 0.88,
      Math.min(width, height) * 0.18,
    );
    context.strokeStyle = SCENE.edgeGlow;
    context.lineWidth = 1;
    context.stroke();
    context.restore();
  }

  function measuredSceneSize(container, canvas) {
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return {
      height: Math.max(
        1,
        Math.round(canvasRect.height || containerRect.height || 96),
      ),
      width: Math.max(
        1,
        Math.round(canvasRect.width || containerRect.width || 96),
      ),
    };
  }

  function configureCanvas(container, canvas, context, currentState) {
    const { width, height } = measuredSceneSize(container, canvas);
    const pixelRatio = Math.max(1, Math.min(root.devicePixelRatio || 1, 2));
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    const changed =
      !currentState ||
      currentState.width !== width ||
      currentState.height !== height ||
      canvas.width !== pixelWidth ||
      canvas.height !== pixelHeight;

    if (changed) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return changed ? createSceneState(width, height) : currentState;
  }

  function addMediaChangeListener(mediaQuery, listener) {
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }

  function create(container, canvas) {
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    const reducedMotionMedia = root.matchMedia(REDUCED_MOTION_QUERY);
    let sceneState = null;
    let animationFrameId = null;
    let elapsedMs = 0;
    let isStopped = false;
    let lastFrameAtMs = null;

    function drawStaticFrame() {
      sceneState = configureCanvas(container, canvas, context, sceneState);
      drawFrame(context, sceneState, elapsedMs);
    }

    function cancelAnimationFrameIfNeeded() {
      if (animationFrameId !== null) {
        root.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }

    function requestNextFrame() {
      if (
        isStopped ||
        animationFrameId !== null ||
        reducedMotionMedia.matches ||
        root.document.hidden
      ) {
        return;
      }

      animationFrameId = root.requestAnimationFrame(renderFrame);
    }

    function renderFrame(frameTimeMs) {
      animationFrameId = null;
      sceneState = configureCanvas(container, canvas, context, sceneState);

      const deltaMs = lastFrameAtMs === null ? 0 : frameTimeMs - lastFrameAtMs;
      lastFrameAtMs = frameTimeMs;
      elapsedMs += Math.max(0, Math.min(deltaMs, 64));
      updateSceneState(sceneState, deltaMs, elapsedMs);
      drawFrame(context, sceneState, elapsedMs);
      requestNextFrame();
    }

    function handleMotionPreferenceChange() {
      cancelAnimationFrameIfNeeded();
      lastFrameAtMs = null;
      drawStaticFrame();
      requestNextFrame();
    }

    function handleVisibilityChange() {
      cancelAnimationFrameIfNeeded();
      lastFrameAtMs = null;
      if (root.document.hidden) {
        drawStaticFrame();
        return;
      }

      requestNextFrame();
    }

    const removeMotionPreferenceListener = addMediaChangeListener(
      reducedMotionMedia,
      handleMotionPreferenceChange,
    );
    const resizeObserver =
      typeof root.ResizeObserver === "function"
        ? new root.ResizeObserver(() => {
            if (isStopped) {
              return;
            }

            sceneState = null;
            drawStaticFrame();
          })
        : null;

    if (resizeObserver) {
      resizeObserver.observe(container);
    } else {
      root.addEventListener("resize", handleMotionPreferenceChange);
    }
    root.document.addEventListener("visibilitychange", handleVisibilityChange);

    drawStaticFrame();
    requestNextFrame();

    return {
      stop() {
        isStopped = true;
        cancelAnimationFrameIfNeeded();
        removeMotionPreferenceListener();
        resizeObserver?.disconnect();
        root.removeEventListener("resize", handleMotionPreferenceChange);
        root.document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      },
    };
  }

  root.PacePetsPerfectZeroSpace = Object.freeze({
    create,
  });
})(globalThis);

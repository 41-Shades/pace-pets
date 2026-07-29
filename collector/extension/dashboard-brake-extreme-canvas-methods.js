(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const DEBRIS_DATA = globalThis.PacePetsDashboardBrakeDebrisData;
  if (!DATA || !Controller || !DEBRIS_DATA) {
    throw new Error(
      "Pace data, core, and brake debris data must load before dashboard-brake-extreme-canvas-methods.js.",
    );
  }

  const TAU = Math.PI * 2;
  const PARTICLE_COLORS = Object.freeze({
    fin: "#dc2626",
    outline: "#475569",
    panel: "#cbd5e1",
    smoke: "#94a3b8",
    spark: "#fb923c",
  });
  const BRAKE_EXTREME_AUDIO_TIMELINE = "brakeExtreme";
  const shardPathCache = new Map();

  function randomFloatInRange(controller, [min, max]) {
    return controller.randomIntegerInRange([min * 100, max * 100]) / 100;
  }

  function randomKind(controller) {
    const kindKeys =
      DEBRIS_DATA.KIND_KEYS_BY_RANGE.extreme ||
      DEBRIS_DATA.KIND_KEYS_BY_RANGE.escape;
    return kindKeys[controller.randomIntegerInRange([0, kindKeys.length - 1])];
  }

  function createExtremeCanvas(profile) {
    const canvas = document.createElement("canvas");
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, profile.DPR_MAX);
    canvas.className = "brake-extreme-canvas-layer";
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas, context, height, width };
  }

  function extremeParticleCountRange(profile, state) {
    return state.extremeParticleCountRange || profile.COUNT_RANGE;
  }

  function createExtremeParticle(controller, profile, origin) {
    const angle =
      (controller.randomIntegerInRange(profile.ANGLE_RANGE_DEG) * Math.PI) /
      180;
    const speed = controller.randomIntegerInRange(
      profile.SPEED_RANGE_PX_PER_SECOND,
    );
    const size = randomFloatInRange(controller, profile.SIZE_RANGE_PX);
    const delayMs = controller.randomIntegerInRange(profile.DELAY_RANGE_MS);
    const drift = controller.randomIntegerInRange(
      profile.DRIFT_RANGE_PX_PER_SECOND,
    );
    const durationMs = controller.randomIntegerInRange(
      profile.DURATION_RANGE_MS,
    );
    const gravity = controller.randomIntegerInRange(
      profile.GRAVITY_RANGE_PX_PER_SECOND_SQUARED,
    );
    const kind = randomKind(controller);
    const rotation = controller.randomIntegerInRange([0, 359]);
    const spin = controller.randomIntegerInRange(
      profile.SPIN_RANGE_DEG_PER_SECOND,
    );
    return {
      delayMs,
      drift,
      durationMs,
      gravity,
      kind,
      rotation,
      shardPath: shardPath(kind, size),
      size,
      spin,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      x:
        origin.x +
        controller.randomIntegerInRange(profile.ORIGIN_JITTER_RANGE_PX),
      y:
        origin.y +
        controller.randomIntegerInRange(profile.ORIGIN_JITTER_RANGE_PX),
    };
  }

  function fadeForProgress(progress, kind) {
    const fadeIn = Math.min(1, progress / 0.08);
    const fadeOut = Math.min(1, (1 - progress) / 0.24);
    const baseOpacity = kind === "smoke" ? 0.42 : 0.9;
    return Math.max(0, Math.min(fadeIn, fadeOut)) * baseOpacity;
  }

  function createShardPath(kind, size) {
    const path = new Path2D();
    if (kind === "smoke") {
      path.ellipse(0, 0, size * 1.7, size, 0, 0, TAU);
    } else if (kind === "spark") {
      path.moveTo(0, -size * 1.8);
      path.lineTo(size * 0.62, -size * 0.2);
      path.lineTo(size * 1.7, 0);
      path.lineTo(size * 0.55, size * 0.28);
      path.lineTo(0, size * 1.8);
      path.lineTo(-size * 0.55, size * 0.28);
      path.lineTo(-size * 1.7, 0);
      path.lineTo(-size * 0.62, -size * 0.2);
    } else if (kind === "fin") {
      path.moveTo(-size * 1.2, size);
      path.lineTo(size * 1.4, 0);
      path.lineTo(-size * 0.4, -size * 1.25);
    } else {
      path.rect(-size, -size * 0.72, size * 2, size * 1.44);
    }
    path.closePath();
    return path;
  }

  function shardPath(kind, size) {
    const key = `${kind}:${size}`;
    let path = shardPathCache.get(key);
    if (!path) {
      path = createShardPath(kind, size);
      shardPathCache.set(key, path);
    }
    return path;
  }

  function drawParticle(context, particle, elapsedMs, bounds) {
    const localMs = elapsedMs - particle.delayMs;
    if (localMs < 0 || localMs > particle.durationMs) {
      return localMs <= particle.durationMs;
    }

    const progress = localMs / particle.durationMs;
    const seconds = localMs / 1000;
    const x =
      particle.x + particle.vx * seconds + particle.drift * seconds * progress;
    const y =
      particle.y +
      particle.vy * seconds +
      0.5 * particle.gravity * seconds ** 2;
    if (
      x < -80 ||
      x > bounds.width + 80 ||
      y < -100 ||
      y > bounds.height + 100
    ) {
      return true;
    }

    context.save();
    context.globalAlpha = fadeForProgress(progress, particle.kind);
    context.translate(x, y);
    context.rotate(
      ((particle.rotation + particle.spin * seconds) * Math.PI) / 180,
    );
    context.fillStyle = PARTICLE_COLORS[particle.kind] || PARTICLE_COLORS.panel;
    context.fill(particle.shardPath);
    context.restore();
    return true;
  }

  function renderExtremeFrame(context, particles, startedAtMs, bounds, nowMs) {
    const elapsedMs = nowMs - startedAtMs;
    let retainedParticleCount = 0;
    context.clearRect(0, 0, bounds.width, bounds.height);
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (drawParticle(context, particle, elapsedMs, bounds)) {
        if (retainedParticleCount !== index) {
          particles[retainedParticleCount] = particle;
        }
        retainedParticleCount += 1;
      }
    }
    particles.length = retainedParticleCount;
    return retainedParticleCount > 0;
  }

  function registerCanvasCleanup(state, canvas, animation) {
    const cleanup = () => {
      animation.active = false;
      if (animation.frameId !== null) {
        window.cancelAnimationFrame(animation.frameId);
      }
      if (animation.cleanupTimer !== null) {
        window.clearTimeout(animation.cleanupTimer);
        state.debrisTimers.delete(animation.cleanupTimer);
      }
      state.debrisLayers.delete(canvas);
      state.debrisAnimationCleanups?.delete(cleanup);
      canvas.remove();
    };
    state.debrisAnimationCleanups?.add(cleanup);
    return cleanup;
  }

  Object.assign(Controller.prototype, {
    launchBrakeExtremeDebrisBurst(container, state) {
      const profile = DATA.BRAKE_EXTREME_CANVAS_BURST_PROFILE;
      const rect = container.getBoundingClientRect();
      if (!profile || !document.body || rect.width <= 0 || rect.height <= 0) {
        return 0;
      }

      const { canvas, context, height, width } = createExtremeCanvas(profile);
      if (!context) {
        return 0;
      }

      const origin = {
        x: rect.left + rect.width * 0.52,
        y: rect.top + rect.height * 0.58,
      };
      const particleCount = this.randomIntegerInRange(
        extremeParticleCountRange(profile, state),
      );
      const particles = Array.from({ length: particleCount }, () =>
        createExtremeParticle(this, profile, origin),
      );
      const longestAnimationMs = particles.reduce(
        (longest, particle) =>
          Math.max(longest, particle.delayMs + particle.durationMs),
        0,
      );
      const startedAtMs = performance.now();
      const animation = { active: true, cleanupTimer: null, frameId: null };
      const cleanup = registerCanvasCleanup(state, canvas, animation);

      const renderFrame = (nowMs) => {
        if (!animation.active) {
          return;
        }
        const hasActiveParticles = renderExtremeFrame(
          context,
          particles,
          startedAtMs,
          { height, width },
          nowMs,
        );
        animation.frameId = hasActiveParticles
          ? window.requestAnimationFrame(renderFrame)
          : null;
        if (!hasActiveParticles) {
          cleanup();
        }
      };

      document.body.append(canvas);
      state.debrisLayers.add(canvas);
      state.brakeExtremeAudio = this.transitionAudio?.playTimeline?.(
        BRAKE_EXTREME_AUDIO_TIMELINE,
      );
      animation.frameId = window.requestAnimationFrame(renderFrame);
      animation.cleanupTimer = window.setTimeout(
        cleanup,
        longestAnimationMs + 140,
      );
      state.debrisTimers.add(animation.cleanupTimer);
      return longestAnimationMs + 140;
    },
  });
})();

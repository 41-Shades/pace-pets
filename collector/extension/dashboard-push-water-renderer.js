((root) => {
  "use strict";

  const CanvasLayout = root.PacePetsDashboardPushCanvasLayout;
  const PushTank = root.PacePetsDashboardPushTank;
  if (!CanvasLayout || !PushTank) {
    throw new Error(
      "Pace push canvas layout and tank renderer must load before dashboard-push-water-renderer.js.",
    );
  }

  const BASE_LEVEL = 0;
  const MAX_LEVEL = 0.85;
  const RISE_RATE = 0.005;
  const WAVE_STEP = 8;

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function waveY(frame, x) {
    const progress = frame.width <= 0 ? 0 : x / frame.width;
    return (
      frame.top +
      Math.sin(progress * Math.PI * 5.2 + frame.phase) * frame.amplitude +
      Math.sin(progress * Math.PI * 2.4 - frame.phase * 0.7) *
        frame.amplitude *
        0.34
    );
  }

  function createWaveSamples(width) {
    const x = [0];
    for (let nextX = WAVE_STEP; nextX < width; nextX += WAVE_STEP) {
      x.push(nextX);
    }
    x.push(width);
    return { x, y: new Float64Array(x.length) };
  }

  function sampleWave(frame, wave) {
    for (let index = 0; index < wave.x.length; index += 1) {
      wave.y[index] = waveY(frame, wave.x[index]);
    }
  }

  function traceWave(context, wave) {
    context.beginPath();
    context.moveTo(wave.x[0], wave.y[0]);
    for (let index = 1; index < wave.x.length; index += 1) {
      context.lineTo(wave.x[index], wave.y[index]);
    }
  }

  function createWaterPath(context, frame, wave) {
    traceWave(context, wave);
    context.lineTo(frame.width, frame.height);
    context.lineTo(0, frame.height);
    context.closePath();
  }

  function drawWaveLine(context, frame, wave) {
    traceWave(context, wave);
    context.strokeStyle = `rgb(226 246 255 / ${0.34 + frame.ripple * 0.2})`;
    context.lineWidth = Math.max(1, frame.height * 0.012);
    context.stroke();
  }

  function drawWaterFill(context, frame, wave) {
    const gradient = context.createLinearGradient(
      0,
      frame.top,
      0,
      frame.height,
    );
    gradient.addColorStop(0, `rgb(82 176 245 / ${0.24 + frame.ripple * 0.12})`);
    gradient.addColorStop(1, `rgb(24 92 219 / ${0.2 + frame.ripple * 0.08})`);
    createWaterPath(context, frame, wave);
    context.fillStyle = gradient;
    context.fill();
  }

  function createRenderer(canvas) {
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    const state = {
      frame: {
        amplitude: 0,
        deltaSeconds: 0,
        height: 0,
        maxFill: false,
        phase: 0,
        ripple: 0,
        stage: 0,
        top: 0,
        width: 0,
      },
      lastTimestamp: null,
      level: BASE_LEVEL,
      ripple: 0,
      wave: null,
    };
    const tankRenderer = PushTank.createRenderer();
    const layout = CanvasLayout.create(canvas);
    let dimensions = null;

    return {
      currentLevel({ maxFill = false } = {}) {
        return maxFill ? MAX_LEVEL : state.level;
      },
      invalidateLayout() {
        layout.invalidate();
      },
      render(sweatLoad, timestamp, { maxFill = false } = {}) {
        const nextDimensions = layout.current();
        if (dimensions !== nextDimensions) {
          dimensions = nextDimensions;
          state.wave = createWaveSamples(dimensions.width);
        }
        const previousTimestamp = state.lastTimestamp ?? timestamp;
        state.lastTimestamp = timestamp;
        const deltaSeconds = Math.min(
          (timestamp - previousTimestamp) / 1000,
          0.08,
        );
        state.level = maxFill
          ? MAX_LEVEL
          : Math.min(
              MAX_LEVEL,
              state.level + sweatLoad * RISE_RATE * deltaSeconds,
            );
        const targetRipple = clamp(sweatLoad * 5.2);
        state.ripple +=
          (targetRipple - state.ripple) * (1 - Math.exp(-deltaSeconds * 8));
        context.clearRect(0, 0, dimensions.width, dimensions.height);
        if (state.level <= 0) {
          return;
        }
        const waterHeight = dimensions.height * state.level;
        const frame = state.frame;
        frame.amplitude = 1.1 + state.ripple * 3.2;
        frame.deltaSeconds = deltaSeconds;
        frame.height = dimensions.height;
        frame.maxFill = maxFill;
        frame.phase = timestamp / 470;
        frame.ripple = state.ripple;
        frame.stage = state.level / MAX_LEVEL;
        frame.top = dimensions.height - waterHeight;
        frame.width = dimensions.width;
        sampleWave(frame, state.wave);
        drawWaterFill(context, frame, state.wave);
        context.save();
        createWaterPath(context, frame, state.wave);
        context.clip();
        tankRenderer.renderSubmerged(context, frame, timestamp);
        context.restore();
        tankRenderer.renderSurface(context, frame, timestamp);
        drawWaveLine(context, frame, state.wave);
      },
    };
  }

  root.PacePetsDashboardPushWater = Object.freeze({ createRenderer });
})(globalThis);

((root) => {
  "use strict";

  const BASE_LEVEL = 0;
  const MAX_LEVEL = 0.85;
  const RISE_RATE = 0.005;

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { height, width };
  }

  function waveY({ amplitude, phase, top, width, x }) {
    const progress = width <= 0 ? 0 : x / width;
    return (
      top +
      Math.sin(progress * Math.PI * 5.2 + phase) * amplitude +
      Math.sin(progress * Math.PI * 2.4 - phase * 0.7) * amplitude * 0.34
    );
  }

  function createWaterPath(context, frame) {
    context.beginPath();
    context.moveTo(0, frame.top);
    for (let x = 0; x <= frame.width; x += 8) {
      context.lineTo(x, waveY({ ...frame, x }));
    }
    context.lineTo(frame.width, frame.height);
    context.lineTo(0, frame.height);
    context.closePath();
  }

  function drawWaveLine(context, frame) {
    context.beginPath();
    context.moveTo(0, frame.top);
    for (let x = 0; x <= frame.width; x += 8) {
      context.lineTo(x, waveY({ ...frame, x }));
    }
    context.strokeStyle = `rgb(226 246 255 / ${0.34 + frame.ripple * 0.2})`;
    context.lineWidth = Math.max(1, frame.height * 0.012);
    context.stroke();
  }

  function drawWater(context, frame) {
    const gradient = context.createLinearGradient(
      0,
      frame.top,
      0,
      frame.height,
    );
    gradient.addColorStop(0, `rgb(82 176 245 / ${0.24 + frame.ripple * 0.12})`);
    gradient.addColorStop(1, `rgb(24 92 219 / ${0.2 + frame.ripple * 0.08})`);
    createWaterPath(context, frame);
    context.fillStyle = gradient;
    context.fill();
    drawWaveLine(context, frame);
  }

  function createRenderer(canvas) {
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    const state = {
      lastTimestamp: null,
      level: BASE_LEVEL,
      ripple: 0,
    };
    return {
      render(sweatLoad, timestamp, { maxFill = false } = {}) {
        const dimensions = resizeCanvas(canvas);
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
        drawWater(context, {
          amplitude: 1.1 + state.ripple * 3.2,
          height: dimensions.height,
          phase: timestamp / 470,
          ripple: state.ripple,
          top: dimensions.height - waterHeight,
          width: dimensions.width,
        });
      },
    };
  }

  root.PacePetsDashboardPushWater = Object.freeze({ createRenderer });
})(globalThis);

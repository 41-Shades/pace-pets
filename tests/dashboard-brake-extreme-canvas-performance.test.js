import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../collector/extension",
);

function createPath2DMock(onCreate) {
  return class FakePath2D {
    constructor() {
      onCreate();
    }

    closePath() {}
    ellipse() {}
    lineTo() {}
    moveTo() {}
    rect() {}
  };
}

function createControllerClass(randomValues) {
  return class Controller {
    constructor() {
      this.transitionAudio = { playTimeline: vi.fn() };
    }

    randomIntegerInRange() {
      return randomValues.shift();
    }
  };
}

function createCanvasDocument(canvases, contexts) {
  return {
    body: { append: vi.fn() },
    createElement: vi.fn(() => {
      const context = {
        clearRect: vi.fn(),
        fill: vi.fn(),
        fillStyle: "",
        globalAlpha: 1,
        restore: vi.fn(),
        rotate: vi.fn(),
        save: vi.fn(),
        setTransform: vi.fn(),
        translate: vi.fn(),
      };
      const canvas = {
        getContext: vi.fn(() => context),
        remove: vi.fn(),
        setAttribute: vi.fn(),
        style: {},
      };
      canvases.push(canvas);
      contexts.push(context);
      return canvas;
    }),
  };
}

function createWindow(frames) {
  return {
    cancelAnimationFrame: vi.fn(),
    clearTimeout: vi.fn(),
    devicePixelRatio: 2,
    innerHeight: 600,
    innerWidth: 800,
    requestAnimationFrame: vi.fn((callback) => {
      frames.push(callback);
      return frames.length;
    }),
    setTimeout: vi.fn(() => 1),
  };
}

function createHarness(randomValues, particleCount) {
  const frames = [];
  const canvases = [];
  const contexts = [];
  let pathCount = 0;

  const FakePath2D = createPath2DMock(() => {
    pathCount += 1;
  });
  const Controller = createControllerClass(randomValues);
  const profile = {
    ANGLE_RANGE_DEG: [0, 360],
    COUNT_RANGE: [particleCount, particleCount],
    DELAY_RANGE_MS: [0, 0],
    DPR_MAX: 2,
    DRIFT_RANGE_PX_PER_SECOND: [0, 0],
    DURATION_RANGE_MS: [100, 3000],
    GRAVITY_RANGE_PX_PER_SECOND_SQUARED: [0, 1000],
    ORIGIN_JITTER_RANGE_PX: [0, 0],
    SIZE_RANGE_PX: [1, 1],
    SPEED_RANGE_PX_PER_SECOND: [0, 1000],
    SPIN_RANGE_DEG_PER_SECOND: [0, 60],
  };
  const document = createCanvasDocument(canvases, contexts);
  const window = createWindow(frames);
  const globals = {
    document,
    Path2D: FakePath2D,
    PacePetsDashboardBrakeDebrisData: {
      KIND_KEYS_BY_RANGE: { extreme: ["panel"] },
    },
    PacePetsDashboardPaceController: Controller,
    PacePetsDashboardPaceData: {
      BRAKE_EXTREME_CANVAS_BURST_PROFILE: profile,
    },
    performance: { now: () => 0 },
    window,
  };
  const context = vm.createContext(globals);
  const source = fs.readFileSync(
    path.join(extensionRoot, "dashboard-brake-extreme-canvas-methods.js"),
    "utf8",
  );
  new vm.Script(source, {
    filename: "dashboard-brake-extreme-canvas-methods.js",
  }).runInContext(context);

  const controller = new Controller();
  const state = {
    debrisAnimationCleanups: new Set(),
    debrisLayers: new Set(),
    debrisTimers: new Set(),
  };
  const container = {
    getBoundingClientRect: () => ({
      height: 100,
      left: 0,
      top: 0,
      width: 100,
    }),
  };
  controller.launchBrakeExtremeDebrisBurst(container, state);

  return {
    canvas: canvases[0],
    context: contexts[0],
    pathCount: () => pathCount,
    renderNextFrame(nowMs) {
      frames.shift()(nowMs);
    },
  };
}

function particleValues({ durationMs, gravity, rotation, speed, spin }) {
  return [180, speed, 100, 0, 0, durationMs, gravity, 0, rotation, spin, 0, 0];
}

describe("extreme brake canvas rendering", () => {
  it("reuses identical shard paths while preserving live-particle order", () => {
    const randomValues = [
      3,
      ...particleValues({
        durationMs: 100,
        gravity: 0,
        rotation: 10,
        speed: 0,
        spin: 60,
      }),
      ...particleValues({
        durationMs: 200,
        gravity: 0,
        rotation: 20,
        speed: 0,
        spin: 60,
      }),
      ...particleValues({
        durationMs: 300,
        gravity: 0,
        rotation: 30,
        speed: 0,
        spin: 60,
      }),
    ];
    const harness = createHarness(randomValues, 3);

    harness.renderNextFrame(50);
    harness.renderNextFrame(150);
    harness.renderNextFrame(250);

    expect(harness.pathCount()).toBe(1);
    expect(harness.context.fill).toHaveBeenCalledTimes(6);
    expect(harness.context.rotate.mock.calls.map(([angle]) => angle)).toEqual([
      ((10 + 60 * (50 / 1000)) * Math.PI) / 180,
      ((20 + 60 * (50 / 1000)) * Math.PI) / 180,
      ((30 + 60 * (50 / 1000)) * Math.PI) / 180,
      ((20 + 60 * (150 / 1000)) * Math.PI) / 180,
      ((30 + 60 * (150 / 1000)) * Math.PI) / 180,
      ((30 + 60 * (250 / 1000)) * Math.PI) / 180,
    ]);
  });

  it("retains off-screen particles that later return to the viewport", () => {
    const randomValues = [
      1,
      ...particleValues({
        durationMs: 3000,
        gravity: 1000,
        rotation: 0,
        speed: 1000,
        spin: 0,
      }),
    ];
    randomValues[1] = 270;
    const harness = createHarness(randomValues, 1);

    harness.renderNextFrame(500);
    expect(harness.context.fill).not.toHaveBeenCalled();

    harness.renderNextFrame(2000);
    expect(harness.context.fill).toHaveBeenCalledTimes(1);
    expect(harness.canvas.remove).not.toHaveBeenCalled();
  });
});

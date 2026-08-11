import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../collector/extension",
);

function loadScript(fileName, globals = {}) {
  const context = vm.createContext(globals);
  const source = fs.readFileSync(path.join(extensionRoot, fileName), "utf8");
  new vm.Script(source, { filename: fileName }).runInContext(context);
  return context;
}

function drawingContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
  };
}

function fullBleedScene() {
  return {
    background: "#020617",
    frame: { edgeGlow: null, type: "fullBleed" },
    gradient: {
      centerXRatio: 0.5,
      centerYRatio: 0.5,
      innerColor: "#111827",
      middleColor: null,
      middleStop: 0.7,
      outerColor: "#020617",
      outerXRatio: 0.5,
      outerYRatio: 0.5,
      radiusRatio: 0.6,
    },
  };
}

function expectDirtyFrameEvidence({
  backdropCanvas,
  backdropContext,
  backdropLayer,
  sceneState,
  targetContext,
  updateStarSparkle,
}) {
  expect(backdropCanvas).toMatchObject({ height: 101, width: 126 });
  expect(backdropContext.createRadialGradient).toHaveBeenCalledOnce();
  expect(backdropContext.arc).toHaveBeenCalledOnce();
  expect(targetContext.drawImage).toHaveBeenCalledTimes(4);
  expect(targetContext.drawImage).toHaveBeenLastCalledWith(
    backdropLayer,
    94,
    24,
    12,
    12,
    94,
    24,
    12,
    12,
  );
  expect(targetContext.clearRect).toHaveBeenNthCalledWith(1, 0, 0, 126, 101);
  expect(targetContext.clearRect).toHaveBeenNthCalledWith(2, 19, 24, 12, 12);
  expect(targetContext.clearRect).toHaveBeenNthCalledWith(3, 94, 24, 12, 12);
  expect(targetContext.clearRect).toHaveBeenNthCalledWith(4, 94, 24, 12, 12);
  expect(targetContext.arc).toHaveBeenCalledTimes(3);
  expect(updateStarSparkle.mock.calls.map(([star]) => star)).toEqual([
    sceneState.stars[1],
    sceneState.stars[1],
    sceneState.stars[1],
  ]);
}

describe("Perfect Zero space rendering", () => {
  it("measures layout only when resize or DPR invalidates the scene", () => {
    const backdrop = { create: vi.fn(() => ({})) };
    const drawPreviousFrames = [];
    const draw = {
      createWorkspace: vi.fn(() => ({})),
      drawFrame: vi.fn((_context, _scene, _state, _elapsed, options) => {
        drawPreviousFrames.push(options.previousFrame);
        return {
          dynamicRegions: options.previousFrame ? [{ left: 1 }] : [],
        };
      }),
    };
    const createSceneState = vi.fn((_scene, width, height) => ({
      height,
      width,
    }));
    const canvasRect = vi.fn(() => ({ height: 96, width: 96 }));
    const containerRect = vi.fn(() => ({ height: 96, width: 96 }));
    const context2d = drawingContext();
    const canvas = {
      getBoundingClientRect: canvasRect,
      getContext: vi.fn(() => context2d),
      height: 0,
      width: 0,
    };
    const container = { getBoundingClientRect: containerRect };
    const resizeObserver = { disconnect: vi.fn(), observe: vi.fn() };
    function FakeResizeObserver() {
      return resizeObserver;
    }
    const script = loadScript("perfect-zero-space-scene.js", {
      PacePetsDashboardPreferences: {
        addMotionPreferenceChangeListener: () => vi.fn(),
        motionPreferenceEnabled: () => true,
      },
      PacePetsPerfectZeroSpaceBackdrop: backdrop,
      PacePetsPerfectZeroSpaceData: { PROFILE_KEYS: {} },
      PacePetsPerfectZeroSpaceDraw: draw,
      PacePetsPerfectZeroSpaceFactory: {
        createSceneState,
        sceneConfigFor: () => ({ fallbackSize: 96, maxPixelRatio: 2 }),
      },
      PacePetsPerfectZeroSpaceMotion: { updateSceneState: vi.fn() },
      ResizeObserver: FakeResizeObserver,
      addEventListener: vi.fn(),
      cancelAnimationFrame: vi.fn(),
      devicePixelRatio: 2,
      document: {
        addEventListener: vi.fn(),
        hidden: false,
        removeEventListener: vi.fn(),
      },
      removeEventListener: vi.fn(),
      requestAnimationFrame: vi.fn(() => 1),
    });

    const scene = script.PacePetsPerfectZeroSpace.create(container, canvas, {});
    scene.renderFrame(16);
    scene.renderFrame(32);

    expect(canvasRect).toHaveBeenCalledOnce();
    expect(containerRect).toHaveBeenCalledOnce();
    expect(createSceneState).toHaveBeenCalledOnce();
    expect(backdrop.create).toHaveBeenCalledOnce();
    expect(drawPreviousFrames[0]).toBeNull();
    expect(drawPreviousFrames[1]).toEqual({ dynamicRegions: [] });

    script.devicePixelRatio = 1;
    scene.renderFrame(48);

    expect(canvasRect).toHaveBeenCalledTimes(2);
    expect(containerRect).toHaveBeenCalledTimes(2);
    expect(createSceneState).toHaveBeenCalledTimes(2);
    expect(backdrop.create).toHaveBeenCalledTimes(2);
    expect(drawPreviousFrames[3]).toBeNull();

    scene.handleResize();

    expect(canvasRect).toHaveBeenCalledTimes(3);
    expect(containerRect).toHaveBeenCalledTimes(3);
    expect(createSceneState).toHaveBeenCalledTimes(3);
    expect(backdrop.create).toHaveBeenCalledTimes(3);
    expect(drawPreviousFrames[4]).toBeNull();

    scene.stop();
    scene.drawStaticFrame();

    expect(canvas).toMatchObject({ height: 0, width: 0 });
    expect(createSceneState).toHaveBeenCalledTimes(3);
  });
});

describe("Perfect Zero star progress", () => {
  it("writes into caller-owned frame storage", () => {
    const script = loadScript("perfect-zero-space-motion.js", {
      PacePetsBouncingBoxMotion: { updateBouncingBox: vi.fn() },
      PacePetsPerfectZeroSpaceFactory: {
        cometDelayMs: vi.fn(),
        createComet: vi.fn(),
        sparkleDelayMs: vi.fn(),
      },
    });
    const star = {
      baseOpacity: 0.4,
      sparkleMode: "regular",
      sparkleStartedAtMs: null,
    };
    const result = {};

    expect(
      script.PacePetsPerfectZeroSpaceMotion.starProgress(star, 0, result),
    ).toBe(result);
    expect(result).toEqual({ opacity: 0.4, scale: 1 });

    star.sparkleStartedAtMs = 0;
    expect(
      script.PacePetsPerfectZeroSpaceMotion.starProgress(star, 350, result),
    ).toBe(result);
    expect(result.opacity).toBeCloseTo(0.24);
    expect(result.scale).toBe(1);
  });
});

describe("Perfect Zero dirty region workspace", () => {
  it("preserves merge order while reusing output storage", () => {
    const frame = loadScript(
      "perfect-zero-space-frame.js",
    ).PacePetsPerfectZeroSpaceFrame;
    const workspace = frame.createWorkspace();
    const first = [
      { bottom: 2, left: 0, right: 2, top: 0 },
      { bottom: 12, left: 10, right: 12, top: 10 },
    ];
    const second = [
      { bottom: 3, left: 1, right: 3, top: 1 },
      { bottom: 22, left: 20, right: 22, top: 20 },
    ];

    const firstOutput = frame.mergedRegions(first, workspace, second);
    expect(firstOutput).toEqual([
      { bottom: 12, left: 10, right: 12, top: 10 },
      { bottom: 3, left: 0, right: 3, top: 0 },
      { bottom: 22, left: 20, right: 22, top: 20 },
    ]);

    const secondOutput = frame.mergedRegions(second, workspace);
    expect(secondOutput).toBe(firstOutput);
    expect(secondOutput).toEqual(second);
  });
});

describe("Perfect Zero space backdrop layer", () => {
  it("retains static stars and restores only dirty pixels on ordinary frames", () => {
    const backdropContext = drawingContext();
    backdropContext.createRadialGradient = vi.fn(() => ({
      addColorStop: vi.fn(),
    }));
    const backdropCanvas = {
      getContext: vi.fn(() => backdropContext),
      height: 0,
      width: 0,
    };
    const updateStarSparkle = vi.fn();
    const starProgressResults = [];
    const frameScript = loadScript("perfect-zero-space-frame.js");
    const drawScript = loadScript("perfect-zero-space-draw.js", {
      PacePetsPerfectZeroSpaceData: {},
      PacePetsPerfectZeroSpaceFrame: frameScript.PacePetsPerfectZeroSpaceFrame,
      PacePetsPerfectZeroSpaceMotion: {
        starProgress: (star, _elapsedMs, result) => {
          starProgressResults.push(result);
          result.opacity = star.baseOpacity;
          result.scale = 1;
          return result;
        },
        updateStarSparkle,
      },
    });
    const scene = fullBleedScene();
    const sceneState = {
      comet: null,
      height: 81,
      shapes: [],
      stars: [
        { baseOpacity: 0.5, size: 1, sparkleEnabled: false, x: 10, y: 12 },
        { baseOpacity: 0.8, size: 1, sparkleEnabled: true, x: 20, y: 24 },
      ],
      width: 101,
    };
    const targetContext = drawingContext();
    const backdropScript = loadScript("perfect-zero-space-backdrop.js", {
      PacePetsPerfectZeroSpaceDraw: drawScript.PacePetsPerfectZeroSpaceDraw,
      document: { createElement: vi.fn(() => backdropCanvas) },
    });

    const backdropLayer =
      backdropScript.PacePetsPerfectZeroSpaceBackdrop.create(
        scene,
        sceneState,
        1.25,
      );
    const workspace = drawScript.PacePetsPerfectZeroSpaceDraw.createWorkspace();
    const firstFrame = drawScript.PacePetsPerfectZeroSpaceDraw.drawFrame(
      targetContext,
      scene,
      sceneState,
      100,
      { backdropLayer, pixelRatio: 1.25, previousFrame: null, workspace },
    );
    sceneState.stars[1].x = 80;
    const secondFrame = drawScript.PacePetsPerfectZeroSpaceDraw.drawFrame(
      targetContext,
      scene,
      sceneState,
      116,
      {
        backdropLayer,
        pixelRatio: 1.25,
        previousFrame: firstFrame,
        workspace,
      },
    );
    const thirdFrame = drawScript.PacePetsPerfectZeroSpaceDraw.drawFrame(
      targetContext,
      scene,
      sceneState,
      132,
      {
        backdropLayer,
        pixelRatio: 1.25,
        previousFrame: secondFrame,
        workspace,
      },
    );

    expectDirtyFrameEvidence({
      backdropCanvas,
      backdropContext,
      backdropLayer,
      sceneState,
      targetContext,
      updateStarSparkle,
    });
    expect(secondFrame).not.toBe(firstFrame);
    expect(thirdFrame).toBe(firstFrame);
    expect(new Set(starProgressResults).size).toBe(1);
  });
});

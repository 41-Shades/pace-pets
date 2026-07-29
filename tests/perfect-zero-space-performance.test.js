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
    drawImage: vi.fn(),
    fill: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
  };
}

describe("Perfect Zero space rendering", () => {
  it("measures layout only when resize or DPR invalidates the scene", () => {
    const backdrop = { create: vi.fn(() => ({})) };
    const draw = { drawFrame: vi.fn() };
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

    script.devicePixelRatio = 1;
    scene.renderFrame(48);

    expect(canvasRect).toHaveBeenCalledTimes(2);
    expect(containerRect).toHaveBeenCalledTimes(2);
    expect(createSceneState).toHaveBeenCalledTimes(2);
    expect(backdrop.create).toHaveBeenCalledTimes(2);

    scene.handleResize();

    expect(canvasRect).toHaveBeenCalledTimes(3);
    expect(containerRect).toHaveBeenCalledTimes(3);
    expect(createSceneState).toHaveBeenCalledTimes(3);
    expect(backdrop.create).toHaveBeenCalledTimes(3);
  });
});

describe("Perfect Zero space backdrop layer", () => {
  it("rasterizes only the backdrop and retains original star order", () => {
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
    const drawScript = loadScript("perfect-zero-space-draw.js", {
      PacePetsPerfectZeroSpaceData: {},
      PacePetsPerfectZeroSpaceMotion: {
        starProgress: (star) => ({ opacity: star.baseOpacity, scale: 1 }),
        updateStarSparkle,
      },
    });
    const scene = {
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
    drawScript.PacePetsPerfectZeroSpaceDraw.drawFrame(
      targetContext,
      scene,
      sceneState,
      100,
      backdropLayer,
    );
    drawScript.PacePetsPerfectZeroSpaceDraw.drawFrame(
      targetContext,
      scene,
      sceneState,
      116,
      backdropLayer,
    );

    expect(backdropCanvas).toMatchObject({ height: 101, width: 126 });
    expect(backdropContext.createRadialGradient).toHaveBeenCalledOnce();
    expect(backdropContext.arc).not.toHaveBeenCalled();
    expect(targetContext.drawImage).toHaveBeenCalledTimes(2);
    expect(targetContext.drawImage).toHaveBeenLastCalledWith(
      backdropLayer,
      0,
      0,
    );
    expect(targetContext.arc).toHaveBeenCalledTimes(4);
    expect(updateStarSparkle.mock.calls.map(([star]) => star)).toEqual([
      sceneState.stars[0],
      sceneState.stars[1],
      sceneState.stars[0],
      sceneState.stars[1],
    ]);
  });
});

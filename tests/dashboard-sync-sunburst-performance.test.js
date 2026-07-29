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

describe("Perfect Sync sunburst cached layout", () => {
  it("reads layout only when viewport inputs change or it is invalidated", () => {
    const canvasRect = vi.fn(() => ({ height: 600, width: 800 }));
    const panelRect = vi.fn(() => ({ width: 620 }));
    const context2d = { setTransform: vi.fn() };
    const canvas = { getBoundingClientRect: canvasRect, height: 0, width: 0 };
    const context = loadScript("dashboard-sync-sunburst-layout.js", {
      devicePixelRatio: 2,
      document: {
        documentElement: { clientHeight: 600, clientWidth: 800 },
        querySelector: () => ({ getBoundingClientRect: panelRect }),
      },
      innerHeight: 600,
      innerWidth: 800,
    });
    const layout = context.PacePetsDashboardSyncSunburstLayout.create(
      canvas,
      context2d,
    );

    const first = layout.current();
    const second = layout.current();

    expect(second).toBe(first);
    expect(canvasRect).toHaveBeenCalledTimes(1);
    expect(panelRect).toHaveBeenCalledTimes(1);
    expect(context2d.setTransform).toHaveBeenCalledTimes(1);
    expect(canvas).toMatchObject({ height: 1200, width: 1600 });

    context.innerWidth = 900;
    layout.current();
    layout.invalidate();
    layout.current();

    expect(canvasRect).toHaveBeenCalledTimes(3);
    expect(panelRect).toHaveBeenCalledTimes(3);
    expect(context2d.setTransform).toHaveBeenCalledTimes(3);
  });
});

describe("Perfect Sync sunburst ray preparation", () => {
  it("precomputes static geometry and calculates only live length motion", () => {
    const math = Object.create(Math);
    math.cos = vi.fn(Math.cos);
    math.sin = vi.fn(Math.sin);
    const context = loadScript("dashboard-sync-sunburst-rays.js", {
      Math: math,
    });
    const rays = context.PacePetsDashboardSyncSunburstRays.create();
    const cosineCallsAfterCreate = math.cos.mock.calls.length;
    const ray = rays[0];

    expect(rays.length).toBeGreaterThanOrEqual(68);
    expect(rays.length).toBeLessThanOrEqual(76);
    expect(Object.keys(ray.geometry)).toEqual([
      "leftInner",
      "leftOuter",
      "rightInner",
      "rightOuter",
      "tip",
    ]);
    expect(
      context.PacePetsDashboardSyncSunburstRays.lengthMultiplier(
        5000,
        ray,
        null,
      ),
    ).toBe(1);

    const multiplier =
      context.PacePetsDashboardSyncSunburstRays.lengthMultiplier(5000, ray, 0);

    expect(multiplier).toBeGreaterThanOrEqual(0.93);
    expect(multiplier).toBeLessThanOrEqual(1.08);
    expect(math.cos).toHaveBeenCalledTimes(cosineCallsAfterCreate);
  });
});

describe("Perfect Sync sunburst core cache", () => {
  it("rebuilds only when raster inputs change", () => {
    const drawCore = vi.fn();
    const cacheContext = { setTransform: vi.fn() };
    const cacheCanvas = {
      getContext: vi.fn(() => cacheContext),
      height: 0,
      width: 0,
    };
    const context = loadScript("dashboard-sync-sunburst-core-cache.js", {
      PacePetsDashboardSyncSunburstDraw: { drawCore },
      console: { warn: vi.fn() },
      document: { createElement: vi.fn(() => cacheCanvas) },
    });
    const cache = context.PacePetsDashboardSyncSunburstCoreCache.create();
    const targetContext = { drawImage: vi.fn() };
    const frame = { origin: { x: 400, y: 300 }, radius: 300 };

    cache.draw(targetContext, frame, 2);
    cache.draw(targetContext, frame, 2);
    frame.origin = { x: 420, y: 310 };
    cache.draw(targetContext, frame, 2);

    expect(drawCore).toHaveBeenCalledTimes(1);
    expect(targetContext.drawImage).toHaveBeenCalledTimes(3);

    frame.radius = 320;
    cache.draw(targetContext, frame, 2);
    cache.invalidate();
    cache.draw(targetContext, frame, 2);

    expect(drawCore).toHaveBeenCalledTimes(3);
  });
});

describe("Perfect Sync sunburst turnover", () => {
  it("reuses its opacity map across active frames", () => {
    const context = loadScript("dashboard-sync-sunburst-turnover.js");
    const turnover = context.PacePetsDashboardSyncSunburstTurnover.create();
    const rays = Array.from({ length: 12 }, () => ({}));
    const createRay = () => ({});

    expect(turnover.opacities(1000, rays, createRay, 1)).toBeNull();
    const first = turnover.opacities(1600, rays, createRay, 1);
    const second = turnover.opacities(1610, rays, createRay, 1);

    expect(first.size).toBeGreaterThan(0);
    expect(second).toBe(first);
  });
});

describe("Perfect Sync settled rendering", () => {
  it("reuses settled styles, frame state, and the cached core", () => {
    const style = { removeProperty: vi.fn(), setProperty: vi.fn() };
    const context2d = { clearRect: vi.fn() };
    const canvas = {
      getContext: vi.fn(() => context2d),
      remove: vi.fn(),
      setAttribute: vi.fn(),
    };
    const coreCache = {
      clear: vi.fn(),
      draw: vi.fn(),
      invalidate: vi.fn(),
    };
    const layout = {
      current: vi.fn(() => ({
        height: 600,
        pixelRatio: 2,
        radius: 300,
        width: 800,
      })),
      invalidate: vi.fn(),
    };
    const drawRay = vi.fn();
    const context = loadScript("dashboard-sync-sunburst-renderer.js", {
      PacePetsDashboardPreferences: {
        addMotionPreferenceChangeListener: () => vi.fn(),
        motionPreferenceEnabled: () => true,
      },
      PacePetsDashboardSyncSunburstCoreCache: {
        create: () => coreCache,
      },
      PacePetsDashboardSyncSunburstDraw: {
        drawCore: vi.fn(),
        drawRay,
      },
      PacePetsDashboardSyncSunburstLayout: {
        create: () => layout,
      },
      PacePetsDashboardSyncSunburstRays: {
        create: () => [{ alpha: 1 }],
        createReplacement: () => ({}),
        lengthMultiplier: () => 1,
      },
      PacePetsDashboardSyncSunburstTurnover: {
        create: () => ({ opacities: () => null }),
      },
      addEventListener: vi.fn(),
      cancelAnimationFrame: vi.fn(),
      clearTimeout: vi.fn(),
      document: {
        addEventListener: vi.fn(),
        body: {
          classList: { add: vi.fn(), remove: vi.fn() },
          prepend: vi.fn(),
          style,
        },
        createElement: vi.fn(() => canvas),
        hidden: true,
        removeEventListener: vi.fn(),
      },
      performance: { now: () => 30000 },
      removeEventListener: vi.fn(),
      requestAnimationFrame: vi.fn(),
      setTimeout: vi.fn(),
    });
    const scene = context.PacePetsDashboardSyncSunburst.create(
      { x: 400, y: 300 },
      { startComplete: true },
    );

    scene.renderFrame(31000);

    expect(style.setProperty).toHaveBeenCalledTimes(2);
    expect(coreCache.draw).toHaveBeenCalledTimes(2);
    expect(drawRay).toHaveBeenCalledTimes(2);

    scene.handleResize();
    expect(layout.invalidate).toHaveBeenCalledTimes(1);
    expect(coreCache.invalidate).toHaveBeenCalledTimes(1);
    expect(style.setProperty).toHaveBeenCalledTimes(2);

    scene.stop();
    expect(coreCache.clear).toHaveBeenCalledTimes(1);
  });
});

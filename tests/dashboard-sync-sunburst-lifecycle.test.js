import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../collector/extension",
);

function loadScripts(fileNames, globals = {}) {
  const context = vm.createContext(globals);
  for (const fileName of fileNames) {
    const source = fs.readFileSync(path.join(extensionRoot, fileName), "utf8");
    new vm.Script(source, { filename: fileName }).runInContext(context);
  }
  return context;
}

function createSceneLifecycleHarness({ startComplete = true } = {}) {
  let callbacks;
  const anchor = {
    getBoundingClientRect: vi.fn(() => ({
      left: 350,
      top: 250,
      width: 100,
      height: 100,
    })),
  };
  const canvas = {
    hidden: false,
    remove: vi.fn(),
    setAttribute: vi.fn(),
  };
  const core = {
    destroy: vi.fn(),
    finish: vi.fn(),
    resize: vi.fn(),
    setVisible: vi.fn(),
  };
  const webgl = {
    destroy: vi.fn(),
    render: vi.fn(),
    resize: vi.fn(),
    uploadRays: vi.fn(),
  };
  const classList = { toggle: vi.fn() };
  const document = {
    addEventListener: vi.fn(),
    body: {
      classList,
      prepend: vi.fn(),
      style: { removeProperty: vi.fn(), setProperty: vi.fn() },
    },
    createElement: vi.fn(() => canvas),
    hidden: false,
    removeEventListener: vi.fn(),
  };
  const context = loadScripts(["dashboard-sync-sunburst-renderer.js"], {
    PacePetsDashboardPreferences: {
      addMotionPreferenceChangeListener: () => vi.fn(),
      motionPreferenceEnabled: () => true,
    },
    PacePetsDashboardSyncSunburstCore: { create: () => core },
    PacePetsDashboardSyncSunburstLayout: {
      create: () => ({
        current: () => ({ pixelRatio: 2, radius: 300 }),
        invalidate: vi.fn(),
      }),
    },
    PacePetsDashboardSyncSunburstRays: {
      create: () => [{}],
      createReplacement: vi.fn(),
    },
    PacePetsDashboardSyncSunburstTurnover: {
      create: () => ({ update: () => false }),
    },
    PacePetsDashboardSyncSunburstWebglRenderer: {
      create: (_, nextCallbacks) => {
        callbacks = nextCallbacks;
        return webgl;
      },
    },
    addEventListener: vi.fn(),
    cancelAnimationFrame: vi.fn(),
    clearTimeout: vi.fn(),
    document,
    performance: { now: () => 31_000 },
    removeEventListener: vi.fn(),
    requestAnimationFrame: vi.fn(() => 2),
    setTimeout: vi.fn(() => 1),
  });
  const scene = context.PacePetsDashboardSyncSunburst.create(anchor, {
    startComplete,
    startedAtMs: startComplete ? null : 30_000,
  });
  return { anchor, callbacks, canvas, classList, context, core, scene, webgl };
}

describe("Perfect Sync scene presentation lifecycle", () => {
  it("reanchors retained layers on resize and scroll without restarting the rise", () => {
    const { anchor, context, core, scene, webgl } = createSceneLifecycleHarness(
      { startComplete: false },
    );
    const rays = scene.rays;
    const startTimeMs = scene.startTimeMs;
    const resize = context.addEventListener.mock.calls.find(
      ([name]) => name === "resize",
    )[1];
    const scroll = context.addEventListener.mock.calls.find(
      ([name]) => name === "scroll",
    )[1];
    expect(anchor.getBoundingClientRect).toHaveBeenCalledOnce();
    expect(core.resize).toHaveBeenLastCalledWith({ x: 400, y: 300 }, 300, 2);

    scene.draw(null, 31_500);
    expect(anchor.getBoundingClientRect).toHaveBeenCalledOnce();
    anchor.getBoundingClientRect.mockReturnValue({
      left: 650,
      top: 350,
      width: 100,
      height: 100,
    });
    resize();
    expect(core.resize).toHaveBeenLastCalledWith({ x: 700, y: 400 }, 300, 2);
    expect(webgl.resize).toHaveBeenLastCalledWith(expect.any(Object), {
      x: 700,
      y: 400,
    });
    expect(scene.startTimeMs).toBe(startTimeMs);
    expect(scene.rays).toBe(rays);
    expect(webgl.uploadRays).toHaveBeenCalledOnce();

    anchor.getBoundingClientRect.mockReturnValue({
      left: 650,
      top: 150,
      width: 100,
      height: 100,
    });
    scroll();
    expect(core.resize).toHaveBeenLastCalledWith({ x: 700, y: 200 }, 300, 2);
    expect(anchor.getBoundingClientRect).toHaveBeenCalledTimes(3);
    scene.stop();
    expect(context.removeEventListener).toHaveBeenCalledWith("resize", resize);
    expect(context.removeEventListener).toHaveBeenCalledWith("scroll", scroll);
  });

  it("hides every retained layer while the WebGL context is lost", () => {
    const { callbacks, canvas, classList, core, scene, webgl } =
      createSceneLifecycleHarness();
    expect(scene).not.toBeNull();
    expect(canvas.hidden).toBe(false);
    expect(webgl.render).toHaveBeenCalledWith(
      expect.objectContaining({ finishedAtMs: 31_000 }),
    );
    expect(core.setVisible).toHaveBeenLastCalledWith(true);
    expect(classList.toggle).toHaveBeenLastCalledWith(
      "has-sync-sunburst-page-background",
      true,
    );
    callbacks.onContextLost();
    expect(canvas.hidden).toBe(true);
    expect(core.setVisible).toHaveBeenLastCalledWith(false);
    expect(classList.toggle).toHaveBeenLastCalledWith(
      "has-sync-sunburst-page-background",
      false,
    );
    callbacks.onContextRestored();
    expect(canvas.hidden).toBe(false);
    expect(core.setVisible).toHaveBeenLastCalledWith(true);
    expect(classList.toggle).toHaveBeenLastCalledWith(
      "has-sync-sunburst-page-background",
      true,
    );

    scene.stop();
    expect(canvas.hidden).toBe(true);
    expect(core.destroy).toHaveBeenCalledOnce();
    expect(webgl.destroy).toHaveBeenCalledOnce();
  });

  it("lets the hidden attribute override retained layer display rules", () => {
    const css = fs.readFileSync(
      path.join(extensionRoot, "dashboard-sync-effects.css"),
      "utf8",
    );

    expect(css).toMatch(
      /\.sync-sunburst-page-background\[hidden\],[\s\S]*?\.sync-sunburst-core-glow\[hidden\],[\s\S]*?\.sync-sunburst-core-bloom\[hidden\] \{[\s\S]*?display: none;/,
    );
  });
});

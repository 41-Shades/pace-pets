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

function createGl() {
  return {
    ARRAY_BUFFER: 1,
    BLEND: 2,
    COLOR_BUFFER_BIT: 4,
    COMPILE_STATUS: 5,
    CULL_FACE: 6,
    DEPTH_TEST: 7,
    DYNAMIC_DRAW: 8,
    FLOAT: 9,
    FRAGMENT_SHADER: 10,
    LINK_STATUS: 11,
    ONE: 12,
    ONE_MINUS_SRC_ALPHA: 13,
    TRIANGLES: 14,
    VERTEX_SHADER: 15,
    attachShader: vi.fn(),
    bindBuffer: vi.fn(),
    blendFunc: vi.fn(),
    bufferData: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    compileShader: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    createProgram: vi.fn(() => ({})),
    createShader: vi.fn(() => ({})),
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    disable: vi.fn(),
    drawArrays: vi.fn(),
    enable: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    getAttribLocation: vi.fn((_, name) => name.length),
    getProgramInfoLog: vi.fn(() => ""),
    getProgramParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ""),
    getShaderParameter: vi.fn(() => true),
    getUniformLocation: vi.fn((_, name) => ({ name })),
    linkProgram: vi.fn(),
    shaderSource: vi.fn(),
    uniform1f: vi.fn(),
    useProgram: vi.fn(),
    vertexAttribPointer: vi.fn(),
    viewport: vi.fn(),
  };
}

function createSceneLifecycleHarness() {
  let callbacks;
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
  const scene = context.PacePetsDashboardSyncSunburst.create(
    { x: 400, y: 300 },
    { startComplete: true },
  );
  return { callbacks, canvas, classList, core, scene, webgl };
}

describe("Perfect Sync retained sunburst layout", () => {
  it("reads panel geometry only when viewport inputs change", () => {
    const panelRect = vi.fn(() => ({ width: 620 }));
    const context = loadScripts(["dashboard-sync-sunburst-layout.js"], {
      devicePixelRatio: 2,
      document: {
        documentElement: { clientHeight: 600, clientWidth: 800 },
        querySelector: () => ({ getBoundingClientRect: panelRect }),
      },
      innerHeight: 600,
      innerWidth: 800,
    });
    const layout = context.PacePetsDashboardSyncSunburstLayout.create();

    expect(layout.current()).toBe(layout.current());
    expect(panelRect).toHaveBeenCalledTimes(1);

    context.innerWidth = 900;
    layout.current();
    layout.invalidate();
    layout.current();

    expect(panelRect).toHaveBeenCalledTimes(3);
  });
});
describe("Perfect Sync retained ray profiles", () => {
  it("prepares bounded shader-ready ray data once", () => {
    const context = loadScripts(["dashboard-sync-sunburst-rays.js"]);
    const rays = context.PacePetsDashboardSyncSunburstRays.create();
    const ray = rays[0];

    expect(rays.length).toBeGreaterThanOrEqual(68);
    expect(rays.length).toBeLessThanOrEqual(76);
    expect(ray).toMatchObject({
      alpha: expect.any(Number),
      angle: expect.any(Number),
      bodyLightness: expect.any(Number),
      innerWidthScale: expect.any(Number),
      lengthMotionAmplitude: expect.any(Number),
      width: expect.any(Number),
    });
    expect(ray.geometry).toBeUndefined();
    expect(context.PacePetsDashboardSyncSunburstRays.MAX_EXTENT_SCALE).toBe(
      1.1 * 1.08,
    );
  });
});

describe("Perfect Sync retained core", () => {
  it("rasterizes the original Canvas gradients once per size", () => {
    const gradients = [];
    const canvases = [];
    const document = {
      body: { prepend: vi.fn() },
      createElement: vi.fn((tagName) => {
        expect(tagName).toBe("canvas");
        const gradient = { addColorStop: vi.fn() };
        const context2d = {
          arc: vi.fn(),
          beginPath: vi.fn(),
          createRadialGradient: vi.fn(() => {
            gradients.push(gradient);
            return gradient;
          }),
          fill: vi.fn(),
          setTransform: vi.fn(),
        };
        const canvas = {
          animate: vi.fn(),
          getContext: vi.fn(() => context2d),
          height: 0,
          remove: vi.fn(),
          setAttribute: vi.fn(),
          style: {},
          width: 0,
        };
        canvases.push({ canvas, context2d, gradient });
        return canvas;
      }),
    };
    const context = loadScripts(["dashboard-sync-sunburst-core.js"], {
      console: { warn: vi.fn() },
      document,
      performance: { now: () => 30_000 },
    });
    const core = context.PacePetsDashboardSyncSunburstCore.create(0, false);

    core.resize({ x: 400, y: 300 }, 500, 2);
    core.resize({ x: 450, y: 350 }, 500, 2);
    core.setVisible(false);
    expect(canvases.every(({ canvas }) => canvas.hidden)).toBe(true);
    core.setVisible(true);
    expect(canvases.every(({ canvas }) => !canvas.hidden)).toBe(true);

    expect(canvases).toHaveLength(2);
    expect(gradients).toHaveLength(2);
    expect(canvases[0].gradient.addColorStop.mock.calls).toEqual([
      [0, "rgb(255 255 255 / 0.8)"],
      [0.18, "rgb(255 251 178 / 0.72)"],
      [0.46, "rgb(255 219 21 / 0.368)"],
      [1, "rgb(255 242 137 / 0)"],
    ]);
    expect(canvases[1].gradient.addColorStop.mock.calls).toEqual([
      [0, "rgb(255 255 255 / 0.496)"],
      [0.35, "rgb(255 238 93 / 0.224)"],
      [1, "rgb(255 245 170 / 0)"],
    ]);
    expect(
      canvases.every(
        ({ context2d }) =>
          context2d.createRadialGradient.mock.calls.length === 1,
      ),
    ).toBe(true);
  });
});

describe("Perfect Sync scene presentation lifecycle", () => {
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

describe("Perfect Sync event-based turnover", () => {
  it("reports only ray membership and fade metadata changes", () => {
    const math = Object.create(Math);
    math.random = () => 0;
    const context = loadScripts(["dashboard-sync-sunburst-turnover.js"], {
      Math: math,
    });
    const turnover = context.PacePetsDashboardSyncSunburstTurnover.create();
    const rays = Array.from({ length: 12 }, (_, layer) => ({ layer }));
    const replacement = { layer: 0 };

    expect(turnover.update(1000, rays, () => replacement, 1)).toBe(false);
    expect(turnover.update(2000, rays, () => replacement, 1)).toBe(true);
    expect(turnover.fadeState(replacement)).toMatchObject({
      mode: 1,
      startedAtMs: 2000,
    });
    expect(turnover.update(2010, rays, () => ({}), 1)).toBe(false);
  });
});

describe("Perfect Sync retained WebGL rendering", () => {
  it("uploads ray geometry once and keeps ordinary frames uniform-only", () => {
    const gl = createGl();
    const canvas = {
      addEventListener: vi.fn(),
      getContext: vi.fn((kind) => (kind === "webgl" ? gl : null)),
      height: 0,
      removeEventListener: vi.fn(),
      style: {},
      width: 0,
    };
    const context = loadScripts(
      [
        "dashboard-sync-sunburst-rays.js",
        "dashboard-sync-sunburst-shaders.js",
        "dashboard-sync-sunburst-webgl-renderer.js",
      ],
      { console: { warn: vi.fn() } },
    );
    const rays = context.PacePetsDashboardSyncSunburstRays.create();
    const turnover = { fadeState: () => null };
    const callbacks = {
      onContextLost: vi.fn(),
      onContextRestored: vi.fn(),
      onRestoreFailed: vi.fn(),
    };
    const renderer = context.PacePetsDashboardSyncSunburstWebglRenderer.create(
      canvas,
      callbacks,
    );
    const settledFrame = (timestamp) => ({
      finishedAtMs: 0,
      opacity: 0.64,
      progress: 1,
      radius: 300,
      timestamp,
    });

    renderer.resize({ pixelRatio: 2, radius: 300 }, { x: 400, y: 300 });
    renderer.uploadRays(rays, turnover);
    renderer.render(settledFrame(31000));
    renderer.render(settledFrame(31033));

    expect(canvas.getContext).not.toHaveBeenCalledWith("2d");
    expect(gl.bufferData).toHaveBeenCalledTimes(1);
    expect(gl.uniform1f).toHaveBeenCalledTimes(7);
    expect(gl.useProgram).toHaveBeenCalledOnce();
    expect(gl.drawArrays).toHaveBeenCalledTimes(2);
    expect(gl.drawArrays).toHaveBeenLastCalledWith(
      gl.TRIANGLES,
      0,
      rays.length * 6,
    );
    expect(canvas.width).toBeLessThanOrEqual(1600);

    const listeners = Object.fromEntries(canvas.addEventListener.mock.calls);
    const contextLoss = { preventDefault: vi.fn() };
    listeners.webglcontextlost(contextLoss);
    expect(contextLoss.preventDefault).toHaveBeenCalledOnce();
    expect(callbacks.onContextLost).toHaveBeenCalledOnce();
    expect(renderer.render({})).toBe(false);

    listeners.webglcontextrestored();
    expect(callbacks.onContextRestored).toHaveBeenCalledOnce();
    expect(callbacks.onRestoreFailed).not.toHaveBeenCalled();
    expect(gl.bufferData).toHaveBeenCalledTimes(2);
    renderer.render(settledFrame(31066));
    expect(gl.uniform1f).toHaveBeenCalledTimes(13);
    expect(gl.useProgram).toHaveBeenCalledTimes(2);

    renderer.destroy();
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
  });
});

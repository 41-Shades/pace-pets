import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../collector/extension",
);

function runScript(context, fileName) {
  const source = fs.readFileSync(path.join(extensionRoot, fileName), "utf8");
  new vm.Script(source, { filename: fileName }).runInContext(context);
}

function createContext(globals = {}) {
  return vm.createContext({ console, ...globals });
}

function createWebGl() {
  let nextResourceId = 0;
  const resource = () => ({ id: (nextResourceId += 1) });
  return {
    ARRAY_BUFFER: 1,
    BLEND: 2,
    COLOR_BUFFER_BIT: 4,
    COMPILE_STATUS: 5,
    DYNAMIC_DRAW: 6,
    ELEMENT_ARRAY_BUFFER: 7,
    FLOAT: 8,
    FRAGMENT_SHADER: 9,
    LINEAR: 10,
    LINK_STATUS: 11,
    ONE_MINUS_SRC_ALPHA: 12,
    RGBA: 13,
    SRC_ALPHA: 14,
    STATIC_DRAW: 15,
    TEXTURE_2D: 16,
    TEXTURE_MAG_FILTER: 17,
    TEXTURE_MIN_FILTER: 18,
    TEXTURE_WRAP_S: 19,
    TEXTURE_WRAP_T: 20,
    TRIANGLES: 21,
    UNSIGNED_BYTE: 22,
    UNSIGNED_SHORT: 23,
    VERTEX_SHADER: 24,
    attachShader: vi.fn(),
    bindBuffer: vi.fn(),
    bindTexture: vi.fn(),
    blendFunc: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    compileShader: vi.fn(),
    createBuffer: vi.fn(resource),
    createProgram: vi.fn(resource),
    createShader: vi.fn(resource),
    createTexture: vi.fn(resource),
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    deleteTexture: vi.fn(),
    drawElements: vi.fn(),
    enable: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    getAttribLocation: vi.fn(() => 1),
    getProgramParameter: vi.fn(() => true),
    getShaderParameter: vi.fn(() => true),
    linkProgram: vi.fn(),
    shaderSource: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    useProgram: vi.fn(),
    vertexAttribPointer: vi.fn(),
    viewport: vi.fn(),
  };
}

describe("Push canvas layout", () => {
  it("measures only on invalidation or DPR changes", () => {
    const rect = vi.fn(() => ({ height: 20, width: 30 }));
    const canvas = { getBoundingClientRect: rect, height: 0, width: 0 };
    const context = createContext({ devicePixelRatio: 2 });
    runScript(context, "dashboard-push-canvas-layout.js");
    const layout = context.PacePetsDashboardPushCanvasLayout.create(canvas);

    expect(layout.current()).toBe(layout.current());
    expect(rect).toHaveBeenCalledTimes(1);
    expect(canvas).toMatchObject({ height: 40, width: 60 });

    layout.invalidate();
    layout.current();
    context.devicePixelRatio = 1;
    layout.current();

    expect(rect).toHaveBeenCalledTimes(3);
    expect(canvas).toMatchObject({ height: 20, width: 30 });
  });
});

describe("Push stretch renderer", () => {
  it("keeps the original geometry inside a right-sized independent surface", () => {
    const gl = createWebGl();
    const style = {};
    const rect = vi.fn(() => ({
      height: (Number.parseFloat(style.height) / 100) * 96,
      width: (Number.parseFloat(style.width) / 100) * 96,
    }));
    const canvas = {
      getBoundingClientRect: rect,
      getContext: () => gl,
      height: 0,
      style,
      width: 0,
    };
    const context = createContext({ devicePixelRatio: 2 });
    runScript(context, "dashboard-push-canvas-layout.js");
    runScript(context, "dashboard-push-stretch-geometry.js");
    runScript(context, "dashboard-push-stretch-renderer.js");
    const renderer = context.PacePetsDashboardPushStretch.createRenderer(
      canvas,
      {},
    );
    const profile = context.PacePetsDashboardPushStretch.NORMAL_PROFILE;
    const bounds = context.PacePetsDashboardPushStretch.SURFACE_BOUNDS;

    renderer.render(profile, 0);
    const uploaded = Array.from(gl.bufferSubData.mock.calls[0][2]);
    renderer.render(profile, 0);

    expect(rect).toHaveBeenCalledTimes(1);
    expect(gl.bufferSubData).toHaveBeenCalledTimes(1);
    expect(gl.drawElements).toHaveBeenCalledTimes(2);
    expect(uploaded).toHaveLength(29 * 29 * 2);
    expect(uploaded.every(Number.isFinite)).toBe(true);
    expect(canvas.width * canvas.height).toBeLessThan(3264 * 3264 * 0.2);
    expect(bounds.right - bounds.left).toBeLessThan(8);
    expect(bounds.bottom - bounds.top).toBeLessThan(7);

    renderer.render(profile, 0.65);

    renderer.invalidateLayout();
    renderer.render(profile, 0.65);

    expect(rect).toHaveBeenCalledTimes(2);
    expect(gl.bufferSubData).toHaveBeenCalledTimes(3);
    expect(gl.drawElements).toHaveBeenCalledTimes(4);

    renderer.destroy();
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(3);
    expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
  });
});

describe("Push sweat renderer", () => {
  it("reuses icon and ground measurements across frames", () => {
    const iconRect = vi.fn(() => ({
      height: 96,
      top: 0,
      width: 96,
    }));
    const groundRect = vi.fn(() => ({ bottom: 80, height: 60 }));
    const context2d = { clearRect: vi.fn() };
    const canvas = {
      getContext: () => context2d,
      height: 0,
      parentElement: { getBoundingClientRect: iconRect },
      style: {},
      width: 0,
    };
    const context = createContext({
      PacePetsDashboardPushStretch: {
        NORMAL_PROFILE: {},
        pulseAmount: () => 0,
      },
      PacePetsDashboardPushSweatVariation: {
        createTrackCache: () => ({ forCycle: () => [] }),
      },
      devicePixelRatio: 2,
    });
    runScript(context, "dashboard-push-stretch-geometry.js");
    runScript(context, "dashboard-push-sweat-data.js");
    runScript(context, "dashboard-push-sweat-surface.js");
    runScript(context, "dashboard-push-sweat-renderer.js");
    const renderer = context.PacePetsDashboardPushSweat.createRenderer(canvas, {
      getBoundingClientRect: groundRect,
    });
    const frame = {
      amount: 0,
      cycleIndex: 0,
      iconRenderer: {},
      phase: 0,
      previousCycleIndex: -1,
      previousProfile: null,
      previousPulseLevel: null,
      profile: {},
      pulseLevel: "normal",
    };

    renderer.render(frame);
    renderer.render(frame);

    expect(iconRect).toHaveBeenCalledTimes(1);
    expect(groundRect).toHaveBeenCalledTimes(1);
    expect(canvas.width * canvas.height).toBeLessThan(3264 * 3264 * 0.2);

    renderer.invalidateLayout();
    renderer.render(frame);

    expect(iconRect).toHaveBeenCalledTimes(2);
    expect(groundRect).toHaveBeenCalledTimes(2);
  });
});

describe("Push water renderer", () => {
  it("samples each wave coordinate once and reuses it for every pass", () => {
    const math = Object.create(Math);
    math.sin = vi.fn(Math.sin);
    const gradient = { addColorStop: vi.fn() };
    const context2d = {
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      clip: vi.fn(),
      closePath: vi.fn(),
      createLinearGradient: vi.fn(() => gradient),
      fill: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      stroke: vi.fn(),
    };
    const rect = vi.fn(() => ({ height: 20, width: 16 }));
    const canvas = {
      getBoundingClientRect: rect,
      getContext: () => context2d,
      height: 0,
      width: 0,
    };
    const context = createContext({
      Math: math,
      PacePetsDashboardPushTank: {
        createRenderer: () => ({
          renderSubmerged: vi.fn(),
          renderSurface: vi.fn(),
        }),
      },
      devicePixelRatio: 1,
    });
    runScript(context, "dashboard-push-canvas-layout.js");
    runScript(context, "dashboard-push-water-renderer.js");
    const renderer = context.PacePetsDashboardPushWater.createRenderer(canvas);

    renderer.render(100, 0);
    renderer.render(100, 100);

    expect(rect).toHaveBeenCalledTimes(1);
    expect(math.sin).toHaveBeenCalledTimes(6);
    expect(context2d.moveTo).toHaveBeenCalledTimes(3);
    expect(context2d.moveTo.mock.calls.map((call) => call[1])).toEqual([
      context2d.moveTo.mock.calls[0][1],
      context2d.moveTo.mock.calls[0][1],
      context2d.moveTo.mock.calls[0][1],
    ]);
    const ripple = 1 - Math.exp(-0.08 * 8);
    const originalWaveY = (x) => {
      const progress = x / 16;
      const phase = 100 / 470;
      const amplitude = 1.1 + ripple * 3.2;
      return (
        19.2 +
        Math.sin(progress * Math.PI * 5.2 + phase) * amplitude +
        Math.sin(progress * Math.PI * 2.4 - phase * 0.7) * amplitude * 0.34
      );
    };
    expect(context2d.moveTo.mock.calls[0]).toEqual([0, originalWaveY(0)]);
    expect(context2d.lineTo.mock.calls[0]).toEqual([8, originalWaveY(8)]);
    expect(context2d.lineTo.mock.calls[1]).toEqual([16, originalWaveY(16)]);
  });
});

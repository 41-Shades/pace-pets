import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../collector/extension",
);

function loadEclipseIcon() {
  const math = Object.create(Math);
  math.cos = vi.fn(Math.cos);
  math.sin = vi.fn(Math.sin);

  const gradient = () => ({ addColorStop: vi.fn() });
  const context2d = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    createRadialGradient: vi.fn(gradient),
    fill: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
  };
  const canvas = {
    getContext: vi.fn(() => context2d),
    height: 0,
    isConnected: false,
    remove: vi.fn(),
    setAttribute: vi.fn(),
    width: 0,
  };
  const icon = {
    append: vi.fn(() => {
      canvas.isConnected = true;
    }),
  };
  const window = {
    cancelAnimationFrame: vi.fn(),
    devicePixelRatio: 1,
    requestAnimationFrame: vi.fn(() => 1),
  };
  const context = vm.createContext({
    Math: math,
    PacePetsDashboardPreferences: {
      motionPreferenceEnabled: () => true,
    },
    document: { createElement: vi.fn(() => canvas) },
    performance: { now: () => 1000 },
    window,
  });
  const source = fs.readFileSync(
    path.join(extensionRoot, "dashboard-eclipse-icon.js"),
    "utf8",
  );
  new vm.Script(source, { filename: "dashboard-eclipse-icon.js" }).runInContext(
    context,
  );
  const controller = context.PacePetsDashboardEclipseIcon.create({
    querySelector: () => icon,
  });

  return { canvas, context2d, controller, math, window };
}

describe("Perfect Zero eclipse icon rendering", () => {
  it("precomputes ray trigonometry without changing live ray motion", () => {
    const { context2d, controller, math } = loadEclipseIcon();
    const cosineCallsAfterCreate = math.cos.mock.calls.length;
    const sineCallsAfterCreate = math.sin.mock.calls.length;

    controller.start();

    expect(math.cos.mock.calls.length - cosineCallsAfterCreate).toBe(4);
    expect(math.sin.mock.calls.length - sineCallsAfterCreate).toBe(126);
    expect(context2d.quadraticCurveTo).toHaveBeenCalledTimes(118);

    const ray = controller.rays[0];
    const shimmer = 0.76 + globalThis.Math.sin(ray.phase) * 0.24;
    const endRadius = 6.4 + ray.length * shimmer;
    const middleAngle = ray.angle + ray.curve * 0.025;
    const middleRadius = 6.4 + ray.length * 0.52;
    expect(context2d.moveTo.mock.calls[0]).toEqual([
      14 + globalThis.Math.cos(ray.angle) * (6.4 * 0.92),
      14 + globalThis.Math.sin(ray.angle) * (6.4 * 0.92),
    ]);
    expect(context2d.quadraticCurveTo.mock.calls[0]).toEqual([
      14 + globalThis.Math.cos(middleAngle) * middleRadius,
      14 + globalThis.Math.sin(middleAngle) * middleRadius,
      14 + globalThis.Math.cos(ray.angle) * endRadius,
      14 + globalThis.Math.sin(ray.angle) * endRadius,
    ]);

    controller.draw(1016);

    expect(math.cos.mock.calls.length - cosineCallsAfterCreate).toBe(8);
    expect(math.sin.mock.calls.length - sineCallsAfterCreate).toBe(252);
    expect(context2d.quadraticCurveTo).toHaveBeenCalledTimes(236);
  });

  it("reuses static paints until the backing resolution changes", () => {
    const { canvas, context2d, controller, window } = loadEclipseIcon();

    controller.start();
    expect(context2d.createRadialGradient).toHaveBeenCalledTimes(6);
    expect(canvas).toMatchObject({ height: 28, width: 28 });

    controller.draw(1016);
    expect(context2d.createRadialGradient).toHaveBeenCalledTimes(10);

    window.devicePixelRatio = 2;
    controller.draw(1032);
    expect(context2d.createRadialGradient).toHaveBeenCalledTimes(16);
    expect(canvas).toMatchObject({ height: 56, width: 56 });
  });
});

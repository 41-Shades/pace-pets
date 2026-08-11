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

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function smooth(value) {
  return value * value * (3 - 2 * value);
}

function oldScalePoint(rect, profile, amount, point) {
  const { axis, perp, progressLength } = profile.geometry;
  const rootX = rect.x + 0.2 * rect.size;
  const rootY = rect.y + 0.84 * rect.size;
  const dx = point.x - rootX;
  const dy = point.y - rootY;
  const along = dx * axis.x + dy * axis.y;
  const across = dx * perp.x + dy * perp.y;
  const progress = clamp(along / (progressLength * rect.size));
  const active = clamp(
    (progress - profile.activeStart) / (1 - profile.activeStart),
  );
  const strength = active ** profile.exponent * amount;
  return {
    x:
      rootX +
      axis.x * along * (1 + profile.axisScale * strength) +
      perp.x * across * (1 + profile.perpScale * strength),
    y:
      rootY +
      axis.y * along * (1 + profile.axisScale * strength) +
      perp.y * across * (1 + profile.perpScale * strength),
  };
}

function oldAttachedPoint(rect, profile, amount, point) {
  const geometry = profile.geometry;
  const rootX = rect.x + 0.2 * rect.size;
  const rootY = rect.y + 0.84 * rect.size;
  const dx = point.x - rootX;
  const dy = point.y - rootY;
  const along = dx * geometry.sourceAxis.x + dy * geometry.sourceAxis.y;
  const across = dx * geometry.sourcePerp.x + dy * geometry.sourcePerp.y;
  const progress = clamp(along / (geometry.sourceLength * rect.size));
  const active = clamp(
    (progress - profile.activeStart) / (1 - profile.activeStart),
  );
  const strength = active ** profile.exponent * amount;
  const targetAlong = along * (geometry.targetLength / geometry.sourceLength);
  const targetAcross = across * (1 + geometry.coneWidthGrowth * progress);
  const targetX =
    rootX +
    geometry.targetAxis.x * targetAlong +
    geometry.targetPerp.x * targetAcross;
  const targetY =
    rootY +
    geometry.targetAxis.y * targetAlong +
    geometry.targetPerp.y * targetAcross;
  return {
    x: point.x + (targetX - point.x) * smooth(strength),
    y: point.y + (targetY - point.y) * smooth(strength),
  };
}

function oldImagePoint(profile, amount, imagePoint) {
  const layerSize = 17;
  const rect = {
    size: 1.06 / layerSize,
    x: 7.97 / layerSize,
    y: 7.97 / layerSize,
  };
  const point = {
    x: rect.x + imagePoint.x * rect.size,
    y: rect.y + imagePoint.y * rect.size,
  };
  const transformed = profile.geometry.mode
    ? oldAttachedPoint(rect, profile, amount, point)
    : oldScalePoint(rect, profile, amount, point);
  return {
    x: transformed.x * layerSize - 8,
    y: transformed.y * layerSize - 8,
  };
}

function createDrawContext() {
  return {
    beginPath: vi.fn(),
    bezierCurveTo: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
  };
}

function createSweatHarness() {
  let iconSize = 96;
  const draw = createDrawContext();
  const canvas = {
    getContext: () => draw,
    height: 0,
    parentElement: {
      getBoundingClientRect: () => ({
        height: iconSize,
        top: 0,
        width: iconSize,
      }),
    },
    style: {},
    width: 0,
  };
  const context = createContext({ devicePixelRatio: 2 });
  runScript(context, "dashboard-push-stretch-geometry.js");
  const geometry = context.PacePetsDashboardPushStretchGeometry;
  context.PacePetsDashboardPushStretch = {
    EXTREME_PROFILE: geometry.EXTREME_PROFILE,
    NORMAL_PROFILE: geometry.NORMAL_PROFILE,
    RARE_PROFILE: geometry.RARE_PROFILE,
    pulseAmount: geometry.pulseAmount,
  };
  runScript(context, "dashboard-push-sweat-variation.js");
  runScript(context, "dashboard-push-sweat-data.js");
  runScript(context, "dashboard-push-sweat-surface.js");
  runScript(context, "dashboard-push-sweat-renderer.js");
  const renderer = context.PacePetsDashboardPushSweat.createRenderer(canvas, {
    getBoundingClientRect: () => ({ bottom: 120, height: 100 }),
  });
  return {
    canvas,
    draw,
    geometry,
    renderer,
    resize: (size) => {
      iconSize = size;
      renderer.invalidateLayout();
    },
  };
}

function renderSweatStates(renderer, geometry) {
  const iconRenderer = {
    imageUnit: () => geometry.IMAGE_RECT.size,
    pointFor: (profile, amount, point) =>
      geometry.transformImagePoint(profile, amount, point),
  };
  const render = (level, cycleIndex, profile, previous = {}) =>
    renderer.render({
      cycleIndex,
      iconRenderer,
      phase: previous.phase ?? 0.52,
      previousCycleIndex: previous.cycleIndex ?? -1,
      previousProfile: previous.profile ?? null,
      previousPulseLevel: previous.level ?? null,
      profile,
      pulseLevel: level,
    });
  render("normal", 0, geometry.NORMAL_PROFILE);
  render("extreme", 1, geometry.EXTREME_PROFILE, {
    cycleIndex: 0,
    level: "normal",
    profile: geometry.NORMAL_PROFILE,
  });
  render("rare", 2, geometry.RARE_PROFILE, {
    cycleIndex: 1,
    level: "extreme",
    profile: geometry.EXTREME_PROFILE,
  });
  render("normal", 3, geometry.NORMAL_PROFILE, {
    cycleIndex: 2,
    level: "rare",
    phase: 0.1,
    profile: geometry.RARE_PROFILE,
  });
  return () => render("normal", 4, geometry.NORMAL_PROFILE);
}

describe("Push effect surface bounds", () => {
  it("preserves the original normal, extreme, and rare coordinates", () => {
    const context = createContext();
    runScript(context, "dashboard-push-stretch-geometry.js");
    const geometry = context.PacePetsDashboardPushStretchGeometry;
    const points = [
      { x: 0, y: 0 },
      { x: 0.69, y: 0.18 },
      { x: 1, y: 1 },
    ];

    for (const profile of [
      geometry.NORMAL_PROFILE,
      geometry.EXTREME_PROFILE,
      geometry.RARE_PROFILE,
    ]) {
      for (const amount of [0, 0.35, 1]) {
        for (const point of points) {
          const actual = geometry.transformImagePoint(profile, amount, point);
          const expected = oldImagePoint(profile, amount, point);
          expect(actual.x).toBeCloseTo(expected.x, 12);
          expect(actual.y).toBeCloseTo(expected.y, 12);
        }
      }
    }
  });

  it("contains every mesh phase and reduces both DPR2 backing stores", () => {
    const context = createContext();
    runScript(context, "dashboard-push-stretch-geometry.js");
    runScript(context, "dashboard-push-sweat-data.js");
    const geometry = context.PacePetsDashboardPushStretchGeometry;
    const bounds = geometry.SURFACE_BOUNDS;
    for (const profile of [
      geometry.NORMAL_PROFILE,
      geometry.EXTREME_PROFILE,
      geometry.RARE_PROFILE,
    ]) {
      for (let step = 0; step <= 20; step += 1) {
        for (let row = 0; row <= 28; row += 1) {
          for (let column = 0; column <= 28; column += 1) {
            const point = geometry.transformImagePoint(profile, step / 20, {
              x: column / 28,
              y: row / 28,
            });
            expect(point.x).toBeGreaterThan(bounds.left);
            expect(point.x).toBeLessThan(bounds.right);
            expect(point.y).toBeGreaterThan(bounds.top);
            expect(point.y).toBeLessThan(bounds.bottom);
          }
        }
      }
    }
    const stretchPixels =
      Math.ceil((bounds.right - bounds.left) * 96 * 2) *
      Math.ceil((bounds.bottom - bounds.top) * 96 * 2);
    const sweat = context.PacePetsDashboardPushSweatData.SURFACE_BOUNDS;
    const sweatPixels =
      Math.ceil((sweat.right - sweat.left) * 96 * 2) *
      Math.ceil((1.5 + sweat.bottomPadding - sweat.top) * 96 * 2);
    expect(stretchPixels + sweatPixels).toBeLessThan(3264 * 3264 * 0.4);
  });
});

describe("Push sweat dirty regions", () => {
  it("covers normal, extreme, rare, carry-over, and resize frames", () => {
    const harness = createSweatHarness();
    const renderAfterResize = renderSweatStates(
      harness.renderer,
      harness.geometry,
    );

    expect(harness.draw.translate.mock.calls.length).toBeGreaterThan(75);
    for (const [x, y] of harness.draw.translate.mock.calls) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(harness.canvas.width);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(harness.canvas.height);
    }
    expect(harness.draw.clearRect).toHaveBeenCalledTimes(3);
    for (const [, , width, height] of harness.draw.clearRect.mock.calls) {
      expect(
        width < harness.canvas.width || height < harness.canvas.height,
      ).toBe(true);
    }

    const clearCount = harness.draw.clearRect.mock.calls.length;
    harness.resize(120);
    renderAfterResize();
    expect(harness.draw.clearRect).toHaveBeenCalledTimes(clearCount);
  });
});

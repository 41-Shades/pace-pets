import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function importExtensionScript(source) {
  await import(pathToFileURL(path.join(projectRoot, source)));
}

function fakeContext() {
  return {
    fillRect: vi.fn(),
    setTransform: vi.fn(),
  };
}

function fakeCanvas(context) {
  return {
    className: "",
    height: 0,
    parent: null,
    style: {},
    width: 0,

    getContext: vi.fn((type) => (type === "2d" ? context : null)),
    remove() {
      if (!this.parent) {
        return;
      }

      this.parent.children = this.parent.children.filter(
        (child) => child !== this,
      );
      this.parent = null;
    },
    setAttribute: vi.fn(),
  };
}

function fakeBody() {
  return {
    children: [],

    append(...nodes) {
      for (const node of nodes) {
        node.parent = this;
        this.children.push(node);
      }
    },
  };
}

beforeAll(async () => {
  globalThis.PacePetsDashboardBigBangSceneDraw = {
    drawFrame: vi.fn(),
    unit: (value) => Math.min(Math.max(value, 0), 1),
  };
  globalThis.PacePetsDashboardBigBangSceneFactory = {
    createSceneState: vi.fn((width, height) => ({ height, width })),
  };
  globalThis.PacePetsDashboardBigBangWebglRenderer = {
    create: vi.fn(),
  };

  await importExtensionScript(
    "collector/extension/dashboard-big-bang-scene.js",
  );
});

beforeEach(() => {
  const context = fakeContext();
  const body = fakeBody();
  globalThis.document = {
    body,
    createElement: vi.fn(() => fakeCanvas(context)),
  };
  globalThis.innerHeight = 600;
  globalThis.innerWidth = 800;
  globalThis.devicePixelRatio = 2;
  globalThis.requestAnimationFrame = vi.fn(() => 1);
  globalThis.cancelAnimationFrame = vi.fn();
  globalThis.setTimeout = vi.fn(() => 1);
  globalThis.clearTimeout = vi.fn();
});

describe("PacePetsDashboardBigBangScene", () => {
  it("aborts instead of running a partial transition when WebGL cannot mount", async () => {
    const renderer = {
      destroy: vi.fn(),
      mount: vi.fn(() => false),
      render: vi.fn(),
    };
    globalThis.PacePetsDashboardBigBangWebglRenderer.create.mockReturnValue(
      renderer,
    );
    const onSettled = vi.fn();
    const onSpaceBackgroundRevealStart = vi.fn();

    const scene = globalThis.PacePetsDashboardBigBangScene.create({
      onSettled,
      onSpaceBackgroundRevealStart,
    });

    await expect(scene.play()).resolves.toBe(false);

    expect(renderer.mount).toHaveBeenCalledOnce();
    expect(renderer.destroy).toHaveBeenCalledOnce();
    expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled();
    expect(globalThis.document.body.children).toEqual([]);
    expect(onSettled).not.toHaveBeenCalled();
    expect(onSpaceBackgroundRevealStart).not.toHaveBeenCalled();
  });
});

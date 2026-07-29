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

function fakeGl() {
  const gl = {
    ARRAY_BUFFER: 1,
    BLEND: 2,
    COMPILE_STATUS: 3,
    CULL_FACE: 4,
    DEPTH_TEST: 5,
    FLOAT: 6,
    FRAGMENT_SHADER: 7,
    LINK_STATUS: 8,
    SCISSOR_TEST: 9,
    STATIC_DRAW: 10,
    TRIANGLE_STRIP: 11,
    VERTEX_SHADER: 12,
    attachShader: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    clear: vi.fn(),
    colorMask: vi.fn(),
    compileShader: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    createProgram: vi.fn(() => ({})),
    createShader: vi.fn(() => ({})),
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    disable: vi.fn(),
    drawArrays: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    getProgramInfoLog: vi.fn(() => ""),
    getProgramParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ""),
    getShaderParameter: vi.fn(() => true),
    getUniformLocation: vi.fn((program, name) => ({ name })),
    linkProgram: vi.fn(),
    shaderSource: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    useProgram: vi.fn(),
    vertexAttribPointer: vi.fn(),
    viewport: vi.fn(),
  };
  return gl;
}

describe("Singularity black-hole V2 rendering", () => {
  it("configures invariant GL and raster state outside the frame loop", () => {
    const gl = fakeGl();
    const canvas = {
      addEventListener: vi.fn(),
      getContext: vi.fn(() => gl),
      height: 150,
      remove: vi.fn(),
      removeEventListener: vi.fn(),
      setAttribute: vi.fn(),
      width: 300,
    };
    const body = { append: vi.fn() };
    const document = {
      addEventListener: vi.fn(),
      body,
      createElement: vi.fn(() => canvas),
      documentElement: { clientHeight: 600, clientWidth: 800 },
      hidden: false,
      querySelector: vi.fn(() => null),
      removeEventListener: vi.fn(),
    };
    const shaders = loadScript(
      "dashboard-singularity-black-hole-v2-shaders.js",
    ).PacePetsDashboardSingularityBlackHoleV2Shaders;
    const context = loadScript("dashboard-singularity-black-hole-v2-scene.js", {
      PacePetsDashboardSingularityBlackHoleV2Shaders: shaders,
      addEventListener: vi.fn(),
      cancelAnimationFrame: vi.fn(),
      devicePixelRatio: 2,
      document,
      innerHeight: 600,
      innerWidth: 800,
      performance: { now: () => 0 },
      removeEventListener: vi.fn(),
      requestAnimationFrame: vi.fn(() => 1),
    });
    const scene = context.PacePetsDashboardSingularityBlackHoleV2Scene.create();

    scene.play();

    expect(gl.useProgram).toHaveBeenCalledOnce();
    expect(gl.bindBuffer).toHaveBeenCalledTimes(2);
    expect(gl.enableVertexAttribArray).toHaveBeenCalledOnce();
    expect(gl.vertexAttribPointer).toHaveBeenCalledOnce();
    expect(gl.disable.mock.calls.map(([capability]) => capability)).toEqual([
      gl.DEPTH_TEST,
      gl.CULL_FACE,
      gl.BLEND,
      gl.SCISSOR_TEST,
    ]);
    expect(gl.colorMask).toHaveBeenCalledWith(true, true, true, true);
    expect(gl.uniform2f).toHaveBeenCalledOnce();
    expect(gl.viewport).toHaveBeenCalledWith(0, 0, 1600, 1200);

    scene.renderFrame(16);

    expect(gl.useProgram).toHaveBeenCalledOnce();
    expect(gl.bindBuffer).toHaveBeenCalledTimes(2);
    expect(gl.enableVertexAttribArray).toHaveBeenCalledOnce();
    expect(gl.vertexAttribPointer).toHaveBeenCalledOnce();
    expect(gl.uniform2f).toHaveBeenCalledOnce();
    expect(gl.clear).not.toHaveBeenCalled();
    expect(gl.drawArrays).toHaveBeenCalledOnce();

    context.innerWidth = 900;
    scene.handleResize();

    expect(gl.uniform2f).toHaveBeenCalledTimes(2);
    expect(gl.viewport).toHaveBeenLastCalledWith(0, 0, 1800, 1200);
  });

  it("gates shader phases only while their contribution is exactly zero", () => {
    const { FRAGMENT_SHADER_SOURCE } = loadScript(
      "dashboard-singularity-black-hole-v2-shaders.js",
    ).PacePetsDashboardSingularityBlackHoleV2Shaders;

    expect(FRAGMENT_SHADER_SOURCE).toContain("progress <= 0.46");
    expect(FRAGMENT_SHADER_SOURCE).toContain("progress > 0.42");
    expect(FRAGMENT_SHADER_SOURCE).toContain("rawProgress > 1.82");
    expect(FRAGMENT_SHADER_SOURCE).toContain("rawProgress > 2.55");
    expect(FRAGMENT_SHADER_SOURCE).toContain("rawProgress > 3.38");
    expect(FRAGMENT_SHADER_SOURCE).toContain(
      "smoothstep(0.42, 0.82, progress)",
    );
    expect(FRAGMENT_SHADER_SOURCE).toContain(
      "smoothstep(2.55, 3.18, rawProgress)",
    );
    expect(FRAGMENT_SHADER_SOURCE).toContain(
      "smoothstep(3.38, 3.92, rawProgress)",
    );
  });
});

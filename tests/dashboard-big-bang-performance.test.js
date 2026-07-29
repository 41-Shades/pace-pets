import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../collector/extension",
);

function extensionSource(fileName) {
  return fs.readFileSync(path.join(extensionRoot, fileName), "utf8");
}

describe("Big Bang WebGL rendering", () => {
  it("does not clear immediately before its full-screen fragment overwrite", () => {
    const source = extensionSource("dashboard-big-bang-webgl-renderer.js");
    const renderBody = source.slice(
      source.indexOf("    render(elapsedMs, opacity)"),
      source.indexOf("    handleContextLost(event)"),
    );

    expect(renderBody).toContain("gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)");
    expect(renderBody).not.toContain("gl.clear(");
    expect(source).toContain("preserveDrawingBuffer: false");
  });

  it("gates expensive shader families only at exact zero boundaries", () => {
    const source = extensionSource("dashboard-big-bang-webgl-shaders.js");

    expect(source).toContain("if (localSeconds > 0.04 && localSeconds < 2.72)");
    expect(source).toContain("if (localSeconds > 1.86 && localSeconds < 4.55)");
    expect(source).toContain("if (localSeconds > 1.85 && localSeconds < 9.05)");
    expect(source).toContain("if (localSeconds > 5.0 && localSeconds < 10.35)");
    expect(source).toContain("if (localSeconds >= 10.35)");
  });
});

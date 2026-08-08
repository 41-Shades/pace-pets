import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../collector/extension",
);

function loadShaders() {
  const context = vm.createContext({});
  const source = fs.readFileSync(
    path.join(extensionRoot, "dashboard-sync-sunburst-shaders.js"),
    "utf8",
  );
  new vm.Script(source).runInContext(context);
  return context.PacePetsDashboardSyncSunburstShaders;
}

describe("Perfect Sync sunburst shader geometry", () => {
  it("pads sharp ray quads for the mandatory edge feather", () => {
    const shaders = loadShaders();

    expect(shaders.VERTEX_SHADER_SOURCE).toContain(
      "float edgeFeather = max(a_timing.z, 0.75);",
    );
    expect(shaders.VERTEX_SHADER_SOURCE).toContain(
      "float blurOutset = edgeFeather * 3.0;",
    );
    expect(shaders.FRAGMENT_SHADER_SOURCE).toContain(
      "float feather = max(v_blur, 0.75);",
    );
  });
});

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function dashboardSource(source) {
  return `./${source}`;
}

function expectUniqueSources(sources) {
  expect(new Set(sources).size).toBe(sources.length);
}

beforeAll(async () => {
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/runtime-manifest.js"),
    )
  );
});

describe("CodexExtensionRuntime", () => {
  it("derives target runtime scripts from one shared common prefix", () => {
    const runtime = globalThis.CodexExtensionRuntime;

    expect(runtime.COMMON_SCRIPT_SOURCES).toContain("usage-providers.js");
    expect(
      runtime.COMMON_SCRIPT_SOURCES.indexOf("pace-state-data.js"),
    ).toBeLessThan(
      runtime.COMMON_SCRIPT_SOURCES.indexOf("developer-options.js"),
    );
    expect(runtime.BACKGROUND_SCRIPT_SOURCES).toEqual([
      ...runtime.COMMON_SCRIPT_SOURCES,
      ...runtime.BACKGROUND_ONLY_SCRIPT_SOURCES,
    ]);
    expect(runtime.DASHBOARD_SCRIPT_SOURCES).toEqual([
      ...runtime.COMMON_SCRIPT_SOURCES.map(dashboardSource),
      ...runtime.DASHBOARD_ONLY_SCRIPT_SOURCES,
    ]);
  });

  it("keeps target-only and optional dashboard scripts explicit", () => {
    const runtime = globalThis.CodexExtensionRuntime;

    expect(runtime.BACKGROUND_ONLY_SCRIPT_SOURCES).toEqual([
      "background-logic.js",
      "background-usage-source.js",
      "background-context-menu.js",
    ]);
    expect(runtime.DASHBOARD_ONLY_SCRIPT_SOURCES).toContain("./dashboard.js");
    expect(runtime.DASHBOARD_ONLY_SCRIPT_SOURCES).toContain(
      "./vendor/chart.umd.min.js",
    );
    expect(runtime.OPTIONAL_DASHBOARD_SCRIPT_SOURCES).toEqual([
      "./vendor/chart.umd.min.js",
    ]);

    for (const sourceList of [
      runtime.COMMON_SCRIPT_SOURCES,
      runtime.BACKGROUND_ONLY_SCRIPT_SOURCES,
      runtime.BACKGROUND_SCRIPT_SOURCES,
      runtime.DASHBOARD_ONLY_SCRIPT_SOURCES,
      runtime.DASHBOARD_SCRIPT_SOURCES,
      runtime.OPTIONAL_DASHBOARD_SCRIPT_SOURCES,
    ]) {
      expect(Object.isFrozen(sourceList)).toBe(true);
      expectUniqueSources(sourceList);
    }
  });
});

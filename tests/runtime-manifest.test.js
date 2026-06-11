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

function extensionPageSource(source) {
  return `./${source}`;
}

function expectUniqueSources(sources) {
  expect(new Set(sources).size).toBe(sources.length);
}

function expectFrozenEdges(edges) {
  expect(Object.isFrozen(edges)).toBe(true);
  for (const edge of edges) {
    expect(Object.isFrozen(edge)).toBe(true);
    expect(edge).toHaveLength(2);
  }
}

function expectUniqueEdges(edges) {
  expect(new Set(edges.map((edge) => edge.join(" -> "))).size).toBe(
    edges.length,
  );
}

beforeAll(async () => {
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/runtime-manifest.js"),
    )
  );
});

describe("CodexExtensionRuntime script sources", () => {
  it("derives target runtime scripts from one shared common prefix", () => {
    const runtime = globalThis.CodexExtensionRuntime;

    expect(runtime.COMMON_SCRIPT_SOURCES).toContain("usage-providers.js");
    expect(runtime.COMMON_SCRIPT_SOURCES).toContain("persisted-text.js");
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
    expect(runtime.DEV_FLAGS_SCRIPT_SOURCES).toEqual([
      ...runtime.COMMON_SCRIPT_SOURCES.map(extensionPageSource),
      ...runtime.DEV_FLAGS_ONLY_SCRIPT_SOURCES,
    ]);
    expect(runtime.DASHBOARD_SCRIPT_SOURCES).toContain(
      "./dashboard-dom-contract.js",
    );
    expect(runtime.DASHBOARD_SCRIPT_SOURCES).toContain(
      "./dashboard-preferences.js",
    );
    expect(runtime.DEV_FLAGS_SCRIPT_SOURCES).toContain("./dev-flags.js");
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
    expect(runtime.DEV_FLAGS_ONLY_SCRIPT_SOURCES).toEqual([
      "./dev-flags-current-mode.js",
      "./dev-flags.js",
    ]);
    expect(runtime.OPTIONAL_DASHBOARD_SCRIPT_SOURCES).toEqual([
      "./vendor/chart.umd.min.js",
    ]);

    for (const sourceList of [
      runtime.COMMON_SCRIPT_SOURCES,
      runtime.BACKGROUND_ONLY_SCRIPT_SOURCES,
      runtime.BACKGROUND_SCRIPT_SOURCES,
      runtime.DASHBOARD_ONLY_SCRIPT_SOURCES,
      runtime.DASHBOARD_SCRIPT_SOURCES,
      runtime.DEV_FLAGS_ONLY_SCRIPT_SOURCES,
      runtime.DEV_FLAGS_SCRIPT_SOURCES,
      runtime.OPTIONAL_DASHBOARD_SCRIPT_SOURCES,
    ]) {
      expect(Object.isFrozen(sourceList)).toBe(true);
      expectUniqueSources(sourceList);
    }
  });
});

describe("CodexExtensionRuntime dependency edges", () => {
  it("derives target runtime dependency edges from shared contracts", () => {
    const runtime = globalThis.CodexExtensionRuntime;

    expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "usage-providers.js",
      "usage.js",
    ]);
    expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "refresh-status.js",
      "refresh-control.js",
    ]);
    expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "persisted-text.js",
      "refresh-status.js",
    ]);
    expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "persisted-text.js",
      "history-store.js",
    ]);
    expect(runtime.BACKGROUND_RUNTIME_DEPENDENCY_EDGES).toEqual([
      ...runtime.COMMON_RUNTIME_DEPENDENCY_EDGES,
      ...runtime.BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES,
    ]);
    expect(runtime.DASHBOARD_RUNTIME_DEPENDENCY_EDGES).toEqual([
      ...runtime.COMMON_RUNTIME_DEPENDENCY_EDGES.map(([before, after]) => [
        dashboardSource(before),
        dashboardSource(after),
      ]),
      ...runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES,
    ]);
    expect(runtime.DEV_FLAGS_RUNTIME_DEPENDENCY_EDGES).toEqual([
      ...runtime.COMMON_RUNTIME_DEPENDENCY_EDGES.map(([before, after]) => [
        extensionPageSource(before),
        extensionPageSource(after),
      ]),
      ...runtime.DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES,
    ]);

    expect(runtime.BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "usage-providers.js",
      "background-usage-source.js",
    ]);
    expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "./dashboard-status-logic.js",
      "./dashboard-status-controller.js",
    ]);
    expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "./dashboard-dom-contract.js",
      "./dashboard.js",
    ]);
    expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "./dashboard-preferences.js",
      "./dashboard-shell-controls.js",
    ]);
    expect(runtime.DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "./developer-options.js",
      "./dev-flags.js",
    ]);
    expect(runtime.DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "./dev-flags-current-mode.js",
      "./dev-flags.js",
    ]);

    for (const edgeList of [
      runtime.COMMON_RUNTIME_DEPENDENCY_EDGES,
      runtime.BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES,
      runtime.BACKGROUND_RUNTIME_DEPENDENCY_EDGES,
      runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES,
      runtime.DASHBOARD_RUNTIME_DEPENDENCY_EDGES,
      runtime.DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES,
      runtime.DEV_FLAGS_RUNTIME_DEPENDENCY_EDGES,
    ]) {
      expectFrozenEdges(edgeList);
      expectUniqueEdges(edgeList);
    }
  });
});

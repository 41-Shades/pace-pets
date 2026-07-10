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

function expectCommonScriptSourceContent(runtime) {
  expect(runtime.COMMON_SCRIPT_SOURCES).toContain("usage-providers.js");
  expect(runtime.COMMON_SCRIPT_SOURCES).toContain("dashboard-preferences.js");
  expect(runtime.COMMON_SCRIPT_SOURCES).toContain("persisted-text.js");
  expect(runtime.COMMON_SCRIPT_SOURCES).toContain("audio-preferences.js");
  expect(runtime.COMMON_SCRIPT_SOURCES).toContain("refresh-schedule.js");
  expect(runtime.COMMON_SCRIPT_SOURCES).toContain(
    "dev-preview-action-registry.js",
  );
  expect(
    runtime.COMMON_SCRIPT_SOURCES.indexOf("usage-windows.js"),
  ).toBeLessThan(
    runtime.COMMON_SCRIPT_SOURCES.indexOf("dashboard-preferences.js"),
  );
  expect(
    runtime.COMMON_SCRIPT_SOURCES.indexOf("refresh-schedule.js"),
  ).toBeLessThan(runtime.COMMON_SCRIPT_SOURCES.indexOf("refresh-control.js"));
  expect(
    runtime.COMMON_SCRIPT_SOURCES.indexOf("storage-adapter.js"),
  ).toBeLessThan(runtime.COMMON_SCRIPT_SOURCES.indexOf("audio-preferences.js"));
  expect(
    runtime.COMMON_SCRIPT_SOURCES.indexOf("pace-state-data.js"),
  ).toBeLessThan(runtime.COMMON_SCRIPT_SOURCES.indexOf("developer-options.js"));
  expect(
    runtime.COMMON_SCRIPT_SOURCES.indexOf("pace-state-special-data.js"),
  ).toBeLessThan(runtime.COMMON_SCRIPT_SOURCES.indexOf("pace-state-data.js"));
  expect(
    runtime.COMMON_SCRIPT_SOURCES.indexOf("brake-intensity.js"),
  ).toBeLessThan(runtime.COMMON_SCRIPT_SOURCES.indexOf("developer-options.js"));
}

function expectTargetScriptSourceComposition(runtime) {
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
}

function expectDashboardScriptSourceContent(runtime) {
  for (const source of [
    "./dashboard-dom-contract.js",
    "./audio-clips.js",
    "./dashboard-audio-manager.js",
    "./dashboard-audio-control.js",
    "./dashboard-big-bang-audio-timeline.js",
    "./dashboard-transition-audio.js",
    "./dashboard-dev-preview-broker.js",
    "./dashboard-preferences.js",
    "./dashboard-state-loader.js",
    "./dashboard-state-methods.js",
    "./dashboard-singularity-black-hole-v2-shaders.js",
    "./dashboard-big-bang-scene.js",
  ]) {
    expect(runtime.DASHBOARD_SCRIPT_SOURCES).toContain(source);
  }
  expect(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf("./dashboard-state-loader.js"),
  ).toBeLessThan(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf("./dashboard-app-core.js"),
  );
  expect(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf("./dashboard-app-core.js"),
  ).toBeLessThan(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf("./dashboard-state-methods.js"),
  );
  expect(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf("./audio-clips.js"),
  ).toBeLessThan(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf("./dashboard-audio-manager.js"),
  );
  expect(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf("./dashboard-audio-manager.js"),
  ).toBeLessThan(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf("./dashboard-audio-control.js"),
  );
  expect(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf("./dashboard-audio-control.js"),
  ).toBeLessThan(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf(
      "./dashboard-big-bang-audio-timeline.js",
    ),
  );
  expect(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf(
      "./dashboard-big-bang-audio-timeline.js",
    ),
  ).toBeLessThan(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf("./dashboard-transition-audio.js"),
  );
  expect(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf(
      "./dashboard-big-bang-ejecta-draw.js",
    ),
  ).toBeLessThan(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf(
      "./dashboard-big-bang-scene-draw.js",
    ),
  );
  expect(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf(
      "./dashboard-big-bang-particle-draw.js",
    ),
  ).toBeLessThan(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf(
      "./dashboard-big-bang-scene-draw.js",
    ),
  );
  expect(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf(
      "./dashboard-big-bang-plume-draw.js",
    ),
  ).toBeLessThan(
    runtime.DASHBOARD_SCRIPT_SOURCES.indexOf(
      "./dashboard-big-bang-scene-draw.js",
    ),
  );
  for (const source of [
    "./dashboard-singularity-black-hole-v2-scene.js",
    "./dashboard-singularity-chrome-collapse-fragments.js",
    "./dashboard-singularity-chrome-collapse-motion.js",
    "./dashboard-singularity-chrome-collapse-scene.js",
  ]) {
    expect(runtime.DASHBOARD_SCRIPT_SOURCES).toContain(source);
  }
}

function expectDevFlagsScriptSourceContent(runtime) {
  expect(runtime.DEV_FLAGS_SCRIPT_SOURCES).toContain("./dev-flags.js");
  expect(runtime.DEV_FLAGS_SCRIPT_SOURCES).toContain(
    "./dev-flags-dom-contract.js",
  );
  expect(runtime.DEV_FLAGS_SCRIPT_SOURCES).toContain(
    "./dashboard-preferences.js",
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

    expectCommonScriptSourceContent(runtime);
    expectTargetScriptSourceComposition(runtime);
    expectDashboardScriptSourceContent(runtime);
    expectDevFlagsScriptSourceContent(runtime);
  });
});

describe("CodexExtensionRuntime target-only script sources", () => {
  it("keeps target-only and optional dashboard scripts explicit", () => {
    const runtime = globalThis.CodexExtensionRuntime;

    expect(runtime.BACKGROUND_ONLY_SCRIPT_SOURCES).toEqual([
      "background-dev-preview-broker.js",
      "background-logic.js",
      "background-transition-refresh.js",
      "background-badge-presentation.js",
      "background-usage-source.js",
      "background-refresh-runner.js",
      "background-context-menu.js",
    ]);
    expect(runtime.DASHBOARD_ONLY_SCRIPT_SOURCES).toContain("./dashboard.js");
    expect(runtime.DASHBOARD_ONLY_SCRIPT_SOURCES).toContain(
      "./vendor/chart.umd.min.js",
    );
    expect(runtime.DEV_FLAGS_ONLY_SCRIPT_SOURCES).toEqual([
      "./dev-flags-rendering.js",
      "./dev-flags-pace-scale-previews.js",
      "./dev-flags-dom-contract.js",
      "./dev-flags-current-mode.js",
      "./dev-flags-theme-mode.js",
      "./dev-flags-preview-actions.js",
      "./dev-flags-feature-previews.js",
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

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { createRuntimeDependencyContract } from "../scripts/runtime-dependency-contract.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
let runtimeContract;

function dashboardSource(source) {
  return `./${source}`;
}

function extensionPageSource(source) {
  return `./${source}`;
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

function expectCommonRuntimeDependencyEdges(runtime) {
  expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "usage-providers.js",
    "usage.js",
  ]);
  expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "usage-windows.js",
    "dashboard-preferences.js",
  ]);
  expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "refresh-status.js",
    "refresh-control.js",
  ]);
  expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "storage-adapter.js",
    "audio-preferences.js",
  ]);
  expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "persisted-text.js",
    "refresh-status.js",
  ]);
  expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "persisted-text.js",
    "history-store.js",
  ]);
  expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "dev-preview-action-registry.js",
    "brake-extreme-preview-control.js",
  ]);
  expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "pace-state-special-data.js",
    "pace-state-data.js",
  ]);
  expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "brake-intensity.js",
    "developer-options.js",
  ]);
  expect(runtime.COMMON_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "brake-intensity.js",
    "preview-control.js",
  ]);
}

function expectTargetRuntimeDependencyEdges(runtime) {
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
}

function expectBackgroundRuntimeDependencyEdges(runtime) {
  expect(runtime.BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "dev-preview-action-registry.js",
    "background-dev-preview-broker.js",
  ]);
  expect(runtime.BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "usage-providers.js",
    "background-usage-source.js",
  ]);
  expect(runtime.BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "refresh-schedule.js",
    "background-transition-refresh.js",
  ]);
  expect(runtime.BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "pace-logic.js",
    "background-transition-refresh.js",
  ]);
}

function expectDashboardAudioRuntimeDependencyEdges(runtime) {
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./audio-preferences.js",
    "./dashboard.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./audio-clips.js",
    "./dashboard-audio-manager.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./audio-preferences.js",
    "./dashboard-audio-manager.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-audio-manager.js",
    "./dashboard-audio-control.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-audio-control.js",
    "./dashboard-app-core.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-big-bang-audio-timeline.js",
    "./dashboard-transition-audio.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-transition-audio.js",
    "./dashboard-app-core.js",
  ]);
}

function expectDashboardInfrastructureRuntimeDependencyEdges(runtime) {
  expectDashboardAudioRuntimeDependencyEdges(runtime);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dev-preview-action-registry.js",
    "./dashboard-dev-preview-broker.js",
  ]);
  for (const target of [
    "./dashboard-push-stretch-renderer.js",
    "./dashboard-push-sweat-renderer.js",
    "./dashboard-push-water-renderer.js",
  ]) {
    expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "./dashboard-push-canvas-layout.js",
      target,
    ]);
  }
  for (const target of [
    "./dashboard-pace-wobble-methods.js",
    "./dashboard-push-stretch-methods.js",
    "./dashboard-checkerboard-reveal-methods.js",
    "./dashboard-singularity-transition-methods.js",
    "./dashboard-pace-preview-methods.js",
    "./dashboard-pace-controller.js",
  ]) {
    expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
      "./dashboard-dev-preview-broker.js",
      target,
    ]);
  }
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-status-logic.js",
    "./dashboard-status-controller.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./refresh-schedule.js",
    "./dashboard-status-logic.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-dom-contract.js",
    "./dashboard.js",
  ]);
}

function expectDashboardTransitionRuntimeDependencyEdges(runtime) {
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-big-bang-scene-factory.js",
    "./dashboard-big-bang-scene.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-big-bang-ejecta-draw.js",
    "./dashboard-big-bang-scene-draw.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-big-bang-particle-draw.js",
    "./dashboard-big-bang-scene-draw.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-big-bang-plume-draw.js",
    "./dashboard-big-bang-scene-draw.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-big-bang-scene-draw.js",
    "./dashboard-big-bang-scene.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-big-bang-scene.js",
    "./dashboard-big-bang-transition-renderer.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-big-bang-transition-renderer.js",
    "./dashboard-singularity-transition-methods.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-singularity-black-hole-v2-shaders.js",
    "./dashboard-singularity-black-hole-v2-scene.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-singularity-black-hole-v2-scene.js",
    "./dashboard-singularity-transition-renderer.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-singularity-chrome-collapse-fragments.js",
    "./dashboard-singularity-chrome-collapse-motion.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-singularity-chrome-collapse-fragments.js",
    "./dashboard-singularity-chrome-collapse-scene.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-singularity-chrome-collapse-motion.js",
    "./dashboard-singularity-chrome-collapse-scene.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-singularity-chrome-collapse-scene.js",
    "./dashboard-singularity-transition-renderer.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-singularity-transition-renderer.js",
    "./dashboard-singularity-transition-methods.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dev-preview-action-registry.js",
    "./dashboard-singularity-transition-methods.js",
  ]);
}

function expectDashboardPresentationRuntimeDependencyEdges(runtime) {
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-preferences.js",
    "./dashboard-shell-controls.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-splat-entry-playback.js",
    "./dashboard-splat-fall-methods.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./themes/default/asset-manifest.js",
    "./dashboard-cart-spill-data.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./themes/default/asset-manifest.js",
    "./dashboard-push-tank-renderer.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./brake-intensity.js",
    "./dashboard-pace-wobble-methods.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-state-loader.js",
    "./dashboard-app-core.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-app-core.js",
    "./dashboard-state-methods.js",
  ]);
  expect(runtime.DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-state-methods.js",
    "./dashboard.js",
  ]);
}

function expectDashboardRuntimeDependencyEdges(runtime) {
  expectDashboardInfrastructureRuntimeDependencyEdges(runtime);
  expectDashboardTransitionRuntimeDependencyEdges(runtime);
  expectDashboardPresentationRuntimeDependencyEdges(runtime);
}

function expectDevFlagsRuntimeDependencyEdges(runtime) {
  expect(runtime.DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dev-flags-dom-contract.js",
    "./dev-flags.js",
  ]);
  expect(runtime.DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./developer-options.js",
    "./dev-flags.js",
  ]);
  expect(runtime.DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dev-flags-current-mode.js",
    "./dev-flags.js",
  ]);
  expect(runtime.DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dashboard-preferences.js",
    "./dev-flags-theme-mode.js",
  ]);
  expect(runtime.DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dev-flags-theme-mode.js",
    "./dev-flags.js",
  ]);
  expect(runtime.DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dev-preview-action-registry.js",
    "./dev-flags-preview-actions.js",
  ]);
  expect(runtime.DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES).toContainEqual([
    "./dev-flags-pace-scale-previews.js",
    "./dev-flags.js",
  ]);
}

function expectFrozenRuntimeDependencyEdgeLists(runtime) {
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
}

beforeAll(async () => {
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/runtime-manifest.js"),
    )
  );
  runtimeContract = Object.freeze({
    ...globalThis.CodexExtensionRuntime,
    ...createRuntimeDependencyContract(globalThis.CodexExtensionRuntime),
  });
});

describe("CodexExtensionRuntime dependency edges", () => {
  it("derives target runtime dependency edges from shared contracts", () => {
    const runtime = runtimeContract;

    expectCommonRuntimeDependencyEdges(runtime);
    expectTargetRuntimeDependencyEdges(runtime);
    expectBackgroundRuntimeDependencyEdges(runtime);
    expectDashboardRuntimeDependencyEdges(runtime);
    expectDevFlagsRuntimeDependencyEdges(runtime);
    expectFrozenRuntimeDependencyEdgeLists(runtime);
    expect(globalThis.CodexExtensionRuntime).not.toHaveProperty(
      "DASHBOARD_RUNTIME_DEPENDENCY_EDGES",
    );
  });
});

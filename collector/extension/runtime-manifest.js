(function attachCodexExtensionRuntime(root) {
  "use strict";

  const COMMON_SCRIPT_SOURCES = Object.freeze([
    "product-metadata.js",
    "integration-config.js",
    "usage-windows.js",
    "usage-values.js",
    "persisted-text.js",
    "refresh-status.js",
    "refresh-control.js",
    "sync-monk-escape-preview-control.js",
    "singularity-transition-preview-control.js",
    "storage-adapter.js",
    "usage-integration-adapters.js",
    "usage-providers.js",
    "usage.js",
    "history-store.js",
    "themes/default/asset-manifest.js",
    "pace-state-art.js",
    "pace-state-data.js",
    "sprint-intensity.js",
    "developer-options.js",
    "pace-logic.js",
    "preview-control.js",
  ]);

  const BACKGROUND_ONLY_SCRIPT_SOURCES = Object.freeze([
    "background-logic.js",
    "background-usage-source.js",
    "background-context-menu.js",
  ]);

  const DASHBOARD_ONLY_SCRIPT_SOURCES = Object.freeze([
    "./vendor/chart.umd.min.js",
    "./perfect-zero-space-data.js",
    "./perfect-zero-space-factory.js",
    "./bouncing-box-motion.js",
    "./perfect-zero-space-motion.js",
    "./perfect-zero-space-draw.js",
    "./perfect-zero-space-scene.js",
    "./dashboard-tooltips.js",
    "./dashboard-early-reset.js",
    "./dashboard-chart-data.js",
    "./dashboard-chart.js",
    "./dashboard-time.js",
    "./dashboard-preferences.js",
    "./dashboard-shell-controls.js",
    "./dashboard-status-logic.js",
    "./dashboard-status-controller.js",
    "./dashboard-pace-data.js",
    "./dashboard-pace-core.js",
    "./dashboard-eclipse-icon.js",
    "./dashboard-perfect-zero-page-background-methods.js",
    "./dashboard-brake-debris-data.js",
    "./dashboard-brake-debris-methods.js",
    "./dashboard-brake-extreme-canvas-methods.js",
    "./dashboard-push-stretch-renderer.js",
    "./dashboard-push-sweat-variation.js",
    "./dashboard-push-sweat-renderer.js",
    "./dashboard-push-water-renderer.js",
    "./dashboard-push-stretch-methods.js",
    "./dashboard-sync-sunburst-rays.js",
    "./dashboard-sync-sunburst-draw.js",
    "./dashboard-sync-sunburst-turnover.js",
    "./dashboard-sync-sunburst-renderer.js",
    "./dashboard-sync-monk-escape-scene.js",
    "./dashboard-sync-monk-escape-methods.js",
    "./dashboard-sync-sunburst-methods.js",
    "./dashboard-singularity-transition-data.js",
    "./dashboard-singularity-transition-motion.js",
    "./dashboard-singularity-transition-draw.js",
    "./dashboard-singularity-transition-renderer.js",
    "./dashboard-singularity-v2-black-hole-draw.js",
    "./dashboard-singularity-v2-black-hole-scene.js",
    "./dashboard-singularity-transition-v2-renderer.js",
    "./dashboard-singularity-transition-versions.js",
    "./dashboard-singularity-transition-methods.js",
    "./dashboard-pace-wobble-methods.js",
    "./dashboard-ease-up-methods.js",
    "./dashboard-pace-icon-methods.js",
    "./dashboard-cart-spill-data.js",
    "./dashboard-cart-spill-pile-renderer.js",
    "./dashboard-cart-spill-methods.js",
    "./dashboard-pace-favicon-methods.js",
    "./dashboard-splat-fall-methods.js",
    "./dashboard-speed-lines-methods.js",
    "./dashboard-sprint-smoke-methods.js",
    "./dashboard-train-smoke.js",
    "./dashboard-train-roll-methods.js",
    "./dashboard-pace-rail-methods.js",
    "./dashboard-pace-summary-methods.js",
    "./dashboard-pace-preview-methods.js",
    "./dashboard-pace-controller.js",
    "./dashboard-app-core.js",
    "./dashboard-singularity-transition-preview-methods.js",
    "./dashboard-history-methods.js",
    "./dashboard-event-methods.js",
    "./dashboard-dom-contract.js",
    "./dashboard.js",
  ]);

  const DEV_FLAGS_ONLY_SCRIPT_SOURCES = Object.freeze([
    "./dev-flags-rendering.js",
    "./dev-flags-current-mode.js",
    "./dev-flags-singularity-controls.js",
    "./dev-flags-preview-actions.js",
    "./dev-flags.js",
  ]);

  function extensionPageSource(source) {
    return `./${source}`;
  }

  function dashboardSource(source) {
    return extensionPageSource(source);
  }

  const BACKGROUND_SCRIPT_SOURCES = Object.freeze([
    ...COMMON_SCRIPT_SOURCES,
    ...BACKGROUND_ONLY_SCRIPT_SOURCES,
  ]);

  const DASHBOARD_SCRIPT_SOURCES = Object.freeze([
    ...COMMON_SCRIPT_SOURCES.map(dashboardSource),
    ...DASHBOARD_ONLY_SCRIPT_SOURCES,
  ]);

  const OPTIONAL_DASHBOARD_SCRIPT_SOURCES = Object.freeze([
    "./vendor/chart.umd.min.js",
  ]);

  const DEV_FLAGS_SCRIPT_SOURCES = Object.freeze([
    ...COMMON_SCRIPT_SOURCES.map(extensionPageSource),
    ...DEV_FLAGS_ONLY_SCRIPT_SOURCES,
  ]);

  function dependencyEdge(before, after) {
    return Object.freeze([before, after]);
  }

  function extensionPageDependencyEdge(edge) {
    return dependencyEdge(
      extensionPageSource(edge[0]),
      extensionPageSource(edge[1]),
    );
  }

  function dashboardDependencyEdge(edge) {
    return extensionPageDependencyEdge(edge);
  }

  const COMMON_RUNTIME_DEPENDENCY_EDGES = Object.freeze([
    dependencyEdge("integration-config.js", "usage.js"),
    dependencyEdge("usage-windows.js", "usage.js"),
    dependencyEdge("usage-values.js", "usage.js"),
    dependencyEdge("usage-values.js", "history-store.js"),
    dependencyEdge("persisted-text.js", "refresh-status.js"),
    dependencyEdge("persisted-text.js", "history-store.js"),
    dependencyEdge("refresh-status.js", "refresh-control.js"),
    dependencyEdge("refresh-status.js", "history-store.js"),
    dependencyEdge("usage-values.js", "pace-logic.js"),
    dependencyEdge("storage-adapter.js", "usage.js"),
    dependencyEdge("usage-integration-adapters.js", "usage-providers.js"),
    dependencyEdge("usage-providers.js", "usage.js"),
    dependencyEdge("usage-providers.js", "history-store.js"),
    dependencyEdge("themes/default/asset-manifest.js", "pace-logic.js"),
    dependencyEdge("pace-state-art.js", "pace-state-data.js"),
    dependencyEdge("sprint-intensity.js", "developer-options.js"),
    dependencyEdge("sprint-intensity.js", "preview-control.js"),
    dependencyEdge("pace-state-data.js", "developer-options.js"),
    dependencyEdge("pace-state-data.js", "pace-logic.js"),
    dependencyEdge("pace-logic.js", "preview-control.js"),
    dependencyEdge("usage-values.js", "preview-control.js"),
  ]);

  const BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES = Object.freeze([
    dependencyEdge("product-metadata.js", "background-logic.js"),
    dependencyEdge("developer-options.js", "background-logic.js"),
    dependencyEdge("usage-providers.js", "background-usage-source.js"),
  ]);

  const DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES = Object.freeze([
    dependencyEdge("./product-metadata.js", "./dashboard.js"),
    dependencyEdge("./developer-options.js", "./dashboard.js"),
    dependencyEdge("./integration-config.js", "./dashboard-chart-data.js"),
    dependencyEdge("./pace-logic.js", "./dashboard-chart-data.js"),
    dependencyEdge("./dashboard-chart-data.js", "./dashboard-chart.js"),
    dependencyEdge("./pace-logic.js", "./dashboard-chart.js"),
    dependencyEdge(
      "./dashboard-preferences.js",
      "./dashboard-shell-controls.js",
    ),
    dependencyEdge("./dashboard-preferences.js", "./dashboard-app-core.js"),
    dependencyEdge(
      "./perfect-zero-space-draw.js",
      "./perfect-zero-space-scene.js",
    ),
    dependencyEdge(
      "./dashboard-status-logic.js",
      "./dashboard-status-controller.js",
    ),
    dependencyEdge("./sprint-intensity.js", "./dashboard-pace-data.js"),
    dependencyEdge(
      "./dashboard-pace-data.js",
      "./dashboard-brake-extreme-canvas-methods.js",
    ),
    dependencyEdge(
      "./dashboard-pace-core.js",
      "./dashboard-brake-extreme-canvas-methods.js",
    ),
    dependencyEdge(
      "./dashboard-brake-debris-data.js",
      "./dashboard-brake-extreme-canvas-methods.js",
    ),
    dependencyEdge(
      "./dashboard-push-stretch-renderer.js",
      "./dashboard-push-stretch-methods.js",
    ),
    dependencyEdge(
      "./dashboard-push-sweat-variation.js",
      "./dashboard-push-sweat-renderer.js",
    ),
    dependencyEdge(
      "./dashboard-push-sweat-renderer.js",
      "./dashboard-push-stretch-methods.js",
    ),
    dependencyEdge(
      "./dashboard-push-water-renderer.js",
      "./dashboard-push-stretch-methods.js",
    ),
    dependencyEdge(
      "./dashboard-sync-sunburst-rays.js",
      "./dashboard-sync-sunburst-renderer.js",
    ),
    dependencyEdge(
      "./dashboard-singularity-transition-data.js",
      "./dashboard-singularity-transition-motion.js",
    ),
    dependencyEdge(
      "./dashboard-singularity-transition-motion.js",
      "./dashboard-singularity-transition-draw.js",
    ),
    dependencyEdge(
      "./dashboard-singularity-transition-draw.js",
      "./dashboard-singularity-transition-renderer.js",
    ),
    dependencyEdge(
      "./developer-options.js",
      "./dashboard-singularity-transition-versions.js",
    ),
    dependencyEdge(
      "./dashboard-singularity-transition-renderer.js",
      "./dashboard-singularity-transition-versions.js",
    ),
    dependencyEdge(
      "./dashboard-singularity-v2-black-hole-draw.js",
      "./dashboard-singularity-v2-black-hole-scene.js",
    ),
    dependencyEdge(
      "./dashboard-singularity-v2-black-hole-scene.js",
      "./dashboard-singularity-transition-v2-renderer.js",
    ),
    dependencyEdge(
      "./dashboard-singularity-transition-v2-renderer.js",
      "./dashboard-singularity-transition-versions.js",
    ),
    dependencyEdge(
      "./dashboard-singularity-transition-versions.js",
      "./dashboard-singularity-transition-methods.js",
    ),
    dependencyEdge(
      "./dashboard-pace-icon-methods.js",
      "./dashboard-pace-rail-methods.js",
    ),
    dependencyEdge(
      "./sprint-intensity.js",
      "./dashboard-sprint-smoke-methods.js",
    ),
    dependencyEdge(
      "./dashboard-pace-core.js",
      "./dashboard-pace-controller.js",
    ),
    dependencyEdge(
      "./dashboard-pace-rail-methods.js",
      "./dashboard-pace-controller.js",
    ),
    dependencyEdge("./dashboard-pace-controller.js", "./dashboard-app-core.js"),
    dependencyEdge(
      "./singularity-transition-preview-control.js",
      "./dashboard-singularity-transition-preview-methods.js",
    ),
    dependencyEdge(
      "./dashboard-pace-data.js",
      "./dashboard-singularity-transition-preview-methods.js",
    ),
    dependencyEdge(
      "./dashboard-app-core.js",
      "./dashboard-singularity-transition-preview-methods.js",
    ),
    dependencyEdge(
      "./dashboard-singularity-transition-preview-methods.js",
      "./dashboard-event-methods.js",
    ),
    dependencyEdge("./dashboard-app-core.js", "./dashboard.js"),
    dependencyEdge("./dashboard-history-methods.js", "./dashboard.js"),
    dependencyEdge("./dashboard-event-methods.js", "./dashboard.js"),
    dependencyEdge("./dashboard-dom-contract.js", "./dashboard.js"),
  ]);

  const DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES = Object.freeze([
    dependencyEdge("./dev-flags-rendering.js", "./dev-flags.js"),
    dependencyEdge(
      "./dev-flags-rendering.js",
      "./dev-flags-singularity-controls.js",
    ),
    dependencyEdge("./dev-flags-current-mode.js", "./dev-flags.js"),
    dependencyEdge("./dev-flags-singularity-controls.js", "./dev-flags.js"),
    dependencyEdge("./developer-options.js", "./dev-flags.js"),
    dependencyEdge("./pace-state-data.js", "./dev-flags.js"),
    dependencyEdge(
      "./singularity-transition-preview-control.js",
      "./dev-flags-preview-actions.js",
    ),
    dependencyEdge(
      "./sync-monk-escape-preview-control.js",
      "./dev-flags-preview-actions.js",
    ),
    dependencyEdge("./dev-flags-preview-actions.js", "./dev-flags.js"),
    dependencyEdge("./storage-adapter.js", "./dev-flags.js"),
  ]);

  const BACKGROUND_RUNTIME_DEPENDENCY_EDGES = Object.freeze([
    ...COMMON_RUNTIME_DEPENDENCY_EDGES,
    ...BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES,
  ]);

  const DASHBOARD_RUNTIME_DEPENDENCY_EDGES = Object.freeze([
    ...COMMON_RUNTIME_DEPENDENCY_EDGES.map(dashboardDependencyEdge),
    ...DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES,
  ]);

  const DEV_FLAGS_RUNTIME_DEPENDENCY_EDGES = Object.freeze([
    ...COMMON_RUNTIME_DEPENDENCY_EDGES.map(extensionPageDependencyEdge),
    ...DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES,
  ]);

  root.CodexExtensionRuntime = Object.freeze({
    BACKGROUND_ONLY_SCRIPT_SOURCES,
    BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES,
    BACKGROUND_RUNTIME_DEPENDENCY_EDGES,
    BACKGROUND_SCRIPT_SOURCES,
    COMMON_RUNTIME_DEPENDENCY_EDGES,
    COMMON_SCRIPT_SOURCES,
    DASHBOARD_ONLY_SCRIPT_SOURCES,
    DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES,
    DASHBOARD_RUNTIME_DEPENDENCY_EDGES,
    DASHBOARD_SCRIPT_SOURCES,
    DEV_FLAGS_ONLY_SCRIPT_SOURCES,
    DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES,
    DEV_FLAGS_RUNTIME_DEPENDENCY_EDGES,
    DEV_FLAGS_SCRIPT_SOURCES,
    OPTIONAL_DASHBOARD_SCRIPT_SOURCES,
  });
})(globalThis);

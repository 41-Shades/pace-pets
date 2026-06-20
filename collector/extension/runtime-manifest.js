(function attachCodexExtensionRuntime(root) {
  "use strict";

  const COMMON_SCRIPT_SOURCES = Object.freeze([
    "product-metadata.js",
    "integration-config.js",
    "usage-windows.js",
    "usage-values.js",
    "persisted-text.js",
    "refresh-status.js",
    "refresh-schedule.js",
    "refresh-control.js",
    "dev-preview-action-registry.js",
    "brake-extreme-preview-control.js",
    "push-sweat-preview-control.js",
    "sync-monk-escape-preview-control.js",
    "storage-adapter.js",
    "usage-integration-adapters.js",
    "usage-providers.js",
    "usage.js",
    "history-store.js",
    "themes/default/asset-manifest.js",
    "pace-state-art.js",
    "pace-state-special-data.js",
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
    "./dashboard-info-template.js",
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
    "./dashboard-push-tank-data.js",
    "./dashboard-push-tank-visitors.js",
    "./dashboard-push-tank-renderer.js",
    "./dashboard-push-water-renderer.js",
    "./dashboard-push-stretch-methods.js",
    "./dashboard-sync-sunburst-rays.js",
    "./dashboard-sync-sunburst-draw.js",
    "./dashboard-sync-sunburst-turnover.js",
    "./dashboard-sync-sunburst-renderer.js",
    "./dashboard-sync-monk-escape-scene.js",
    "./dashboard-sync-monk-escape-methods.js",
    "./dashboard-sync-sunburst-methods.js",
    "./dashboard-big-bang-scene-factory.js",
    "./dashboard-big-bang-ejecta-draw.js",
    "./dashboard-big-bang-particle-draw.js",
    "./dashboard-big-bang-recede-draw.js",
    "./dashboard-big-bang-plume-draw.js",
    "./dashboard-big-bang-scene-draw.js",
    "./dashboard-big-bang-scene.js",
    "./dashboard-big-bang-transition-renderer.js",
    "./dashboard-singularity-black-hole-v2-shaders.js",
    "./dashboard-singularity-black-hole-v2-scene.js",
    "./dashboard-singularity-chrome-collapse-fragments.js",
    "./dashboard-singularity-chrome-collapse-motion.js",
    "./dashboard-singularity-chrome-collapse-scene.js",
    "./dashboard-singularity-transition-renderer.js",
    "./dashboard-singularity-transition-methods.js",
    "./dashboard-pace-wobble-methods.js",
    "./dashboard-ease-up-methods.js",
    "./dashboard-pace-icon-render-methods.js",
    "./dashboard-pace-icon-methods.js",
    "./dashboard-cart-spill-data.js",
    "./dashboard-cart-spill-pile-renderer.js",
    "./dashboard-cart-spill-methods.js",
    "./dashboard-pace-favicon-methods.js",
    "./dashboard-splat-fall-profile.js",
    "./dashboard-splat-entry-playback.js",
    "./dashboard-splat-fall-methods.js",
    "./dashboard-splat-max-throw-methods.js",
    "./dashboard-speed-lines-methods.js",
    "./dashboard-sprint-smoke-methods.js",
    "./dashboard-train-smoke-data.js",
    "./dashboard-train-smoke.js",
    "./dashboard-train-roll-methods.js",
    "./dashboard-pace-rail-methods.js",
    "./dashboard-pace-summary-methods.js",
    "./dashboard-pace-preview-methods.js",
    "./dashboard-pace-controller.js",
    "./dashboard-app-core.js",
    "./dashboard-reset-exhausted-arm-motion.js",
    "./dashboard-reset-exhausted-figure.js",
    "./dashboard-reset-exhausted-methods.js",
    "./dashboard-history-methods.js",
    "./dashboard-event-methods.js",
    "./dashboard-dom-contract.js",
    "./dashboard.js",
  ]);
  const DEV_FLAGS_ONLY_SCRIPT_SOURCES = Object.freeze([
    "./dev-flags-rendering.js",
    "./dev-flags-dom-contract.js",
    "./dev-flags-current-mode.js",
    "./dev-flags-preview-actions.js",
    "./dev-flags-feature-previews.js",
    "./dev-flags.js",
  ]);
  function extensionPageSource(source) {
    return `./${source}`;
  }
  const BACKGROUND_SCRIPT_SOURCES = Object.freeze([
    ...COMMON_SCRIPT_SOURCES,
    ...BACKGROUND_ONLY_SCRIPT_SOURCES,
  ]);
  const DASHBOARD_SCRIPT_SOURCES = Object.freeze([
    ...COMMON_SCRIPT_SOURCES.map(extensionPageSource),
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

  function dashboardFile(name) {
    return name ? `./dashboard-${name}.js` : "./dashboard.js";
  }

  function dashboardFileEdge(before, after) {
    return dependencyEdge(dashboardFile(before), dashboardFile(after));
  }

  function dashboardPreferenceDependencyEdge(after) {
    return dependencyEdge("./dashboard-preferences.js", after);
  }

  const DASHBOARD_PREFERENCE_DEPENDENCY_TARGETS = Object.freeze([
    "./dashboard-shell-controls.js",
    "./dashboard-app-core.js",
    "./dashboard-eclipse-icon.js",
    "./dashboard-brake-debris-methods.js",
    "./dashboard-cart-spill-methods.js",
    "./dashboard-push-stretch-methods.js",
    "./dashboard-sync-sunburst-renderer.js",
    "./dashboard-sync-monk-escape-scene.js",
    "./dashboard-ease-up-methods.js",
    "./dashboard-pace-icon-methods.js",
    "./dashboard-splat-fall-methods.js",
    "./dashboard-train-roll-methods.js",
    "./dashboard-singularity-transition-methods.js",
  ]);

  const COMMON_RUNTIME_DEPENDENCY_EDGES = Object.freeze([
    dependencyEdge("integration-config.js", "usage.js"),
    dependencyEdge("usage-windows.js", "usage.js"),
    dependencyEdge("usage-values.js", "usage.js"),
    dependencyEdge("usage-values.js", "history-store.js"),
    dependencyEdge("persisted-text.js", "refresh-status.js"),
    dependencyEdge("persisted-text.js", "history-store.js"),
    dependencyEdge("refresh-status.js", "refresh-control.js"),
    dependencyEdge("refresh-status.js", "history-store.js"),
    ...[
      "brake-extreme-preview-control.js",
      "push-sweat-preview-control.js",
      "sync-monk-escape-preview-control.js",
    ].map((source) => dependencyEdge("dev-preview-action-registry.js", source)),
    dependencyEdge("usage-values.js", "pace-logic.js"),
    dependencyEdge("storage-adapter.js", "usage.js"),
    dependencyEdge("usage-integration-adapters.js", "usage-providers.js"),
    dependencyEdge("usage-providers.js", "usage.js"),
    dependencyEdge("usage-providers.js", "history-store.js"),
    dependencyEdge("themes/default/asset-manifest.js", "pace-logic.js"),
    dependencyEdge(
      "themes/default/asset-manifest.js",
      "pace-state-special-data.js",
    ),
    dependencyEdge("pace-state-art.js", "pace-state-special-data.js"),
    dependencyEdge("pace-state-special-data.js", "pace-state-data.js"),
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
    dashboardFileEdge("chart-data", "chart"),
    dependencyEdge("./pace-logic.js", "./dashboard-chart.js"),
    ...DASHBOARD_PREFERENCE_DEPENDENCY_TARGETS.map(
      dashboardPreferenceDependencyEdge,
    ),
    dependencyEdge(
      "./perfect-zero-space-draw.js",
      "./perfect-zero-space-scene.js",
    ),
    dashboardFileEdge("status-logic", "status-controller"),
    dependencyEdge("./refresh-schedule.js", "./dashboard-status-logic.js"),
    dependencyEdge("./sprint-intensity.js", "./dashboard-pace-data.js"),
    dashboardFileEdge("pace-data", "brake-extreme-canvas-methods"),
    dashboardFileEdge("pace-core", "brake-extreme-canvas-methods"),
    dashboardFileEdge("brake-debris-data", "brake-extreme-canvas-methods"),
    dependencyEdge(
      "./brake-extreme-preview-control.js",
      "./dashboard-pace-wobble-methods.js",
    ),
    dashboardFileEdge("push-stretch-renderer", "push-stretch-methods"),
    dashboardFileEdge("push-sweat-variation", "push-sweat-renderer"),
    dashboardFileEdge("push-sweat-renderer", "push-stretch-methods"),
    dependencyEdge(
      "./push-sweat-preview-control.js",
      "./dashboard-push-stretch-methods.js",
    ),
    dashboardFileEdge("push-tank-data", "push-tank-visitors"),
    dashboardFileEdge("push-tank-visitors", "push-tank-renderer"),
    dashboardFileEdge("push-tank-renderer", "push-water-renderer"),
    dashboardFileEdge("push-water-renderer", "push-stretch-methods"),
    dashboardFileEdge("sync-sunburst-rays", "sync-sunburst-renderer"),
    dashboardFileEdge("big-bang-scene-factory", "big-bang-scene"),
    dashboardFileEdge("big-bang-ejecta-draw", "big-bang-scene-draw"),
    dashboardFileEdge("big-bang-particle-draw", "big-bang-scene-draw"),
    dashboardFileEdge("big-bang-recede-draw", "big-bang-scene-draw"),
    dashboardFileEdge("big-bang-plume-draw", "big-bang-scene-draw"),
    dashboardFileEdge("big-bang-scene-draw", "big-bang-scene"),
    dashboardFileEdge("big-bang-scene", "big-bang-transition-renderer"),
    dashboardFileEdge(
      "big-bang-transition-renderer",
      "singularity-transition-methods",
    ),
    dashboardFileEdge(
      "singularity-black-hole-v2-shaders",
      "singularity-black-hole-v2-scene",
    ),
    dashboardFileEdge(
      "singularity-black-hole-v2-scene",
      "singularity-transition-renderer",
    ),
    dashboardFileEdge(
      "singularity-chrome-collapse-fragments",
      "singularity-chrome-collapse-motion",
    ),
    dashboardFileEdge(
      "singularity-chrome-collapse-fragments",
      "singularity-chrome-collapse-scene",
    ),
    dashboardFileEdge(
      "singularity-chrome-collapse-motion",
      "singularity-chrome-collapse-scene",
    ),
    dashboardFileEdge(
      "singularity-chrome-collapse-scene",
      "singularity-transition-renderer",
    ),
    dashboardFileEdge(
      "singularity-transition-renderer",
      "singularity-transition-methods",
    ),
    dashboardFileEdge("pace-core", "pace-icon-render-methods"),
    dashboardFileEdge("pace-icon-render-methods", "pace-icon-methods"),
    dashboardFileEdge("pace-icon-methods", "pace-rail-methods"),
    dashboardFileEdge("splat-fall-profile", "splat-fall-methods"),
    dashboardFileEdge("splat-fall-profile", "splat-entry-playback"),
    dashboardFileEdge("splat-entry-playback", "splat-fall-methods"),
    dashboardFileEdge("splat-fall-methods", "splat-max-throw-methods"),
    dependencyEdge(
      "./sprint-intensity.js",
      "./dashboard-sprint-smoke-methods.js",
    ),
    dependencyEdge(
      "./themes/default/asset-manifest.js",
      "./dashboard-cart-spill-data.js",
    ),
    dependencyEdge(
      "./themes/default/asset-manifest.js",
      "./dashboard-push-tank-renderer.js",
    ),
    dashboardFileEdge("train-smoke-data", "train-smoke"),
    dashboardFileEdge("pace-core", "pace-controller"),
    dashboardFileEdge("pace-rail-methods", "pace-controller"),
    dashboardFileEdge("pace-controller", "app-core"),
    dashboardFileEdge("app-core", "reset-exhausted-methods"),
    dashboardFileEdge("reset-exhausted-arm-motion", "reset-exhausted-figure"),
    dashboardFileEdge("reset-exhausted-figure", "reset-exhausted-methods"),
    dashboardFileEdge("reset-exhausted-arm-motion", "reset-exhausted-methods"),
    dashboardFileEdge("pace-data", "reset-exhausted-methods"),
    dependencyEdge(
      "./themes/default/asset-manifest.js",
      "./dashboard-reset-exhausted-methods.js",
    ),
    dashboardFileEdge("reset-exhausted-methods", ""),
    dashboardFileEdge("app-core", ""),
    dependencyEdge("./dashboard-info-template.js", "./dashboard.js"),
    dashboardFileEdge("history-methods", ""),
    dashboardFileEdge("event-methods", ""),
    dashboardFileEdge("dom-contract", ""),
  ]);

  const DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES = Object.freeze([
    dependencyEdge("./dev-flags-dom-contract.js", "./dev-flags.js"),
    dependencyEdge("./dev-flags-rendering.js", "./dev-flags.js"),
    dependencyEdge("./dev-flags-current-mode.js", "./dev-flags.js"),
    dependencyEdge("./developer-options.js", "./dev-flags.js"),
    dependencyEdge("./developer-options.js", "./dev-flags-feature-previews.js"),
    dependencyEdge("./pace-state-data.js", "./dev-flags.js"),
    dependencyEdge("./pace-state-data.js", "./dev-flags-feature-previews.js"),
    dependencyEdge(
      "./dev-preview-action-registry.js",
      "./dev-flags-preview-actions.js",
    ),
    dependencyEdge(
      "./dev-preview-action-registry.js",
      "./dev-flags-feature-previews.js",
    ),
    dependencyEdge(
      "./dev-flags-preview-actions.js",
      "./dev-flags-feature-previews.js",
    ),
    dependencyEdge("./dev-flags-preview-actions.js", "./dev-flags.js"),
    dependencyEdge("./dev-flags-feature-previews.js", "./dev-flags.js"),
    dependencyEdge("./storage-adapter.js", "./dev-flags.js"),
  ]);

  const BACKGROUND_RUNTIME_DEPENDENCY_EDGES = Object.freeze([
    ...COMMON_RUNTIME_DEPENDENCY_EDGES,
    ...BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES,
  ]);

  const DASHBOARD_RUNTIME_DEPENDENCY_EDGES = Object.freeze([
    ...COMMON_RUNTIME_DEPENDENCY_EDGES.map(extensionPageDependencyEdge),
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

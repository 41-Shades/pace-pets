function dependencyEdge(before, after) {
  return Object.freeze([before, after]);
}

function extensionPageSource(source) {
  return `./${source}`;
}

function pageEdge(before, after) {
  return dependencyEdge(
    extensionPageSource(before),
    extensionPageSource(after),
  );
}

function extensionPageDependencyEdge([before, after]) {
  return pageEdge(before, after);
}

function dashboardFile(name) {
  return name ? `./dashboard-${name}.js` : "./dashboard.js";
}

function dashboardFileEdge(before, after) {
  return dependencyEdge(dashboardFile(before), dashboardFile(after));
}

function dashboardPageEdge(before, dashboardName) {
  return pageEdge(before, `dashboard-${dashboardName}.js`);
}

function collapseFile(name) {
  return `singularity-chrome-collapse-${name}`;
}

const THEME_ASSET_MANIFEST = "themes/default/asset-manifest.js";
const DASHBOARD_PREFERENCE_DEPENDENCY_TARGETS = Object.freeze(
  "shell-controls app-core eclipse-icon brake-debris-methods cart-spill-methods push-stretch-methods sync-sunburst-renderer sync-monk-escape-scene ease-up-methods pace-icon-methods splat-fall-methods train-roll-methods singularity-transition-methods"
    .split(" ")
    .map(dashboardFile),
);

function commonRuntimeDependencyEdges() {
  return Object.freeze([
    dependencyEdge("integration-config.js", "usage.js"),
    dependencyEdge("usage-windows.js", "dashboard-preferences.js"),
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
      "checkerboard-reveal-preview-control.js",
    ].map((source) => dependencyEdge("dev-preview-action-registry.js", source)),
    dependencyEdge("usage-values.js", "pace-logic.js"),
    dependencyEdge("storage-adapter.js", "usage.js"),
    dependencyEdge("usage-integration-adapters.js", "usage-providers.js"),
    dependencyEdge("usage-providers.js", "usage.js"),
    dependencyEdge("usage-providers.js", "history-store.js"),
    dependencyEdge(THEME_ASSET_MANIFEST, "pace-logic.js"),
    dependencyEdge(THEME_ASSET_MANIFEST, "pace-state-special-data.js"),
    dependencyEdge("pace-state-art.js", "pace-state-special-data.js"),
    dependencyEdge("pace-state-special-data.js", "pace-state-data.js"),
    dependencyEdge("brake-intensity.js", "developer-options.js"),
    dependencyEdge("brake-intensity.js", "preview-control.js"),
    dependencyEdge("sprint-intensity.js", "developer-options.js"),
    dependencyEdge("sprint-intensity.js", "preview-control.js"),
    dependencyEdge("pace-state-data.js", "developer-options.js"),
    dependencyEdge("pace-state-data.js", "pace-logic.js"),
    dependencyEdge("pace-logic.js", "pace-window-history.js"),
    dependencyEdge("pace-logic.js", "preview-control.js"),
    dependencyEdge("usage-values.js", "preview-control.js"),
    dependencyEdge("integration-config.js", "usage-permissions.js"),
    dependencyEdge("storage-adapter.js", "usage-permissions.js"),
    dependencyEdge("storage-adapter.js", "audio-preferences.js"),
  ]);
}

function backgroundOnlyRuntimeDependencyEdges() {
  return Object.freeze([
    dependencyEdge(
      "dev-preview-action-registry.js",
      "background-dev-preview-broker.js",
    ),
    dependencyEdge("product-metadata.js", "background-logic.js"),
    dependencyEdge("developer-options.js", "background-logic.js"),
    dependencyEdge("pace-window-history.js", "background-logic.js"),
    dependencyEdge("refresh-schedule.js", "background-transition-refresh.js"),
    dependencyEdge("pace-logic.js", "background-transition-refresh.js"),
    dependencyEdge("background-logic.js", "background-badge-presentation.js"),
    dependencyEdge("usage-providers.js", "background-usage-source.js"),
    ..."history-store.js refresh-control.js usage.js usage-permissions.js background-badge-presentation.js background-usage-source.js"
      .split(" ")
      .map((source) => dependencyEdge(source, "background-refresh-runner.js")),
  ]);
}

function dashboardFoundationDependencyEdges() {
  return [
    dependencyEdge("./product-metadata.js", "./dashboard.js"),
    dependencyEdge("./developer-options.js", "./dashboard.js"),
    dependencyEdge("./audio-preferences.js", "./dashboard.js"),
    dependencyEdge(
      "./dev-preview-action-registry.js",
      "./dashboard-dev-preview-broker.js",
    ),
    ...[
      "pace-wobble-methods",
      "push-stretch-methods",
      "checkerboard-reveal-methods",
      "singularity-transition-methods",
      "pace-preview-methods",
      "pace-controller",
    ].map((after) => dashboardFileEdge("dev-preview-broker", after)),
    dependencyEdge("./integration-config.js", "./dashboard-chart-data.js"),
    dependencyEdge("./pace-logic.js", "./dashboard-chart-data.js"),
    dependencyEdge("./pace-window-history.js", "./dashboard-chart-data.js"),
    dashboardFileEdge("chart-data", "chart"),
    dependencyEdge("./pace-logic.js", "./dashboard-chart.js"),
    dependencyEdge("./audio-clips.js", "./dashboard-audio-manager.js"),
    dependencyEdge("./audio-preferences.js", "./dashboard-audio-manager.js"),
    dependencyEdge(
      "./dashboard-audio-manager.js",
      "./dashboard-audio-control.js",
    ),
    dashboardFileEdge("audio-control", "app-core"),
    dashboardFileEdge("big-bang-audio-timeline", "transition-audio"),
    dashboardFileEdge("brake-extreme-audio-timeline", "transition-audio"),
    dashboardFileEdge("transition-audio", "app-core"),
    ...DASHBOARD_PREFERENCE_DEPENDENCY_TARGETS.map((after) =>
      dependencyEdge("./dashboard-preferences.js", after),
    ),
    pageEdge("perfect-zero-space-draw.js", "perfect-zero-space-scene.js"),
    dashboardFileEdge("status-logic", "status-controller"),
    dashboardPageEdge("refresh-schedule.js", "status-logic"),
    dashboardPageEdge("usage-permissions.js", "status-controller"),
    dashboardPageEdge("brake-intensity.js", "pace-data"),
    dashboardPageEdge("sprint-intensity.js", "pace-data"),
    dashboardFileEdge("pace-data", "brake-extreme-canvas-methods"),
    dashboardFileEdge("pace-core", "brake-extreme-canvas-methods"),
    dashboardFileEdge("brake-debris-data", "brake-extreme-canvas-methods"),
    dashboardPageEdge(
      "brake-extreme-preview-control.js",
      "pace-wobble-methods",
    ),
    dashboardFileEdge("push-stretch-renderer", "push-stretch-methods"),
    dashboardFileEdge("push-sweat-variation", "push-sweat-renderer"),
    dashboardFileEdge("push-sweat-renderer", "push-stretch-methods"),
    dashboardPageEdge("push-sweat-preview-control.js", "push-stretch-methods"),
    dashboardPageEdge(
      "checkerboard-reveal-preview-control.js",
      "checkerboard-reveal-methods",
    ),
    dashboardFileEdge("push-tank-data", "push-tank-visitors"),
    dashboardFileEdge("push-tank-visitors", "push-tank-renderer"),
    dashboardFileEdge("push-tank-renderer", "push-water-renderer"),
    dashboardFileEdge("push-water-renderer", "push-stretch-methods"),
    dashboardFileEdge("sync-sunburst-rays", "sync-sunburst-renderer"),
  ];
}

function dashboardTransitionDependencyEdges() {
  return [
    dashboardFileEdge("big-bang-origin", "big-bang-scene-factory"),
    dashboardFileEdge("big-bang-origin", "big-bang-plume-draw"),
    dashboardFileEdge("big-bang-origin", "big-bang-scene-draw"),
    dashboardFileEdge("big-bang-scene-factory", "big-bang-scene"),
    dashboardFileEdge("big-bang-ejecta-draw", "big-bang-scene-draw"),
    dashboardFileEdge("big-bang-particle-draw", "big-bang-scene-draw"),
    dashboardFileEdge("big-bang-recede-draw", "big-bang-scene-draw"),
    dashboardFileEdge("big-bang-plume-draw", "big-bang-scene-draw"),
    dashboardFileEdge("big-bang-webgl-shaders", "big-bang-webgl-renderer"),
    dashboardFileEdge("big-bang-webgl-renderer", "big-bang-scene"),
    dashboardFileEdge("big-bang-scene-draw", "big-bang-scene"),
    dashboardFileEdge("big-bang-scene", "big-bang-transition-renderer"),
    dashboardFileEdge("checkerboard-reveal", "checkerboard-reveal-methods"),
    dashboardFileEdge("checkerboard-reveal", "singularity-transition-renderer"),
    ...[
      ["big-bang-transition-renderer", "singularity-transition-methods"],
      ["singularity-black-hole-v2-shaders", "singularity-black-hole-v2-scene"],
      ["singularity-black-hole-v2-scene", "singularity-transition-renderer"],
      [collapseFile("fragments"), collapseFile("motion")],
      [collapseFile("fragments"), collapseFile("scene")],
      [collapseFile("motion"), collapseFile("scene")],
      [collapseFile("scene"), "singularity-transition-renderer"],
      ["singularity-transition-renderer", "singularity-transition-methods"],
    ].map(([before, after]) => dashboardFileEdge(before, after)),
    dashboardPageEdge(
      "dev-preview-action-registry.js",
      "singularity-transition-methods",
    ),
  ];
}

function dashboardPresentationDependencyEdges() {
  return [
    dashboardFileEdge("pace-core", "checkerboard-reveal-methods"),
    dashboardFileEdge("checkerboard-reveal-methods", "pace-controller"),
    dashboardFileEdge("pace-core", "pace-icon-render-methods"),
    dashboardFileEdge("pace-icon-render-methods", "pace-icon-methods"),
    dashboardFileEdge("pace-data", "pace-icon-selection"),
    dashboardFileEdge("pace-icon-selection", "pace-icon-methods"),
    dashboardFileEdge("pace-core", "pace-transition-methods"),
    dashboardFileEdge("pace-transition-methods", "pace-summary-methods"),
    dashboardFileEdge("pace-transition-methods", "pace-preview-methods"),
    dashboardFileEdge("pace-icon-methods", "pace-rail-methods"),
    dashboardFileEdge("splat-fall-profile", "splat-fall-methods"),
    dashboardFileEdge("splat-fall-profile", "splat-entry-playback"),
    dashboardFileEdge("splat-entry-playback", "splat-fall-methods"),
    dashboardFileEdge("splat-fall-methods", "splat-max-throw-methods"),
    dashboardPageEdge("brake-intensity.js", "pace-wobble-methods"),
    dashboardPageEdge("sprint-intensity.js", "sprint-smoke-methods"),
    dashboardPageEdge(THEME_ASSET_MANIFEST, "cart-spill-data"),
    dashboardPageEdge(THEME_ASSET_MANIFEST, "push-tank-renderer"),
    dashboardFileEdge("train-smoke-data", "train-smoke"),
    dashboardFileEdge("pace-core", "pace-controller"),
    dashboardFileEdge("pace-rail-methods", "pace-controller"),
    dashboardFileEdge("pace-controller", "app-core"),
    dashboardFileEdge("state-loader", "app-core"),
    dashboardFileEdge("app-core", "state-methods"),
    dashboardFileEdge("state-methods", ""),
    dashboardFileEdge("app-core", "reset-exhausted-methods"),
    dashboardFileEdge("reset-exhausted-arm-motion", "reset-exhausted-figure"),
    dashboardFileEdge("reset-exhausted-figure", "reset-exhausted-methods"),
    dashboardFileEdge("reset-exhausted-arm-motion", "reset-exhausted-methods"),
    dashboardFileEdge("pace-data", "reset-exhausted-methods"),
    dashboardPageEdge(THEME_ASSET_MANIFEST, "reset-exhausted-methods"),
    dashboardFileEdge("reset-exhausted-methods", ""),
    dashboardFileEdge("app-core", ""),
    dependencyEdge("./dashboard-info-template.js", "./dashboard.js"),
    pageEdge("pace-window-history.js", "dashboard-history-methods.js"),
    dashboardFileEdge("history-methods", ""),
    dashboardFileEdge("event-methods", ""),
    dashboardFileEdge("dom-contract", ""),
  ];
}

function dashboardOnlyRuntimeDependencyEdges() {
  return Object.freeze([
    ...dashboardFoundationDependencyEdges(),
    ...dashboardTransitionDependencyEdges(),
    ...dashboardPresentationDependencyEdges(),
  ]);
}

function devFlagsOnlyRuntimeDependencyEdges() {
  return Object.freeze([
    dependencyEdge("./dev-flags-dom-contract.js", "./dev-flags.js"),
    dependencyEdge("./dev-flags-rendering.js", "./dev-flags.js"),
    dependencyEdge("./dev-flags-pace-scale-previews.js", "./dev-flags.js"),
    dependencyEdge("./dev-flags-current-mode.js", "./dev-flags.js"),
    dependencyEdge("./dashboard-preferences.js", "./dev-flags-theme-mode.js"),
    dependencyEdge("./dev-flags-theme-mode.js", "./dev-flags.js"),
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
}

export function createRuntimeDependencyContract(runtimeManifest) {
  if (!Array.isArray(runtimeManifest?.COMMON_SCRIPT_SOURCES)) {
    throw new Error(
      "Runtime script sources must load before dependency checks.",
    );
  }

  const COMMON_RUNTIME_DEPENDENCY_EDGES = commonRuntimeDependencyEdges();
  const BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES =
    backgroundOnlyRuntimeDependencyEdges();
  const DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES =
    dashboardOnlyRuntimeDependencyEdges();
  const DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES =
    devFlagsOnlyRuntimeDependencyEdges();
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

  return Object.freeze({
    BACKGROUND_ONLY_RUNTIME_DEPENDENCY_EDGES,
    BACKGROUND_RUNTIME_DEPENDENCY_EDGES,
    COMMON_RUNTIME_DEPENDENCY_EDGES,
    DASHBOARD_ONLY_RUNTIME_DEPENDENCY_EDGES,
    DASHBOARD_RUNTIME_DEPENDENCY_EDGES,
    DEV_FLAGS_ONLY_RUNTIME_DEPENDENCY_EDGES,
    DEV_FLAGS_RUNTIME_DEPENDENCY_EDGES,
  });
}

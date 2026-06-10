(function attachCodexExtensionRuntime(root) {
  "use strict";

  const COMMON_SCRIPT_SOURCES = Object.freeze([
    "product-metadata.js",
    "integration-config.js",
    "usage-windows.js",
    "usage-values.js",
    "refresh-status.js",
    "refresh-control.js",
    "storage-adapter.js",
    "usage-integration-adapters.js",
    "usage-providers.js",
    "usage.js",
    "history-store.js",
    "themes/default/asset-manifest.js",
    "pace-state-art.js",
    "pace-state-data.js",
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
    "./perfect-zero-space-motion.js",
    "./perfect-zero-space-draw.js",
    "./perfect-zero-space-scene.js",
    "./dashboard-tooltips.js",
    "./dashboard-early-reset.js",
    "./dashboard-chart-data.js",
    "./dashboard-chart.js",
    "./dashboard-time.js",
    "./dashboard-shell-controls.js",
    "./dashboard-status-logic.js",
    "./dashboard-status-controller.js",
    "./dashboard-pace-data.js",
    "./dashboard-pace-core.js",
    "./dashboard-perfect-zero-page-background-methods.js",
    "./dashboard-brake-debris-data.js",
    "./dashboard-brake-debris-methods.js",
    "./dashboard-push-stretch-renderer.js",
    "./dashboard-push-sweat-variation.js",
    "./dashboard-push-sweat-renderer.js",
    "./dashboard-push-water-renderer.js",
    "./dashboard-push-stretch-methods.js",
    "./dashboard-sync-sunburst-draw.js",
    "./dashboard-sync-sunburst-turnover.js",
    "./dashboard-sync-sunburst-renderer.js",
    "./dashboard-sync-sunburst-methods.js",
    "./dashboard-pace-wobble-methods.js",
    "./dashboard-pace-icon-methods.js",
    "./dashboard-cart-spill-data.js",
    "./dashboard-cart-spill-pile-renderer.js",
    "./dashboard-cart-spill-methods.js",
    "./dashboard-pace-favicon-methods.js",
    "./dashboard-splat-fall-methods.js",
    "./dashboard-speed-lines-methods.js",
    "./dashboard-sprint-smoke-methods.js",
    "./dashboard-train-roll-methods.js",
    "./dashboard-pace-rail-methods.js",
    "./dashboard-pace-summary-methods.js",
    "./dashboard-pace-preview-methods.js",
    "./dashboard-pace-controller.js",
    "./dashboard-app-core.js",
    "./dashboard-history-methods.js",
    "./dashboard-event-methods.js",
    "./dashboard.js",
  ]);

  function dashboardSource(source) {
    return `./${source}`;
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

  root.CodexExtensionRuntime = Object.freeze({
    BACKGROUND_ONLY_SCRIPT_SOURCES,
    BACKGROUND_SCRIPT_SOURCES,
    COMMON_SCRIPT_SOURCES,
    DASHBOARD_ONLY_SCRIPT_SOURCES,
    DASHBOARD_SCRIPT_SOURCES,
    OPTIONAL_DASHBOARD_SCRIPT_SOURCES,
  });
})(globalThis);

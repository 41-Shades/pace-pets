(function attachCodexExtensionRuntime(root) {
  "use strict";

  const BACKGROUND_SCRIPT_SOURCES = Object.freeze([
    "product-metadata.js",
    "integration-config.js",
    "usage-windows.js",
    "usage-values.js",
    "refresh-status.js",
    "refresh-control.js",
    "storage-adapter.js",
    "usage-integration-adapters.js",
    "usage.js",
    "history-store.js",
    "themes/default/asset-manifest.js",
    "feature-flags.js",
    "pace-logic.js",
    "preview-control.js",
    "background-logic.js",
  ]);

  const DASHBOARD_SCRIPT_SOURCES = Object.freeze([
    "./product-metadata.js",
    "./integration-config.js",
    "./usage-windows.js",
    "./usage-values.js",
    "./refresh-status.js",
    "./refresh-control.js",
    "./storage-adapter.js",
    "./usage-integration-adapters.js",
    "./usage.js",
    "./history-store.js",
    "./themes/default/asset-manifest.js",
    "./feature-flags.js",
    "./pace-logic.js",
    "./preview-control.js",
    "./vendor/chart.umd.min.js",
    "./perfect-zero-space-scene.js",
    "./dashboard.js",
  ]);

  const OPTIONAL_DASHBOARD_SCRIPT_SOURCES = Object.freeze([
    "./vendor/chart.umd.min.js",
  ]);

  root.CodexExtensionRuntime = Object.freeze({
    BACKGROUND_SCRIPT_SOURCES,
    DASHBOARD_SCRIPT_SOURCES,
    OPTIONAL_DASHBOARD_SCRIPT_SOURCES,
  });
})(globalThis);

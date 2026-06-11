(() => {
  "use strict";

  const DASHBOARD_INIT_KEY = "__pacePetsDashboardInitialized";
  if (globalThis[DASHBOARD_INIT_KEY]) {
    return;
  }
  globalThis[DASHBOARD_INIT_KEY] = true;

  function requiredGlobal(name, description) {
    const value = globalThis[name];
    if (!value) {
      throw new Error(`${description} must load before dashboard.js.`);
    }
    return value;
  }

  const DASHBOARD_DOM = requiredGlobal(
    "PacePetsDashboardDom",
    "Pace Pets dashboard DOM contract",
  );
  const dependencies = {
    APP_TOOLTIPS: requiredGlobal(
      "PacePetsAppTooltips",
      "Pace Pets app tooltips",
    ),
    DASHBOARD_CHART: requiredGlobal(
      "PacePetsDashboardChart",
      "Pace Pets dashboard chart",
    ),
    DASHBOARD_PREFERENCES: requiredGlobal(
      "PacePetsDashboardPreferences",
      "Pace Pets dashboard preferences",
    ),
    DASHBOARD_PACE: requiredGlobal(
      "PacePetsDashboardPace",
      "Pace Pets dashboard pace controls",
    ),
    DASHBOARD_STATUS: requiredGlobal(
      "PacePetsDashboardStatus",
      "Pace Pets dashboard status controls",
    ),
    DASHBOARD_TIME: requiredGlobal(
      "PacePetsDashboardTime",
      "Pace Pets dashboard time",
    ),
    DEVELOPER_OPTIONS: requiredGlobal(
      "PacePetsDeveloperOptions",
      "Pace Pets developer options",
    ),
    EARLY_RESET: requiredGlobal("PacePetsEarlyReset", "Pace Pets early reset"),
    EXTENSION_STORAGE: requiredGlobal(
      "CodexExtensionStorage",
      "Codex storage adapter",
    ),
    PRODUCT_METADATA: requiredGlobal(
      "CodexProductMetadata",
      "Codex product metadata",
    ),
    REFRESH_CONTROL: requiredGlobal(
      "PacePetsRefreshControl",
      "Pace Pets refresh controls",
    ),
    SHELL_CONTROLS: requiredGlobal(
      "PacePetsDashboardShellControls",
      "Pace Pets dashboard shell controls",
    ),
    USAGE_WINDOWS: requiredGlobal(
      "CodexUsageWindows",
      "Codex usage window contract",
    ),
  };

  const App = requiredGlobal("PacePetsDashboardApp", "Pace Pets dashboard app");
  new App({
    dependencies,
    elements: DASHBOARD_DOM.collectElements(document),
  }).start();
})();

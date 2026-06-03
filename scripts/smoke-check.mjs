import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assertStorageSchemaDocumentCurrent } from "./storage-schema-doc.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function readText(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFile(relativePath) {
  assert(
    fs.existsSync(path.join(projectRoot, relativePath)),
    `Missing ${relativePath}`,
  );
}

function extensionPathFromExtensionPageUrl(src, label) {
  assert(
    src.startsWith("./") && !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src),
    `${label} must be extension-local: ${src}`,
  );
  return `collector/extension/${src.slice(2)}`;
}

function assertIncludes(fileText, needle, label) {
  assert(fileText.includes(needle), `Missing ${label}: ${needle}`);
}

await import(
  pathToFileURL(
    path.join(projectRoot, "collector/extension/runtime-manifest.js"),
  )
);
const runtimeManifest = globalThis.CodexExtensionRuntime;
assert(runtimeManifest, "Runtime manifest is not wired.");
await import(
  pathToFileURL(
    path.join(projectRoot, "collector/extension/product-metadata.js"),
  )
);
const productMetadata = globalThis.CodexProductMetadata;
await import(
  pathToFileURL(
    path.join(projectRoot, "collector/extension/integration-config.js"),
  )
);
const integrationConfig = globalThis.CodexIntegrationConfig;
await import(
  pathToFileURL(
    path.join(
      projectRoot,
      "collector/extension/themes/default/asset-manifest.js",
    ),
  )
);
const themeAssets = globalThis.CodexThemeAssets;
assert(themeAssets, "Theme asset manifest is not wired.");

const manifest = readJson("collector/extension/manifest.json");
assert(
  manifest.manifest_version === 3,
  "Extension manifest must use Manifest V3.",
);
assert(manifest.name === productMetadata.NAME, "Unexpected extension name.");
assert(
  manifest.permissions?.includes("storage"),
  "Extension storage is not wired.",
);
assert(
  manifest.host_permissions?.includes(
    integrationConfig.CHATGPT_HOST_PERMISSION,
  ),
  "Extension host permission is not aligned with the integration config.",
);
assert(
  !manifest.action?.default_popup,
  "Extension must not use a popup action.",
);
assert(
  !manifest.content_scripts,
  "Extension must not inject localhost content scripts.",
);
assertFile("collector/extension/background.js");
assertFile("collector/extension/background-logic.js");
assertFile("collector/extension/runtime-manifest.js");
assertFile("collector/extension/dashboard-loader.js");
assertFile("collector/extension/product-metadata.js");
assertFile("collector/extension/integration-config.js");
assertFile("collector/extension/usage-windows.js");
assertFile("collector/extension/usage-values.js");
assertFile("collector/extension/refresh-status.js");
assertFile("collector/extension/refresh-control.js");
assertFile("collector/extension/storage-adapter.js");
assertFile("collector/extension/usage-integration-adapters.js");
assertFile("collector/extension/usage.js");
assertFile("collector/extension/history-store.js");
assertFile("collector/extension/themes/default/asset-manifest.js");
assertFile("collector/extension/developer-options.js");
assertFile("collector/extension/pace-logic.js");
assertFile("collector/extension/dashboard.html");
assertFile("collector/extension/dashboard.css");
assertFile("collector/extension/dashboard.js");
assertFile("collector/extension/vendor/chart.umd.min.js");
assertFile("collector/extension/vendor/chart.umd.min.js.map");
for (const size of ["16", "32", "48", "128"]) {
  assertFile(
    extensionPathFromExtensionPageUrl(
      themeAssets.appIconPathForSize(size),
      `${size}px app icon`,
    ),
  );
}
for (const stateKey of Object.keys(themeAssets.PACE_ICON_FILES_BY_STATE)) {
  assertFile(
    extensionPathFromExtensionPageUrl(
      themeAssets.paceIconPathForState(stateKey),
      `${stateKey} pace icon`,
    ),
  );
}

const dashboardHtml = readText("collector/extension/dashboard.html");
const backgroundJs = readText("collector/extension/background.js");
const dashboardJs = readText("collector/extension/dashboard.js");
const usageJs = readText("collector/extension/usage.js");
const usageIntegrationAdaptersJs = readText(
  "collector/extension/usage-integration-adapters.js",
);
const extensionDocsHtml = readText("docs/extension.html");
await assertStorageSchemaDocumentCurrent();
assert(
  dashboardHtml.includes(`<title>${productMetadata.NAME}</title>`) &&
    dashboardHtml.includes(
      `<h1 id="usage-title">${productMetadata.NAME}</h1>`,
    ) &&
    dashboardHtml.includes(
      `<p id="usage-description">${productMetadata.DASHBOARD_DESCRIPTION}</p>`,
    ),
  "Dashboard static product metadata must match product-metadata.js.",
);
assert(
  !/"windowMinutes"\s*:\s*(?:10080|300)/.test(extensionDocsHtml),
  "Extension setup docs must not duplicate generated storage schema examples.",
);
assert(
  !/>\s*Unknown\s*<\/span>/i.test(dashboardHtml),
  "Dashboard placeholders must not render Unknown.",
);
for (const requiredId of [
  "collection-pulse",
  "collection-status-label",
  "pace-card",
  "pace-icon",
  "pace-title",
  "pace-copy",
  "pace-ratio-stat",
  "pace-ratio-value",
  "usage-percent",
  "time-percent",
  "usage-bar",
  "time-bar",
  "prior-reset-label",
  "prior-reset-date",
  "prior-reset-time",
  "resets-in",
  "scheduled-reset-label",
  "scheduled-reset-date",
  "scheduled-reset-time",
  "chart-frame",
  "usage-chart",
  "chart-state",
  "last-collected",
  "manual-refresh-button",
  "collector-version",
  "early-reset-button",
  "early-reset-popover",
  "pace-state-stack",
]) {
  assertIncludes(
    dashboardHtml,
    `id="${requiredId}"`,
    `dashboard id ${requiredId}`,
  );
}
assert(
  !/<article\b[^>]*class="[^"]*\bstate-chip\b/i.test(dashboardHtml),
  "Pace state legend chips must be rendered from shared pace-state metadata.",
);
assert(
  /<link\b[^>]*rel="stylesheet"[^>]*href="\.\/dashboard\.css"[^>]*>/s.test(
    dashboardHtml,
  ),
  "Missing dashboard stylesheet link.",
);
assert(
  dashboardHtml.includes(`href="${themeAssets.appIconPathForSize(32)}"`),
  "Missing dashboard favicon link.",
);
assert(
  /<link\b[^>]*id="dynamic-favicon"[^>]*rel="icon"[^>]*href=/s.test(
    dashboardHtml,
  ),
  "Dashboard favicon link must be present.",
);
assert(
  /<script\b[^>]*src="\.\/runtime-manifest\.js"[^>]*><\/script>/s.test(
    dashboardHtml,
  ),
  "Missing runtime manifest script link.",
);
assert(
  /<script\b[^>]*src="\.\/dashboard-loader\.js"[^>]*><\/script>/s.test(
    dashboardHtml,
  ),
  "Missing dashboard loader script link.",
);
assert(
  dashboardHtml.indexOf('src="./runtime-manifest.js"') <
    dashboardHtml.indexOf('src="./dashboard-loader.js"'),
  "Dashboard must load the runtime manifest before the dashboard loader.",
);
assert(
  runtimeManifest.DASHBOARD_SCRIPT_SOURCES.includes("./dashboard.js") &&
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.includes(
      "./developer-options.js",
    ) &&
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.includes(
      "./vendor/chart.umd.min.js",
    ),
  "Dashboard runtime manifest must include developer options, dashboard, and Chart.js scripts.",
);
assert(
  runtimeManifest.OPTIONAL_DASHBOARD_SCRIPT_SOURCES?.includes(
    "./vendor/chart.umd.min.js",
  ),
  "Chart.js must be optional so the dashboard can still load without charts.",
);
assert(
  runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./product-metadata.js") <
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./dashboard.js"),
  "Dashboard runtime manifest must load product metadata before dashboard.js.",
);
assert(
  runtimeManifest.BACKGROUND_SCRIPT_SOURCES.indexOf("product-metadata.js") <
    runtimeManifest.BACKGROUND_SCRIPT_SOURCES.indexOf("background-logic.js"),
  "Background runtime manifest must load product metadata before background logic.",
);
assert(
  runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./integration-config.js") <
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./usage.js") &&
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./usage-windows.js") <
      runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./usage.js") &&
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./usage-values.js") <
      runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./usage.js") &&
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./usage-values.js") <
      runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./history-store.js") &&
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./refresh-status.js") <
      runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./history-store.js") &&
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./usage-values.js") <
      runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./pace-logic.js") &&
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./storage-adapter.js") <
      runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./usage.js") &&
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf(
      "./usage-integration-adapters.js",
    ) < runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./usage.js") &&
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf(
      "./themes/default/asset-manifest.js",
    ) < runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./pace-logic.js") &&
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf(
      "./developer-options.js",
    ) < runtimeManifest.DASHBOARD_SCRIPT_SOURCES.indexOf("./dashboard.js"),
  "Dashboard runtime manifest must load shared contracts before dependent scripts.",
);
assert(
  !/\.\/themes\/default\/pace-icons\//.test(dashboardJs),
  "Dashboard script must read pace icon paths from shared pace-state metadata.",
);
assert(
  !/localStorage\.(?:getItem|setItem)\(\s*WINDOW_STORAGE_KEY\b/.test(
    dashboardJs,
  ),
  "Selected usage window preference must use chrome.storage.local, not localStorage.",
);
assert(
  dashboardJs.includes("EXTENSION_STORAGE.getLocal(WINDOW_STORAGE_KEY"),
  "Dashboard must read selected usage window preference through the storage adapter.",
);
assert(
  !/Promise\.resolve\(\s*selectedWindowKey\s*\)/.test(dashboardJs),
  "Dashboard reloads must not snapshot selectedWindowKey during local window toggles.",
);
assert(
  dashboardJs.includes("let currentHistory = null;") &&
    dashboardJs.includes("let currentRefreshStatus = null;"),
  "Dashboard must cache the last loaded state for lightweight time-sensitive refreshes.",
);
assert(
  dashboardJs.includes("refreshDashboardTimeSensitiveViews().catch") &&
    dashboardJs.includes("refreshChart: false"),
  "Dashboard minute refresh must reuse cached state without rebuilding the chart.",
);
assert(
  /async function refreshDashboardTimeSensitiveViews\(\) \{\s*if \(!currentHistory\) \{\s*await loadDashboard\(\);\s*return;\s*\}/s.test(
    dashboardJs,
  ),
  "Dashboard minute refresh must retry a full load until cached state exists.",
);
assert(
  !/window\.setInterval\(\(\) => {\s*loadDashboard\(/s.test(dashboardJs),
  "Dashboard minute refresh must not reread full storage state.",
);
assert(
  !/runtime\.sendMessage\(\s*\{\s*type:\s*"status"\s*\}/.test(dashboardJs) &&
    backgroundJs.includes("PacePetsRefreshControl.isRefreshNowMessage"),
  "Dashboard status updates must use stored refresh status while manual checks use the refresh-now message contract.",
);
assert(
  dashboardJs.includes("REFRESH_CONTROL.MANUAL_REFRESH_COOLDOWN_MS") &&
    dashboardJs.includes("button.hidden = !manualRefreshAvailable") &&
    dashboardJs.includes("manualRefreshFeedback") &&
    dashboardJs.includes("showManualRefreshFailure(response?.refreshStatus)") &&
    dashboardJs.includes('[STATUS_TEXT.checking]: "Checking..."') &&
    backgroundJs.includes(
      "PacePetsRefreshControl.MANUAL_REFRESH_COOLDOWN_MS",
    ) &&
    backgroundJs.includes("runScheduledRefresh()") &&
    backgroundJs.includes("runManualRefresh"),
  "Manual refresh must be conditional, cooldown guarded, and routed through the scheduled refresh path.",
);
assert(
  dashboardJs.includes('[STATUS_TEXT.signInNotFound]: "Sign-in needed"') &&
    !dashboardJs.includes('[STATUS_TEXT.signInNotFound]: "Check failed"') &&
    dashboardJs.includes(
      "Latest check failed because ChatGPT sign-in was not found.",
    ) &&
    dashboardJs.includes(
      "const checkedAt = refreshStatus?.refreshedAt || latest?.collectedAt;",
    ),
  "Dashboard status copy must keep auth failures actionable and checked time tied to the latest refresh attempt.",
);
assert(
  backgroundJs.includes("let scheduledRefreshPromise = null;") &&
    /function runScheduledRefresh\(\) \{\s*if \(scheduledRefreshPromise\) \{\s*return scheduledRefreshPromise;\s*\}/s.test(
      backgroundJs,
    ) &&
    /finally\(\(\) => \{\s*scheduledRefreshPromise = null;/s.test(backgroundJs),
  "Background alarm refreshes must be guarded against same-worker overlap.",
);
assert(
  !backgroundJs.includes("badgePreviewRestoreTimer") &&
    backgroundJs.includes(
      "PacePetsPreviewControl.BADGE_PREVIEW_RESTORE_ALARM",
    ) &&
    backgroundJs.includes(
      "PacePetsPreviewControl.BADGE_PREVIEW_EXPIRES_STORAGE_KEY",
    ) &&
    backgroundJs.includes("restoreExpiredPaceBadgePreview") &&
    backgroundJs.includes("chrome.alarms.create(alarmName, alarmInfo, done)"),
  "Toolbar badge previews must use persistent alarm-backed restore state.",
);
assert(
  !/candidateDurationMatches|candidatePathConflicts/.test(
    `${usageJs}\n${usageIntegrationAdaptersJs}`,
  ) &&
    usageJs.includes("windowPathMatches(candidate, adapter)") &&
    usageIntegrationAdaptersJs.includes("candidatePathPattern:"),
  "Usage normalization must keep fallback WHAM discovery path-matched, not exact-duration based.",
);
assert(
  usageIntegrationAdaptersJs.includes('["subscription", "secondary"]') &&
    usageIntegrationAdaptersJs.includes('["subscription", "primary"]') &&
    usageIntegrationAdaptersJs.includes('["rate_limit", "secondary"]') &&
    usageIntegrationAdaptersJs.includes('["rate_limit", "primary"]') &&
    usageIntegrationAdaptersJs.includes('["rate_limit", "secondary_window"]') &&
    usageIntegrationAdaptersJs.includes('["rate_limit", "primary_window"]') &&
    usageIntegrationAdaptersJs.includes('["usage", "windows", "weekly"]') &&
    usageIntegrationAdaptersJs.includes('["usage", "windows", "five_hour"]') &&
    usageIntegrationAdaptersJs.includes('"remainingPercent"') &&
    usageIntegrationAdaptersJs.includes('"resetAfterSeconds"') &&
    usageIntegrationAdaptersJs.includes('"limit_window_sec"'),
  "WHAM adapter must declare canonical and live-compatible paths and field aliases.",
);

const sampleUsage = readJson("data/usage.sample.json");
await import(
  pathToFileURL(path.join(projectRoot, "collector/extension/usage-windows.js"))
);
await import(
  pathToFileURL(path.join(projectRoot, "collector/extension/usage-values.js"))
);
const usageWindows = globalThis.CodexUsageWindows;
assert(
  typeof sampleUsage.windows?.weekly?.remainingPercent === "number",
  "Sample usage must include windows.weekly.remainingPercent.",
);
assert(
  sampleUsage.windows?.weekly?.windowMinutes ===
    usageWindows.WINDOW_SPECS.weekly.durationMinutes,
  "Sample usage must use the weekly window.",
);
assert(
  typeof sampleUsage.windows?.fiveHour?.remainingPercent === "number",
  "Sample usage must include windows.fiveHour.remainingPercent.",
);
assert(
  sampleUsage.windows?.fiveHour?.windowMinutes ===
    usageWindows.WINDOW_SPECS.fiveHour.durationMinutes,
  "Sample usage must use the five-hour window.",
);

await import(
  pathToFileURL(
    path.join(projectRoot, "collector/extension/usage-integration-adapters.js"),
  )
);
await import(
  pathToFileURL(path.join(projectRoot, "collector/extension/usage.js"))
);
const normalizedPrimaryUsage = globalThis.CodexWeeklyUsage.normalizeWhamUsage({
  subscription: {
    primary: {
      remaining_percent: 42,
      reset_after_seconds: 60 * 60,
    },
  },
});
assert(
  !normalizedPrimaryUsage.windows.weekly,
  "Durationless primary usage must not populate the weekly window.",
);
assert(
  normalizedPrimaryUsage.windows.fiveHour?.windowMinutes ===
    usageWindows.WINDOW_SPECS.fiveHour.durationMinutes,
  "Durationless primary usage must populate only the five-hour window.",
);

console.log("Smoke checks passed.");

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { releaseExtensionFilesFromContracts } from "./extension-check-required-files.mjs";
import { createRuntimeDependencyContract } from "./runtime-dependency-contract.mjs";
import { assertStorageSchemaDocumentCurrent } from "./storage-schema-doc.mjs";
import { checkDashboardSmoke } from "./smoke-check-dashboard.mjs";

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
const runtimeDependencies = createRuntimeDependencyContract(runtimeManifest);
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
await import(
  pathToFileURL(path.join(projectRoot, "collector/extension/usage-windows.js"))
);
await import(
  pathToFileURL(
    path.join(projectRoot, "collector/extension/usage-integration-adapters.js"),
  )
);
await import(
  pathToFileURL(
    path.join(projectRoot, "collector/extension/usage-providers.js"),
  )
);
const usageProviders = globalThis.CodexUsageProviders;
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
await import(
  pathToFileURL(path.join(projectRoot, "collector/extension/audio-clips.js"))
);
const audioClips = globalThis.PacePetsAudioClips;
assert(audioClips, "Audio clip manifest is not wired.");
await import(
  pathToFileURL(
    path.join(projectRoot, "collector/extension/dashboard-dom-contract.js"),
  )
);
const dashboardDomContract = globalThis.PacePetsDashboardDom;
assert(dashboardDomContract, "Dashboard DOM contract is not wired.");

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
  manifest.optional_host_permissions?.includes(
    usageProviders.DEFAULT_USAGE_PROVIDER.hostPermission,
  ),
  "Extension optional host permission is not aligned with the usage provider.",
);
assert(
  !manifest.action?.default_popup,
  "Extension must not use a popup action.",
);
assert(
  !manifest.content_scripts,
  "Extension must not inject localhost content scripts.",
);
const dashboardHtml = readText("collector/extension/dashboard.html");
const releaseExtensionFiles = releaseExtensionFilesFromContracts({
  audioClips,
  dashboardHtml,
  manifest,
  runtimeManifest,
  themeAssets,
});
for (const releaseExtensionFile of releaseExtensionFiles) {
  assertFile(`collector/extension/${releaseExtensionFile}`);
}
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

const backgroundJs = [
  "background.js",
  "background-context-menu.js",
  "background-usage-source.js",
  "background-refresh-runner.js",
]
  .map((file) => readText(`collector/extension/${file}`))
  .join("\n");
const dashboardSource = [
  "dashboard-preferences.js",
  "dashboard.js",
  "dashboard-app-core.js",
  "dashboard-shell-controls.js",
  "dashboard-history-methods.js",
  "dashboard-event-methods.js",
]
  .map((file) => readText(`collector/extension/${file}`))
  .join("\n");
const dashboardTemplateSource = ["dashboard-info-template.js"]
  .map((file) => readText(`collector/extension/${file}`))
  .join("\n");
const dashboardStatusControllerJs = readText(
  "collector/extension/dashboard-status-controller.js",
);
const dashboardStatusLogicJs = readText(
  "collector/extension/dashboard-status-logic.js",
);
const devFlagsJs = readText("collector/extension/dev-flags.js");
const usageJs = readText("collector/extension/usage.js");
const usageIntegrationAdaptersJs = readText(
  "collector/extension/usage-integration-adapters.js",
);
const extensionDocsHtml = readText("docs/extension.html");
const publicDocsSource = [
  "README.md",
  "PRIVACY.md",
  "SECURITY.md",
  "collector/extension/README.md",
  "docs/index.html",
  "docs/extension.html",
]
  .map((file) => readText(file))
  .join("\n");
await assertStorageSchemaDocumentCurrent();
checkDashboardSmoke({
  assert,
  assertIncludes,
  backgroundSource: backgroundJs,
  dashboardHtml,
  dashboardTemplateSource,
  dashboardDomContract,
  dashboardSource,
  dashboardStatusLogicSource: dashboardStatusLogicJs,
  dashboardStatusSource: dashboardStatusControllerJs,
  extensionDocsHtml,
  productMetadata,
  runtimeDependencies,
  runtimeManifest,
  themeAssets,
});
if (!manifest.permissions?.includes("activeTab")) {
  assert(
    !/activeTab/.test(publicDocsSource),
    "Public docs must not mention activeTab when the manifest does not request it.",
  );
}
assert(
  !/(?:briefly capture|dashboard capture|visible Pace\s+Pets dashboard in memory)/i.test(
    publicDocsSource,
  ),
  "Public docs must not describe the Singularity transition as dashboard capture.",
);
assert(
  dashboardStatusControllerJs.includes(
    "REFRESH_CONTROL.MANUAL_REFRESH_COOLDOWN_MS",
  ) &&
    dashboardStatusControllerJs.includes(
      "REFRESH_CONTROL.responseCooldownUntilMs(response)",
    ) &&
    dashboardStatusControllerJs.includes(
      "REFRESH_CONTROL.manualRefreshResponseFailed(response)",
    ) &&
    dashboardStatusControllerJs.includes(
      "REFRESH_CONTROL.refreshNowMessage()",
    ) &&
    dashboardStatusControllerJs.includes(
      "button.hidden = !this.manualRefreshAvailable",
    ) &&
    dashboardStatusControllerJs.includes("manualRefreshFeedback") &&
    dashboardStatusControllerJs.includes(
      "showManualRefreshFailure(response?.refreshStatus, response)",
    ) &&
    dashboardStatusControllerJs.includes(
      "const disabled = this.manualRefreshInFlight || remainingMs > 0;",
    ) &&
    dashboardStatusControllerJs.includes(
      'button.setAttribute("aria-disabled", String(disabled));',
    ) &&
    backgroundJs.includes("REFRESH_CONTROL.MANUAL_REFRESH_COOLDOWN_MS") &&
    backgroundJs.includes("REFRESH_CONTROL.manualRefreshCooldownResponse") &&
    backgroundJs.includes("REFRESH_CONTROL.refreshNowResponse") &&
    backgroundJs.includes("PacePetsRefreshControl.refreshErrorResponse") &&
    backgroundJs.includes("runScheduledRefresh()") &&
    backgroundJs.includes("runManualRefresh"),
  "Manual refresh must be conditional, cooldown guarded, and routed through the scheduled refresh path.",
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
    !backgroundJs.includes("BADGE_PREVIEW_RESTORE_ALARM") &&
    !backgroundJs.includes("BADGE_PREVIEW_EXPIRES_STORAGE_KEY") &&
    !backgroundJs.includes("restoreExpiredPaceBadgePreview") &&
    !devFlagsJs.includes("pacePets.restoreBadge"),
  "Dashboard must not ship temporary toolbar badge preview restore state.",
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

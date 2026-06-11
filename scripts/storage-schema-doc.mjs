import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const storageSchemaPath = path.join(
  projectRoot,
  "docs",
  "reference",
  "storage-schema.md",
);
const generatedStart = "<!-- storage-schema:generated:start -->";
const generatedEnd = "<!-- storage-schema:generated:end -->";
const fixtureNow = "2026-05-25T12:00:00.000Z";

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(projectRoot, relativePath), "utf8"),
  );
}

function fencedJson(value) {
  return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
}

function supportedWindowList(usageWindows) {
  return usageWindows.WINDOW_KEYS.map((windowKey) => {
    const spec = usageWindows.WINDOW_SPECS[windowKey];
    return `- \`${spec.key}\`: ${spec.durationMinutes} minutes, \`${spec.badge}\` badge, ${spec.titleMeta} title, ${spec.chartSampleLabel} chart label`;
  }).join("\n");
}

async function loadStorageContracts() {
  const packageJson = readJson("package.json");
  globalThis.chrome ||= {
    runtime: {
      getManifest: () => ({ version: packageJson.version }),
      lastError: null,
    },
    storage: {
      local: {},
    },
  };

  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/integration-config.js"),
    )
  );
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/usage-windows.js"),
    )
  );
  await import(
    pathToFileURL(path.join(projectRoot, "collector/extension/usage-values.js"))
  );
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/persisted-text.js"),
    )
  );
  await import(
    pathToFileURL(
      path.join(
        projectRoot,
        "collector/extension/usage-integration-adapters.js",
      ),
    )
  );
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/usage-providers.js"),
    )
  );
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/refresh-status.js"),
    )
  );
  await import(
    pathToFileURL(
      path.join(
        projectRoot,
        "collector/extension/themes/default/asset-manifest.js",
      ),
    )
  );
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/pace-state-art.js"),
    )
  );
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/pace-state-data.js"),
    )
  );
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/developer-options.js"),
    )
  );
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/dashboard-preferences.js"),
    )
  );
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/storage-adapter.js"),
    )
  );
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/history-store.js"),
    )
  );

  return {
    dashboardPreferences: globalThis.PacePetsDashboardPreferences,
    developerOptions: globalThis.PacePetsDeveloperOptions,
    historyStore: globalThis.CodexUsageHistory,
    persistedText: globalThis.CodexPersistedText,
    usageWindows: globalThis.CodexUsageWindows,
    usageProviders: globalThis.CodexUsageProviders,
  };
}

function historyExample({
  historyStore,
  packageJson,
  usageSample,
  usageProviders,
}) {
  const originalNow = Date.now;
  Date.now = () => Date.parse(fixtureNow);
  try {
    return historyStore.normalizeHistory({
      samples: [
        {
          id: usageSample.updatedAt,
          collectedAt: usageSample.updatedAt,
          source:
            usageProviders.DEFAULT_USAGE_PROVIDER.sourceMarkers.background,
          collectorVersion: packageJson.version,
          windows: usageSample.windows,
        },
      ],
    });
  } finally {
    Date.now = originalNow;
  }
}

function refreshStatusExample({ historyStore, usageSample }) {
  return historyStore.normalizeRefreshStatus({
    ok: true,
    message: "Usage unchanged; history already current.",
    authFailure: false,
    statusCode: null,
    refreshedAt: new Date(
      Date.parse(usageSample.updatedAt) + 5 * 60 * 1000,
    ).toISOString(),
    sampleCount: 1,
    stored: false,
  });
}

function developerOptionsExample({ developerOptions }) {
  return developerOptions.storedDeveloperOptionsValue({
    criticalBadgeWindow: true,
    forcedPaceStateKey: "perfectZero",
    manualRefreshLeadWindow: true,
    maxPoolFill: true,
  });
}

export async function storageSchemaGeneratedMarkdown() {
  const contracts = await loadStorageContracts();
  const packageJson = readJson("package.json");
  const usageSample = readJson("data/usage.sample.json");
  const {
    dashboardPreferences,
    developerOptions,
    historyStore,
    persistedText,
    usageWindows,
  } = contracts;

  const history = historyExample({ ...contracts, packageJson, usageSample });
  const refreshStatus = refreshStatusExample({ historyStore, usageSample });
  const developerOptionsStorage = developerOptionsExample(contracts);

  return [
    generatedStart,
    "",
    "## Generated Reference",
    "",
    "_Generated by `node scripts/storage-schema-doc.mjs --write` from `data/usage.sample.json`, `collector/extension/usage-windows.js`, `collector/extension/usage-values.js`, `collector/extension/persisted-text.js`, `collector/extension/usage-providers.js`, `collector/extension/refresh-status.js`, `collector/extension/pace-state-data.js`, `collector/extension/developer-options.js`, `collector/extension/dashboard-preferences.js`, and `collector/extension/history-store.js`._",
    "",
    "### History Shape",
    "",
    fencedJson(history),
    "",
    "### Refresh Status Shape",
    "",
    fencedJson(refreshStatus),
    "",
    "### Developer Options Shape",
    "",
    fencedJson(developerOptionsStorage),
    "",
    "### Runtime Constants",
    "",
    `- Storage key: \`${historyStore.HISTORY_STORAGE_KEY}\``,
    `- Refresh status key: \`${historyStore.REFRESH_STATUS_STORAGE_KEY}\``,
    `- History version: \`${historyStore.HISTORY_VERSION}\``,
    `- Retention: \`${historyStore.RETENTION_DAYS}\` days`,
    `- Sample cap: \`${historyStore.MAX_SAMPLES}\` samples`,
    `- Plateau sample interval: \`${historyStore.PLATEAU_SAMPLE_INTERVAL_MINUTES}\` minutes`,
    `- Badge-window preference key: \`${usageWindows.BADGE_WINDOW_STORAGE_KEY}\``,
    `- Default badge window: \`${usageWindows.DEFAULT_WINDOW_KEY}\``,
    `- Supported badge-window values: ${usageWindows.WINDOW_KEYS.map((key) => `\`${key}\``).join(", ")}`,
    `- Developer-options key: \`${developerOptions.STORAGE_KEY}\``,
    `- Supported forced pace-state values: ${developerOptions.FORCEABLE_PACE_STATE_KEYS.map((key) => `\`${key}\``).join(", ")}`,
    `- Developer feature preview fields: ${developerOptions.FEATURE_PREVIEW_OPTIONS.map((option) => `\`${option.key}\``).join(", ")}`,
    `- Dashboard window session key: \`${dashboardPreferences.DASHBOARD_WINDOW_SESSION_KEY}\``,
    `- Dashboard theme preference key: \`${dashboardPreferences.THEME_STORAGE_KEY}\``,
    `- Supported dashboard theme values: ${dashboardPreferences.THEME_VALUES.map((theme) => `\`${theme}\``).join(", ")}`,
    `- Dashboard local preference scopes: ${dashboardPreferences.LOCAL_PREFERENCES.map((preference) => `\`${preference.key}\` in \`${preference.scope}\``).join(", ")}`,
    `- Safe persisted text cap: \`${persistedText.MAX_SAFE_TEXT_LENGTH}\` characters`,
    "",
    "### Supported Usage Windows",
    "",
    supportedWindowList(usageWindows),
    "",
    generatedEnd,
  ].join("\n");
}

function replaceGeneratedSection(documentText, generatedMarkdown) {
  const startIndex = documentText.indexOf(generatedStart);
  const endIndex = documentText.indexOf(generatedEnd);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("Storage schema doc is missing generated section markers.");
  }

  return [
    documentText.slice(0, startIndex).trimEnd(),
    generatedMarkdown,
    documentText.slice(endIndex + generatedEnd.length).trimStart(),
  ].join("\n\n");
}

export async function expectedStorageSchemaDocument() {
  const documentText = fs.readFileSync(storageSchemaPath, "utf8");
  return replaceGeneratedSection(
    documentText,
    await storageSchemaGeneratedMarkdown(),
  );
}

export async function writeStorageSchemaDocument() {
  fs.writeFileSync(storageSchemaPath, await expectedStorageSchemaDocument());
}

export async function assertStorageSchemaDocumentCurrent() {
  const current = fs.readFileSync(storageSchemaPath, "utf8");
  const expected = await expectedStorageSchemaDocument();
  if (current !== expected) {
    throw new Error(
      "Storage schema generated section is stale. Run `node scripts/storage-schema-doc.mjs --write`.",
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--write")) {
    await writeStorageSchemaDocument();
  } else if (process.argv.includes("--check")) {
    await assertStorageSchemaDocumentCurrent();
  } else {
    throw new Error(
      "Usage: node scripts/storage-schema-doc.mjs --check|--write",
    );
  }
}

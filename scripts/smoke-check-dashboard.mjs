const requiredDashboardIds = Object.freeze([
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
]);

function assertRuntimeOrder(assert, sources, orderedPairs) {
  for (const [before, after, message] of orderedPairs) {
    assert(
      sources.indexOf(before) < sources.indexOf(after),
      message || `Runtime manifest must load ${before} before ${after}.`,
    );
  }
}

function assertDashboardHtml({
  assert,
  assertIncludes,
  dashboardHtml,
  extensionDocsHtml,
  productMetadata,
  themeAssets,
}) {
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
  for (const requiredId of requiredDashboardIds) {
    assertIncludes(
      dashboardHtml,
      `id="${requiredId}"`,
      `dashboard id ${requiredId}`,
    );
  }
  assert(
    !dashboardHtml.includes("dashboard-rail.css") &&
      !dashboardHtml.includes("pace-state-stack") &&
      !/\bstate-chip\b/.test(dashboardHtml),
    "Dashboard must not render the retired pace state preview rail.",
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
}

function assertRuntimeManifest({ assert, runtimeManifest }) {
  for (const src of runtimeManifest.DASHBOARD_ONLY_SCRIPT_SOURCES) {
    assert(
      runtimeManifest.DASHBOARD_SCRIPT_SOURCES.includes(src),
      `Dashboard runtime manifest must include ${src}.`,
    );
  }
  assert(
    runtimeManifest.OPTIONAL_DASHBOARD_SCRIPT_SOURCES?.includes(
      "./vendor/chart.umd.min.js",
    ),
    "Chart.js must be optional so the dashboard can still load without charts.",
  );
  assertRuntimeOrder(assert, runtimeManifest.DASHBOARD_SCRIPT_SOURCES, [
    ["./product-metadata.js", "./dashboard.js"],
    ["./integration-config.js", "./usage.js"],
    ["./usage-windows.js", "./usage.js"],
    ["./usage-values.js", "./usage.js"],
    ["./usage-values.js", "./history-store.js"],
    ["./refresh-status.js", "./history-store.js"],
    ["./usage-values.js", "./pace-logic.js"],
    ["./themes/default/asset-manifest.js", "./pace-logic.js"],
    ["./pace-state-art.js", "./pace-state-data.js"],
    ["./pace-state-data.js", "./developer-options.js"],
    ["./perfect-zero-space-draw.js", "./perfect-zero-space-scene.js"],
    ["./dashboard-status-logic.js", "./dashboard-status-controller.js"],
    ["./dashboard-pace-controller.js", "./dashboard-app-core.js"],
    ["./dashboard-app-core.js", "./dashboard.js"],
  ]);
  assertRuntimeOrder(assert, runtimeManifest.BACKGROUND_SCRIPT_SOURCES, [
    ["product-metadata.js", "background-logic.js"],
    ["pace-state-art.js", "pace-state-data.js"],
    ["pace-state-data.js", "developer-options.js"],
    ["pace-state-data.js", "pace-logic.js"],
    ["background-logic.js", "background-usage-source.js"],
  ]);
}

function assertDashboardSource({
  assert,
  backgroundSource,
  dashboardSource,
  dashboardStatusSource,
  dashboardStatusLogicSource,
}) {
  assert(
    !/\.\/themes\/default\/pace-icons\//.test(dashboardSource),
    "Dashboard script must read pace icon paths from shared pace-state metadata.",
  );
  assert(
    !/localStorage\.(?:getItem|setItem)\(\s*this\.WINDOW_STORAGE_KEY\b/.test(
      dashboardSource,
    ),
    "Selected usage window preference must use chrome.storage.local, not localStorage.",
  );
  assert(
    dashboardSource.includes("this.EXTENSION_STORAGE.getLocal(") &&
      dashboardSource.includes("this.WINDOW_STORAGE_KEY"),
    "Dashboard must read selected usage window preference through the storage adapter.",
  );
  assert(
    dashboardSource.includes("this.currentHistory = null;") &&
      dashboardSource.includes("this.currentRefreshStatus = null;"),
    "Dashboard must cache the last loaded state for lightweight time-sensitive refreshes.",
  );
  assert(
    dashboardSource.includes("refreshDashboardTimeSensitiveViews().catch") &&
      dashboardSource.includes("refreshChart: false"),
    "Dashboard minute refresh must reuse cached state without rebuilding the chart.",
  );
  assert(
    !/window\.setInterval\(\(\) => {\s*this\.loadDashboard\(/s.test(
      dashboardSource,
    ),
    "Dashboard minute refresh must not reread full storage state.",
  );
  assert(
    !/runtime\.sendMessage\(\s*\{\s*type:\s*"status"\s*\}/.test(
      `${dashboardSource}\n${dashboardStatusSource}`,
    ) &&
      backgroundSource.includes("PacePetsRefreshControl.isRefreshNowMessage"),
    "Dashboard status updates must use stored refresh status while manual checks use the refresh-now message contract.",
  );
  assert(
    dashboardStatusLogicSource.includes(
      '[STATUS_TEXT.signInNotFound]: "Sign-in needed"',
    ) &&
      dashboardStatusLogicSource.includes(
        "Latest check failed because ChatGPT sign-in was not found.",
      ) &&
      dashboardSource.includes(
        "const checkedAt = refreshStatus?.refreshedAt || latest?.collectedAt;",
      ),
    "Dashboard status copy must keep auth failures actionable and checked time tied to the latest refresh attempt.",
  );
}

export function checkDashboardSmoke(context) {
  const { assert } = context;
  assertDashboardHtml(context);
  assert(
    /<script\b[^>]*src="\.\/runtime-manifest\.js"[^>]*><\/script>/s.test(
      context.dashboardHtml,
    ),
    "Missing runtime manifest script link.",
  );
  assert(
    /<script\b[^>]*src="\.\/dashboard-loader\.js"[^>]*><\/script>/s.test(
      context.dashboardHtml,
    ),
    "Missing dashboard loader script link.",
  );
  assert(
    context.dashboardHtml.indexOf('src="./runtime-manifest.js"') <
      context.dashboardHtml.indexOf('src="./dashboard-loader.js"'),
    "Dashboard must load the runtime manifest before the dashboard loader.",
  );
  assertRuntimeManifest(context);
  assertDashboardSource(context);
}

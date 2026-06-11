function assertRuntimeOrder(assert, sources, orderedPairs, label) {
  assert(Array.isArray(orderedPairs), `${label} edges must be an array.`);
  for (const [before, after] of orderedPairs) {
    assert(
      sources.indexOf(before) < sources.indexOf(after),
      `${label} must load ${before} before ${after}.`,
    );
  }
}

function assertDashboardHtml({
  assert,
  assertIncludes,
  dashboardHtml,
  dashboardDomContract,
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
  assert(
    Array.isArray(dashboardDomContract?.REQUIRED_DASHBOARD_ELEMENT_IDS),
    "Dashboard DOM required ID contract must be an array.",
  );
  for (const requiredId of dashboardDomContract.REQUIRED_DASHBOARD_ELEMENT_IDS) {
    assertIncludes(
      dashboardHtml,
      `id="${requiredId}"`,
      `dashboard id ${requiredId}`,
    );
  }
  assert(
    dashboardHtml.includes("dashboard-rail.css") &&
      dashboardHtml.includes("pace-state-stack") &&
      dashboardHtml.includes('class="state-rail"'),
    "Dashboard must render the passive pace state rail.",
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
  assertRuntimeOrder(
    assert,
    runtimeManifest.DASHBOARD_SCRIPT_SOURCES,
    runtimeManifest.DASHBOARD_RUNTIME_DEPENDENCY_EDGES,
    "Dashboard runtime manifest",
  );
  assertRuntimeOrder(
    assert,
    runtimeManifest.BACKGROUND_SCRIPT_SOURCES,
    runtimeManifest.BACKGROUND_RUNTIME_DEPENDENCY_EDGES,
    "Background runtime manifest",
  );
}

function assertDashboardSourceUsesDomContract({ assert, dashboardSource }) {
  assert(
    dashboardSource.includes("PacePetsDashboardDom") &&
      dashboardSource.includes("DASHBOARD_DOM.collectElements(document)"),
    "Dashboard must collect elements through the shared DOM contract.",
  );
}

function assertDashboardPreferenceSource({ assert, dashboardSource }) {
  assert(
    !/localStorage\.(?:getItem|setItem)\(\s*this\.(?:BADGE_)?WINDOW_STORAGE_KEY\b/.test(
      dashboardSource,
    ),
    "Dashboard window selection must not use localStorage.",
  );
  assert(
    dashboardSource.includes("readDashboardWindowPreference(") &&
      dashboardSource.includes("storeDashboardWindowPreference(") &&
      dashboardSource.includes("DASHBOARD_WINDOW_SESSION_KEY"),
    "Dashboard selected window must be scoped through the dashboard preferences contract.",
  );
  assert(
    dashboardSource.includes("readThemePreference(") &&
      dashboardSource.includes("storeThemePreference(") &&
      dashboardSource.includes("THEME_STORAGE_KEY"),
    "Dashboard theme preference must be scoped through the dashboard preferences contract.",
  );
}

function assertDashboardCacheSource({ assert, dashboardSource }) {
  assert(
    dashboardSource.includes("this.EXTENSION_STORAGE.getLocal(") &&
      dashboardSource.includes("this.BADGE_WINDOW_STORAGE_KEY"),
    "New dashboard pages must seed selected window from the badge preference through the storage adapter.",
  );
  assert(
    !/hasAnyChange\(changes,\s*\[[\s\S]*?this\.BADGE_WINDOW_STORAGE_KEY[\s\S]*?\]\s*\)/.test(
      dashboardSource,
    ),
    "Open dashboard pages must not resync their selected window from badge preference changes.",
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
}

function assertDashboardStatusSource({
  assert,
  backgroundSource,
  dashboardSource,
  dashboardStatusSource,
  dashboardStatusLogicSource,
}) {
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
  assert(
    !dashboardSource.includes("stateChipFromEvent") &&
      !dashboardSource.includes("showPacePreview"),
    "Dashboard rail must stay passive; developer controls own forced state previews.",
  );
}

function assertDashboardSource(context) {
  const { assert, dashboardSource } = context;
  assert(
    !/\.\/themes\/default\/pace-icons\//.test(dashboardSource),
    "Dashboard script must read pace icon paths from shared pace-state metadata.",
  );
  assertDashboardSourceUsesDomContract(context);
  assertDashboardPreferenceSource(context);
  assertDashboardCacheSource(context);
  assertDashboardStatusSource(context);
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

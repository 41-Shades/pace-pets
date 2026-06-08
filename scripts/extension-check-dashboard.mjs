const expectedDashboardStylesheetSources = Object.freeze([
  "./dashboard.css",
  "./dashboard-rail.css",
  "./dashboard-header.css",
  "./dashboard-overlays.css",
  "./dashboard-animations.css",
  "./dashboard-brake-debris.css",
  "./dashboard-pace-card.css",
  "./dashboard-train-roll.css",
  "./dashboard-train-smoke.css",
  "./dashboard-train-smoke-puffs.css",
  "./dashboard-pace-states.css",
  "./dashboard-cards.css",
  "./dashboard-early-reset-stages.css",
  "./dashboard-reset.css",
  "./dashboard-responsive.css",
  "./dashboard-perfect-zero.css",
]);

function assertDashboardStylesheets({
  assert,
  assertExtensionFile,
  dashboardStylesheetSources,
  extensionPathFromExtensionPageUrl,
}) {
  assert(
    dashboardStylesheetSources.length ===
      expectedDashboardStylesheetSources.length &&
      dashboardStylesheetSources.every(
        (src, index) => src === expectedDashboardStylesheetSources[index],
      ),
    `Dashboard stylesheet links must be exactly: ${expectedDashboardStylesheetSources.join(", ")}.`,
  );
  for (const href of dashboardStylesheetSources) {
    assert(href, "Dashboard stylesheet href is required.");
    assertExtensionFile(
      extensionPathFromExtensionPageUrl(href, "Dashboard stylesheet"),
    );
  }
}

function assertDashboardBootstrap({ assert, dashboardScriptSources }) {
  assert(
    dashboardScriptSources.length === 2 &&
      dashboardScriptSources[0] === "./runtime-manifest.js" &&
      dashboardScriptSources[1] === "./dashboard-loader.js",
    "Dashboard HTML must bootstrap only the runtime manifest and dashboard loader.",
  );
}

function assertDashboardProductMetadata({
  assert,
  dashboardHtml,
  productMetadata,
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
}

function assertRuntimeOrder({ assertScriptBefore, dashboardRuntimeScripts }) {
  const orderedPairs = [
    ["./product-metadata.js", "./dashboard.js"],
    ["./integration-config.js", "./usage.js"],
    ["./usage-windows.js", "./usage.js"],
    ["./usage-values.js", "./usage.js"],
    ["./usage-values.js", "./history-store.js"],
    ["./refresh-status.js", "./history-store.js"],
    ["./usage-values.js", "./pace-logic.js"],
    ["./storage-adapter.js", "./usage.js"],
    ["./usage-integration-adapters.js", "./usage.js"],
    ["./themes/default/asset-manifest.js", "./pace-logic.js"],
    ["./developer-options.js", "./dashboard.js"],
    ["./integration-config.js", "./dashboard-chart-data.js"],
    ["./pace-logic.js", "./dashboard-chart-data.js"],
    ["./dashboard-chart-data.js", "./dashboard-chart.js"],
    ["./pace-logic.js", "./dashboard-chart.js"],
    ["./perfect-zero-space-draw.js", "./perfect-zero-space-scene.js"],
    ["./dashboard-status-logic.js", "./dashboard-status-controller.js"],
    ["./dashboard-pace-core.js", "./dashboard-pace-controller.js"],
    ["./dashboard-pace-controller.js", "./dashboard-app-core.js"],
    ["./dashboard-app-core.js", "./dashboard.js"],
    ["./dashboard-history-methods.js", "./dashboard.js"],
    ["./dashboard-event-methods.js", "./dashboard.js"],
  ];
  for (const [before, after] of orderedPairs) {
    assertScriptBefore(
      dashboardRuntimeScripts,
      before,
      after,
      "Dashboard runtime manifest",
    );
  }
}

function assertDashboardLinks({ assert, anchorTags, attributeValue }) {
  for (const anchorTag of anchorTags) {
    const href = attributeValue(anchorTag, "href");
    if (!/^(?:https?:)?\/\//i.test(href || "")) {
      continue;
    }

    const rel = attributeValue(anchorTag, "rel") || "";
    assert(
      attributeValue(anchorTag, "target") === "_blank" &&
        /\bnoopener\b/i.test(rel) &&
        /\bnoreferrer\b/i.test(rel),
      `External dashboard links must open safely: ${href}`,
    );
  }
}

function assertDashboardScriptTags({
  assert,
  assertExtensionFile,
  attributeValue,
  extensionPathFromDashboardScript,
  scriptTags,
}) {
  assert(scriptTags.length > 0, "Dashboard must load local script assets.");
  for (const scriptTag of scriptTags) {
    const src = attributeValue(scriptTag, "src");
    assert(src, "Dashboard inline scripts are not allowed.");
    assert(
      src.startsWith("./") && !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src),
      `Dashboard script source must be extension-local: ${src}`,
    );
    assert(
      scriptTag.replace(/<script\b[^>]*>|<\/script>/gi, "").trim() === "",
      "Dashboard script tags must not contain inline code.",
    );
    assertExtensionFile(extensionPathFromDashboardScript(src));
  }
}

function assertDashboardCss({
  assert,
  dashboardStylesheetSources,
  extensionPathFromExtensionPageUrl,
  readExtensionText,
}) {
  for (const href of dashboardStylesheetSources) {
    const stylesheetPath = extensionPathFromExtensionPageUrl(
      href,
      "Dashboard stylesheet",
    );
    const stylesheetText = readExtensionText(stylesheetPath);
    assert(!/@import\b/i.test(stylesheetText), `Dashboard CSS must not use imports: ${href}`);
    assert(
      !/url\(\s*["']?(?:https?:|\/\/)/i.test(stylesheetText),
      `Dashboard CSS must not load remote resources: ${href}`,
    );
  }
}

export function checkDashboardAssets(context) {
  const {
    assert,
    attributeValue,
    dashboardHtml,
    runtimeManifest,
  } = context;
  const linkTags = dashboardHtml.match(/<link\b[^>]*>/gi) || [];
  const stylesheetTags = linkTags.filter((linkTag) =>
    /\bstylesheet\b/i.test(attributeValue(linkTag, "rel") || ""),
  );
  const dashboardStylesheetSources = stylesheetTags.map((linkTag) =>
    attributeValue(linkTag, "href"),
  );
  const scriptTags = dashboardHtml.match(/<script\b[\s\S]*?<\/script>/gi) || [];
  assert(
    !/<(?!a\b)[^>]+\b(?:src|href)=["'](?:https?:)?\/\//i.test(dashboardHtml),
    "Dashboard HTML must not load remote resources.",
  );
  assertDashboardLinks({
    ...context,
    anchorTags: dashboardHtml.match(/<a\b[\s\S]*?<\/a>/gi) || [],
  });
  assertDashboardScriptTags({ ...context, scriptTags });
  assertDashboardStylesheets({ ...context, dashboardStylesheetSources });
  assertDashboardBootstrap({
    ...context,
    dashboardScriptSources: scriptTags.map((scriptTag) =>
      attributeValue(scriptTag, "src"),
    ),
  });
  assertDashboardProductMetadata(context);
  const dashboardRuntimeScripts = runtimeManifest.DASHBOARD_SCRIPT_SOURCES;
  assert(
    Array.isArray(dashboardRuntimeScripts),
    "Dashboard script sources must be an array.",
  );
  const optionalDashboardRuntimeScripts =
    runtimeManifest.OPTIONAL_DASHBOARD_SCRIPT_SOURCES;
  assert(
    Array.isArray(optionalDashboardRuntimeScripts),
    "Optional dashboard script sources must be an array.",
  );
  assert(
    optionalDashboardRuntimeScripts.includes("./vendor/chart.umd.min.js"),
    "Chart.js must be declared as an optional dashboard script.",
  );
  assertRuntimeOrder({ ...context, dashboardRuntimeScripts });
  for (const src of dashboardRuntimeScripts) {
    context.assertExtensionFile(context.extensionPathFromDashboardScript(src));
  }
  for (const src of optionalDashboardRuntimeScripts) {
    assert(
      dashboardRuntimeScripts.includes(src),
      `Optional dashboard script must also be in dashboard script order: ${src}`,
    );
    context.assertExtensionFile(context.extensionPathFromDashboardScript(src));
  }
  assertDashboardCss({ ...context, dashboardStylesheetSources });
}

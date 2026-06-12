const VENDORED_COMPANION_FILES_BY_SOURCE = Object.freeze({
  "vendor/chart.umd.min.js": Object.freeze(["vendor/chart.umd.min.js.map"]),
});

function attributeValue(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=["']([^"']+)["']`, "i"));
  return match?.[1] || null;
}

function unique(values) {
  return Object.freeze(
    values.filter(Boolean).filter((value, index, source) => {
      return source.indexOf(value) === index;
    }),
  );
}

function localExtensionPagePath(src, label) {
  if (!src?.startsWith("./") || /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src)) {
    throw new Error(`${label} must be extension-local: ${src}`);
  }
  return src.slice(2);
}

function dashboardScriptPath(src) {
  return localExtensionPagePath(src, "Dashboard script source");
}

function extensionPagePath(src, label) {
  return localExtensionPagePath(src, label);
}

function dashboardLinkSources(dashboardHtml, { relPattern, readAttribute }) {
  const linkTags = dashboardHtml.match(/<link\b[^>]*>/gi) || [];
  return linkTags
    .filter((linkTag) => relPattern.test(readAttribute(linkTag, "rel") || ""))
    .map((linkTag) => readAttribute(linkTag, "href"))
    .filter(Boolean);
}

function dashboardScriptSources(dashboardHtml, readAttribute) {
  const scriptTags = dashboardHtml.match(/<script\b[\s\S]*?<\/script>/gi) || [];
  return scriptTags
    .map((scriptTag) => readAttribute(scriptTag, "src"))
    .filter(Boolean);
}

export function dashboardAssetSourcesFromHtml(
  dashboardHtml,
  { attributeValue: readAttribute = attributeValue } = {},
) {
  return Object.freeze({
    faviconSources: Object.freeze(
      dashboardLinkSources(dashboardHtml, {
        readAttribute,
        relPattern: /\b(?:icon|shortcut icon)\b/i,
      }),
    ),
    scriptSources: Object.freeze(
      dashboardScriptSources(dashboardHtml, readAttribute),
    ),
    stylesheetSources: Object.freeze(
      dashboardLinkSources(dashboardHtml, {
        readAttribute,
        relPattern: /\bstylesheet\b/i,
      }),
    ),
  });
}

function manifestAssetSources(manifest) {
  return [
    manifest.background?.service_worker,
    ...Object.values(manifest.icons || {}),
    ...Object.values(manifest.action?.default_icon || {}),
  ];
}

function runtimeScriptSources(runtimeManifest) {
  return [
    ...(runtimeManifest.BACKGROUND_SCRIPT_SOURCES || []),
    ...(runtimeManifest.DASHBOARD_SCRIPT_SOURCES || []).map(
      dashboardScriptPath,
    ),
  ];
}

function dashboardAssetPaths(dashboardAssets) {
  return [
    ...dashboardAssets.faviconSources.map((src) =>
      extensionPagePath(src, "Dashboard favicon"),
    ),
    ...dashboardAssets.scriptSources.map(dashboardScriptPath),
    ...dashboardAssets.stylesheetSources.map((src) =>
      extensionPagePath(src, "Dashboard stylesheet"),
    ),
  ];
}

function themeAssetPaths(themeAssets) {
  return [
    ...Object.values(themeAssets.APP_ICON_FILES_BY_SIZE || {}).map(
      (relativePath) =>
        `${themeAssets.THEME_BASE_PATH.slice(2)}/${relativePath}`,
    ),
    ...Object.values(themeAssets.PACE_ICON_FILES_BY_STATE || {}).map(
      (relativePath) =>
        `${themeAssets.THEME_BASE_PATH.slice(2)}/${relativePath}`,
    ),
    ...Object.values(themeAssets.PACE_ICON_VARIANT_FILES || {}).map(
      (relativePath) =>
        `${themeAssets.THEME_BASE_PATH.slice(2)}/${relativePath}`,
    ),
    ...Object.values(themeAssets.EFFECT_ASSET_FILES || {}).map(
      (relativePath) =>
        `${themeAssets.THEME_BASE_PATH.slice(2)}/${relativePath}`,
    ),
  ];
}

function companionFilesFor(sources) {
  return sources.flatMap(
    (source) => VENDORED_COMPANION_FILES_BY_SOURCE[source] || [],
  );
}

export function requiredExtensionFilesFromContracts({
  attributeValue: readAttribute = attributeValue,
  dashboardHtml,
  manifest,
  runtimeManifest,
  themeAssets,
}) {
  const dashboardAssets = dashboardAssetSourcesFromHtml(dashboardHtml, {
    attributeValue: readAttribute,
  });
  const contractFiles = [
    "manifest.json",
    "dashboard.html",
    ...manifestAssetSources(manifest),
    ...runtimeScriptSources(runtimeManifest),
    ...dashboardAssetPaths(dashboardAssets),
    ...themeAssetPaths(themeAssets),
  ];

  return unique([...contractFiles, ...companionFilesFor(contractFiles)]);
}

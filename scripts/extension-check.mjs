import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const extensionRoot = path.join(projectRoot, "collector", "extension");

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(extensionRoot, relativePath), "utf8"),
  );
}

function readExtensionText(relativePath) {
  return fs.readFileSync(path.join(extensionRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertExtensionFile(relativePath) {
  assert(
    fs.existsSync(path.join(extensionRoot, relativePath)),
    `Missing extension file: ${relativePath}`,
  );
}

function assertExactStringSet(actual, expected, label) {
  assert(Array.isArray(actual), `${label} must be an array.`);
  const missing = expected.filter((value) => !actual.includes(value));
  const extra = actual.filter((value) => !expected.includes(value));
  assert(
    missing.length === 0 && extra.length === 0,
    `${label} must be exactly: ${expected.join(", ")}.`,
  );
}

function attributeValue(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=["']([^"']+)["']`, "i"));
  return match?.[1] || null;
}

function normalizeExtensionPath(relativePath) {
  return relativePath.replace(/\\/g, "/");
}

function extensionPathFromDashboardScript(src) {
  assert(
    src.startsWith("./") && !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src),
    `Dashboard script source must be extension-local: ${src}`,
  );
  return src.slice(2);
}

function extensionPathFromExtensionPageUrl(src, label) {
  assert(
    src.startsWith("./") && !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src),
    `${label} must be extension-local: ${src}`,
  );
  return src.slice(2);
}

function assertScriptBefore(sources, before, after, label) {
  assert(sources.includes(before), `${label} must include ${before}.`);
  assert(sources.includes(after), `${label} must include ${after}.`);
  assert(
    sources.indexOf(before) < sources.indexOf(after),
    `${label} must load ${before} before ${after}.`,
  );
}

function listExtensionFiles(directory = extensionRoot) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listExtensionFiles(absolutePath);
    }
    return [normalizeExtensionPath(path.relative(extensionRoot, absolutePath))];
  });
}

await import(pathToFileURL(path.join(extensionRoot, "runtime-manifest.js")));
const runtimeManifest = globalThis.CodexExtensionRuntime;
assert(runtimeManifest, "Runtime manifest must be importable by checks.");
await import(pathToFileURL(path.join(extensionRoot, "product-metadata.js")));
const productMetadata = globalThis.CodexProductMetadata;
assert(productMetadata, "Product metadata must be importable by checks.");
await import(pathToFileURL(path.join(extensionRoot, "integration-config.js")));
const integrationConfig = globalThis.CodexIntegrationConfig;
assert(integrationConfig, "Integration config must be importable by checks.");
await import(
  pathToFileURL(
    path.join(extensionRoot, "themes/default/asset-manifest.js"),
  )
);
const themeAssets = globalThis.CodexThemeAssets;
assert(themeAssets, "Theme asset manifest must be importable by checks.");

const manifest = readJson("manifest.json");
const expectedExtensionCsp = "script-src 'self'; object-src 'self';";

assert(manifest.manifest_version === 3, "Manifest must use version 3.");
assert(
  manifest.name === productMetadata.NAME,
  "Extension name changed unexpectedly.",
);
assert(
  typeof manifest.description === "string",
  "Manifest description is required.",
);
assertExactStringSet(
  manifest.permissions,
  ["alarms", "contextMenus", "storage"],
  "Permissions",
);
assertExactStringSet(
  manifest.host_permissions,
  [integrationConfig.CHATGPT_HOST_PERMISSION],
  "Host permissions",
);
assert(
  !manifest.optional_permissions?.length,
  "Extension must not request optional permissions.",
);
assert(
  !manifest.optional_host_permissions?.length,
  "Extension must not request optional host permissions.",
);
assert(
  !manifest.host_permissions?.some((permission) =>
    permission.includes("127.0.0.1"),
  ),
  "Extension must not request localhost host permissions.",
);
assert(
  manifest.content_security_policy?.extension_pages === expectedExtensionCsp,
  `Extension pages CSP must be exactly: ${expectedExtensionCsp}`,
);
assert(
  !/unsafe-inline|unsafe-eval|https?:|data:/i.test(
    manifest.content_security_policy.extension_pages,
  ),
  "Extension pages CSP must not allow inline, eval, remote, or data script sources.",
);

assert(
  manifest.background?.service_worker === "background.js",
  "Background service worker must be background.js.",
);
assertExtensionFile(manifest.background.service_worker);
assertExtensionFile("runtime-manifest.js");
const backgroundJs = readExtensionText(manifest.background.service_worker);
assert(
  /importScripts\(\s*["']runtime-manifest\.js["']\s*\);/.test(backgroundJs),
  "Background must bootstrap the runtime manifest.",
);
assert(
  /importScripts\(\s*\.\.\.CodexExtensionRuntime\.BACKGROUND_SCRIPT_SOURCES\s*\);/.test(
    backgroundJs,
  ),
  "Background imports must come from the runtime manifest.",
);
const backgroundImports = runtimeManifest.BACKGROUND_SCRIPT_SOURCES;
assert(
  Array.isArray(backgroundImports),
  "Background script sources must be an array.",
);
assertScriptBefore(
  backgroundImports,
  "product-metadata.js",
  "background-logic.js",
  "Background runtime manifest",
);
assertScriptBefore(
  backgroundImports,
  "integration-config.js",
  "usage.js",
  "Background runtime manifest",
);
assertScriptBefore(
  backgroundImports,
  "usage-windows.js",
  "usage.js",
  "Background runtime manifest",
);
assertScriptBefore(
  backgroundImports,
  "usage-values.js",
  "usage.js",
  "Background runtime manifest",
);
assertScriptBefore(
  backgroundImports,
  "usage-values.js",
  "history-store.js",
  "Background runtime manifest",
);
assertScriptBefore(
  backgroundImports,
  "refresh-status.js",
  "history-store.js",
  "Background runtime manifest",
);
assertScriptBefore(
  backgroundImports,
  "usage-values.js",
  "pace-logic.js",
  "Background runtime manifest",
);
assertScriptBefore(
  backgroundImports,
  "storage-adapter.js",
  "usage.js",
  "Background runtime manifest",
);
assertScriptBefore(
  backgroundImports,
  "usage-integration-adapters.js",
  "usage.js",
  "Background runtime manifest",
);
assertScriptBefore(
  backgroundImports,
  "themes/default/asset-manifest.js",
  "pace-logic.js",
  "Background runtime manifest",
);
assertScriptBefore(
  backgroundImports,
  "feature-flags.js",
  "pace-logic.js",
  "Background runtime manifest",
);
for (const src of backgroundImports) {
  assert(
    !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src),
    `Background importScripts source must be extension-local: ${src}`,
  );
  assertExtensionFile(src);
}
for (const size of ["16", "32", "48", "128"]) {
  const iconPath = extensionPathFromExtensionPageUrl(
    themeAssets.appIconPathForSize(size),
    `${size}px app icon`,
  );
  assert(manifest.icons?.[size] === iconPath, `Missing ${size}px icon.`);
  assert(
    manifest.action?.default_icon?.[size] === iconPath,
    `Missing ${size}px action icon.`,
  );
  assertExtensionFile(iconPath);
}

assert(!manifest.action?.default_popup, "Toolbar action must not use a popup.");
assert(
  manifest.action?.default_title === productMetadata.ACTION_DEFAULT_TITLE,
  "Unexpected action title.",
);
assert(
  !manifest.content_scripts,
  "Extension must not inject localhost widget scripts.",
);
assert(
  !manifest.web_accessible_resources,
  "Extension must not expose packaged resources to web pages.",
);
assert(
  !manifest.externally_connectable,
  "Extension must not accept external connections.",
);
assertExtensionFile("usage.js");
assertExtensionFile("product-metadata.js");
assertExtensionFile("integration-config.js");
assertExtensionFile("dashboard-loader.js");
assertExtensionFile("usage-windows.js");
assertExtensionFile("usage-values.js");
assertExtensionFile("refresh-status.js");
assertExtensionFile("storage-adapter.js");
assertExtensionFile("usage-integration-adapters.js");
assertExtensionFile("history-store.js");
assertExtensionFile("themes/default/asset-manifest.js");
assertExtensionFile("feature-flags.js");
assertExtensionFile("pace-logic.js");
assertExtensionFile("background-logic.js");
assertExtensionFile("dashboard.html");
assertExtensionFile("dashboard.css");
assertExtensionFile("dashboard.js");
assertExtensionFile("vendor/chart.umd.min.js");
assertExtensionFile("vendor/chart.umd.min.js.map");
assertExactStringSet(
  Object.keys(themeAssets.PACE_ICON_FILES_BY_STATE),
  [
    "wellAhead",
    "strongAhead",
    "ahead",
    "on",
    "behind",
    "wellBehind",
    "criticalBehind",
    "sync",
    "perfectZero",
  ],
  "Theme pace icon states",
);
for (const stateKey of Object.keys(themeAssets.PACE_ICON_FILES_BY_STATE)) {
  assertExtensionFile(
    extensionPathFromExtensionPageUrl(
      themeAssets.paceIconPathForState(stateKey),
      `${stateKey} pace icon`,
    ),
  );
}

const dashboardHtml = readExtensionText("dashboard.html");
const scriptTags = dashboardHtml.match(/<script\b[\s\S]*?<\/script>/gi) || [];
assert(scriptTags.length > 0, "Dashboard must load local script assets.");
assert(
  !/<(?!a\b)[^>]+\b(?:src|href)=["'](?:https?:)?\/\//i.test(dashboardHtml),
  "Dashboard HTML must not load remote resources.",
);
const anchorTags = dashboardHtml.match(/<a\b[\s\S]*?<\/a>/gi) || [];
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
  assertExtensionFile(src.slice(2));
}
const dashboardScriptSources = scriptTags.map((scriptTag) =>
  attributeValue(scriptTag, "src"),
);
assert(
  dashboardScriptSources.length === 2 &&
    dashboardScriptSources[0] === "./runtime-manifest.js" &&
    dashboardScriptSources[1] === "./dashboard-loader.js",
  "Dashboard HTML must bootstrap only the runtime manifest and dashboard loader.",
);
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
assertScriptBefore(
  dashboardRuntimeScripts,
  "./product-metadata.js",
  "./dashboard.js",
  "Dashboard runtime manifest",
);
assertScriptBefore(
  dashboardRuntimeScripts,
  "./integration-config.js",
  "./usage.js",
  "Dashboard runtime manifest",
);
assertScriptBefore(
  dashboardRuntimeScripts,
  "./usage-windows.js",
  "./usage.js",
  "Dashboard runtime manifest",
);
assertScriptBefore(
  dashboardRuntimeScripts,
  "./usage-values.js",
  "./usage.js",
  "Dashboard runtime manifest",
);
assertScriptBefore(
  dashboardRuntimeScripts,
  "./usage-values.js",
  "./history-store.js",
  "Dashboard runtime manifest",
);
assertScriptBefore(
  dashboardRuntimeScripts,
  "./refresh-status.js",
  "./history-store.js",
  "Dashboard runtime manifest",
);
assertScriptBefore(
  dashboardRuntimeScripts,
  "./usage-values.js",
  "./pace-logic.js",
  "Dashboard runtime manifest",
);
assertScriptBefore(
  dashboardRuntimeScripts,
  "./storage-adapter.js",
  "./usage.js",
  "Dashboard runtime manifest",
);
assertScriptBefore(
  dashboardRuntimeScripts,
  "./usage-integration-adapters.js",
  "./usage.js",
  "Dashboard runtime manifest",
);
assertScriptBefore(
  dashboardRuntimeScripts,
  "./themes/default/asset-manifest.js",
  "./pace-logic.js",
  "Dashboard runtime manifest",
);
assertScriptBefore(
  dashboardRuntimeScripts,
  "./feature-flags.js",
  "./pace-logic.js",
  "Dashboard runtime manifest",
);
for (const src of dashboardRuntimeScripts) {
  assertExtensionFile(extensionPathFromDashboardScript(src));
}
for (const src of optionalDashboardRuntimeScripts) {
  assert(
    dashboardRuntimeScripts.includes(src),
    `Optional dashboard script must also be in dashboard script order: ${src}`,
  );
  assertExtensionFile(extensionPathFromDashboardScript(src));
}

const dashboardCss = readExtensionText("dashboard.css");
assert(!/@import\b/i.test(dashboardCss), "Dashboard CSS must not use imports.");
assert(
  !/url\(\s*["']?(?:https?:|\/\/)/i.test(dashboardCss),
  "Dashboard CSS must not load remote resources.",
);

const disallowedPackagedArtifactPatterns = [
  /(^|\/)usage\.json$/i,
  /(^|\/)cookies?([._-]|$)/i,
  /(^|\/)tokens?([._-]|$)/i,
  /(^|\/)sessions?([._-]|$)/i,
  /(^|\/)raw([._-]|$)/i,
  /(^|\/)screenshots?([._-]|$)/i,
  /\.(db|dump|har|log|sqlite)$/i,
];
const allowedPackagedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".png",
]);
const allowedPackagedFiles = new Set(["README.md"]);
for (const relativePath of listExtensionFiles()) {
  const extension = path.extname(relativePath);
  assert(
    allowedPackagedExtensions.has(extension) ||
      allowedPackagedFiles.has(relativePath),
    `Unexpected packaged extension file type: ${relativePath}`,
  );
  assert(
    !disallowedPackagedArtifactPatterns.some((pattern) =>
      pattern.test(relativePath),
    ),
    `Packaged extension must not include raw usage/auth artifacts: ${relativePath}`,
  );
}

console.log("Extension manifest and security checks passed.");

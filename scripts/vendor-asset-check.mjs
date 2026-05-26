import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PNG } from "pngjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const chartPackageRoot = path.dirname(
  path.dirname(fileURLToPath(import.meta.resolve("chart.js/auto"))),
);
const chartFiles = ["chart.umd.min.js", "chart.umd.min.js.map"];
await import(
  pathToFileURL(
    path.join(
      projectRoot,
      "collector/extension/themes/default/asset-manifest.js",
    ),
  )
);
const themeAssets = globalThis.CodexThemeAssets;
if (!themeAssets) {
  throw new Error("Theme asset manifest must be importable by checks.");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readBuffer(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath));
}

function readPng(relativePath) {
  return PNG.sync.read(readBuffer(relativePath));
}

function assertMatchingFiles(sourcePath, checkedPath) {
  const source = readBuffer(sourcePath);
  const checked = readBuffer(checkedPath);
  assert(
    source.equals(checked),
    `Vendored asset is stale: ${checkedPath} must match ${sourcePath}.`,
  );
}

function assertPngDimensions(relativePath, width, height) {
  const png = readPng(relativePath);
  assert(
    png.width === width && png.height === height,
    `${relativePath} must be ${width}x${height}; found ${png.width}x${png.height}.`,
  );
}

function extensionPathFromExtensionPageUrl(src, label) {
  assert(
    src.startsWith("./") && !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src),
    `${label} must be extension-local: ${src}`,
  );
  return `collector/extension/${src.slice(2)}`;
}

function hasTransparentPixel(png) {
  for (let index = 3; index < png.data.length; index += 4) {
    if (png.data[index] < 255) {
      return true;
    }
  }
  return false;
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: projectRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
}

for (const fileName of chartFiles) {
  assertMatchingFiles(
    path.relative(projectRoot, path.join(chartPackageRoot, "dist", fileName)),
    `collector/extension/vendor/${fileName}`,
  );
}

for (const size of [16, 32, 48, 128]) {
  assertPngDimensions(
    extensionPathFromExtensionPageUrl(
      themeAssets.appIconPathForSize(size),
      `${size}px app icon`,
    ),
    size,
    size,
  );
}

const paceIconPaths = Object.keys(themeAssets.PACE_ICON_FILES_BY_STATE).map(
  (stateKey) =>
    extensionPathFromExtensionPageUrl(
      themeAssets.paceIconPathForState(stateKey),
      `${stateKey} pace icon`,
    ),
);
for (const extensionPath of paceIconPaths) {
  const png = readPng(extensionPath);
  assert(
    png.width > 0 && png.height > 0,
    `${extensionPath} must be non-empty.`,
  );
  assert(
    hasTransparentPixel(png),
    `${extensionPath} must preserve transparent background pixels.`,
  );
}

const tracked = new Set(trackedFiles());
for (const requiredPath of [
  ...chartFiles.map((fileName) => `collector/extension/vendor/${fileName}`),
  "collector/extension/themes/default/asset-manifest.js",
  ...[16, 32, 48, 128].map((size) =>
    extensionPathFromExtensionPageUrl(
      themeAssets.appIconPathForSize(size),
      `${size}px app icon`,
    ),
  ),
  ...paceIconPaths,
]) {
  assert(
    tracked.has(requiredPath),
    `Required runtime asset is not tracked: ${requiredPath}`,
  );
}

console.log("Vendored runtime asset checks passed.");

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  dashboardAssetSourcesFromHtml,
  requiredExtensionFilesFromContracts,
} from "../scripts/extension-check-required-files.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const extensionRoot = path.join(projectRoot, "collector", "extension");

function readExtensionText(relativePath) {
  return fs.readFileSync(path.join(extensionRoot, relativePath), "utf8");
}

function readExtensionJson(relativePath) {
  return JSON.parse(readExtensionText(relativePath));
}

beforeAll(async () => {
  await import(pathToFileURL(path.join(extensionRoot, "runtime-manifest.js")));
  await import(
    pathToFileURL(path.join(extensionRoot, "themes/default/asset-manifest.js"))
  );
});

describe("extension check required files", () => {
  it("reads dashboard stylesheets from dashboard HTML", () => {
    const dashboardAssets = dashboardAssetSourcesFromHtml(
      readExtensionText("dashboard.html"),
    );

    expect(dashboardAssets.stylesheetSources[0]).toBe("./dashboard.css");
    expect(dashboardAssets.stylesheetSources).toContain(
      "./dashboard-perfect-zero.css",
    );
    expect(dashboardAssets.scriptSources).toEqual([
      "./runtime-manifest.js",
      "./dashboard-loader.js",
    ]);
    expect(new Set(dashboardAssets.stylesheetSources).size).toBe(
      dashboardAssets.stylesheetSources.length,
    );
  });

  it("derives required files from HTML, runtime, manifest, and theme contracts", () => {
    const requiredFiles = requiredExtensionFilesFromContracts({
      dashboardHtml: readExtensionText("dashboard.html"),
      manifest: readExtensionJson("manifest.json"),
      runtimeManifest: globalThis.CodexExtensionRuntime,
      themeAssets: globalThis.CodexThemeAssets,
    });

    expect(requiredFiles).toContain("background.js");
    expect(requiredFiles).toContain("runtime-manifest.js");
    expect(requiredFiles).toContain("dashboard-loader.js");
    expect(requiredFiles).toContain("dashboard.css");
    expect(requiredFiles).toContain("dashboard-perfect-zero.css");
    expect(requiredFiles).toContain("usage-providers.js");
    expect(requiredFiles).toContain("vendor/chart.umd.min.js");
    expect(requiredFiles).toContain("vendor/chart.umd.min.js.map");
    expect(requiredFiles).toContain("themes/default/app-icons/icon32.png");
    expect(requiredFiles).toContain(
      "themes/default/pace-icons/perfect-zero.png",
    );
    expect(requiredFiles).toContain(
      "themes/default/effects/reset-exhausted/exhausted-person.png",
    );
    expect(requiredFiles).toContain("themes/default/grocery_icons/apple.png");
    expect(requiredFiles).toContain("themes/default/ocean-icons/clownfish.png");
    expect(requiredFiles).toContain("themes/default/ocean-icons/whale.png");
    expect(new Set(requiredFiles).size).toBe(requiredFiles.length);
  });
});

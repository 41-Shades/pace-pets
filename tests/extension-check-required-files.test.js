import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  dashboardAssetSourcesFromHtml,
  releaseExtensionFilesFromContracts,
  validateReleaseExtensionPath,
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
  await import(pathToFileURL(path.join(extensionRoot, "audio-clips.js")));
});

describe("extension check required files", () => {
  it("rejects paths that cannot belong to a release package", () => {
    expect(() => validateReleaseExtensionPath("assets/.DS_Store")).toThrow(
      "Unexpected release extension file type",
    );
    expect(() => validateReleaseExtensionPath("screenshots/demo.png")).toThrow(
      "Release extension must not include private/generated artifacts",
    );
  });

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

  it("derives the exact release allowlist from runtime asset contracts", () => {
    const releaseFiles = releaseExtensionFilesFromContracts({
      audioClips: globalThis.PacePetsAudioClips,
      dashboardHtml: readExtensionText("dashboard.html"),
      manifest: readExtensionJson("manifest.json"),
      runtimeManifest: globalThis.CodexExtensionRuntime,
      themeAssets: globalThis.CodexThemeAssets,
    });

    expect(releaseFiles).toContain("background.js");
    expect(releaseFiles).toContain("runtime-manifest.js");
    expect(releaseFiles).toContain("dashboard-loader.js");
    expect(releaseFiles).toContain("dashboard.css");
    expect(releaseFiles).toContain("dashboard-perfect-zero.css");
    expect(releaseFiles).toContain("usage-providers.js");
    expect(releaseFiles).toContain("vendor/chart.umd.min.js");
    expect(releaseFiles).toContain("vendor/chart.umd.min.js.map");
    expect(releaseFiles).toContain("themes/default/app-icons/icon32.png");
    expect(releaseFiles).toContain(
      "themes/default/pace-icons/perfect-zero.png",
    );
    expect(releaseFiles).toContain(
      "themes/default/effects/reset-exhausted/exhausted-person.png",
    );
    expect(releaseFiles).toContain("themes/default/grocery_icons/apple.png");
    expect(releaseFiles).toContain("themes/default/ocean-icons/clownfish.png");
    expect(releaseFiles).toContain("themes/default/ocean-icons/whale.png");
    expect(releaseFiles).toContain("assets/audio/brake-extreme-burst.m4a");
    expect(releaseFiles).toContain("assets/audio/the-great-beyond-21s-31s.m4a");
    expect(releaseFiles).toContain(
      "assets/audio/the-great-beyond-60s-72p5s.m4a",
    );
    expect(releaseFiles).not.toContain("dev-flags.html");
    expect(releaseFiles).not.toContain("dev-flags-feature-previews.js");
    expect(releaseFiles).not.toContain("dev-flags-scenario-triggers.css");
    expect(releaseFiles).not.toContain("README.md");
    expect(releaseFiles).not.toContain("assets/.DS_Store");
    expect(releaseFiles).not.toContain(
      "themes/default/grocery_icons/grocery-items-palette.png",
    );
    expect(releaseFiles).not.toContain(
      "themes/default/ocean-icons/ocean-animals-palette.png",
    );
    expect(releaseFiles).not.toContain("themes/default/ocean-icons/clam.png");
    expect(new Set(releaseFiles).size).toBe(releaseFiles.length);
    for (const relativePath of releaseFiles) {
      expect(fs.existsSync(path.join(extensionRoot, relativePath))).toBe(true);
    }
  });
});

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function importExtensionScript(source) {
  await import(pathToFileURL(path.join(projectRoot, source)));
}

installExtensionRuntimeHooks();

beforeAll(async () => {
  await importExtensionScript("collector/extension/dashboard-app-core.js");
  await importExtensionScript(
    "collector/extension/dashboard-history-methods.js",
  );
});

describe("PacePetsDashboardApp history presentation time", () => {
  it("uses stored pace presentation time only for the matching latest sample", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const refreshStatus = {
      pacePresentationAt: "2026-05-25T12:01:00.000Z",
      pacePresentationSampleId: "sample-1",
    };

    expect(
      app.presentationTimeMsForSample({ id: "sample-1" }, refreshStatus),
    ).toBe(Date.parse("2026-05-25T12:01:00.000Z"));

    expect(
      app.presentationTimeMsForSample({ id: "sample-2" }, refreshStatus),
    ).toBe(Date.parse("2026-05-25T12:00:00.000Z"));
  });
});

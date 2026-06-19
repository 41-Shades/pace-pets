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
  await importExtensionScript("collector/extension/dashboard-time.js");
});

describe("PacePetsDashboardTime reset budget rate", () => {
  it("does not round small positive day and hour budgets to zero", () => {
    const atMs = Date.parse("2026-05-25T12:00:00.000Z");

    expect(
      globalThis.PacePetsDashboardTime.resetBudgetRate(
        {
          remainingPercent: 1,
          resetsAt: "2026-06-01T12:00:00.000Z",
          windowMinutes: 7 * 24 * 60,
        },
        atMs,
      ),
    ).toEqual({ unit: "/ day", value: "<1%" });

    expect(
      globalThis.PacePetsDashboardTime.resetBudgetRate(
        {
          remainingPercent: 1,
          resetsAt: "2026-05-25T15:00:00.000Z",
          windowMinutes: 5 * 60,
        },
        atMs,
      ),
    ).toEqual({ unit: "/ hour", value: "<1%" });
  });

  it("keeps minute budget precision under ten percent", () => {
    expect(
      globalThis.PacePetsDashboardTime.resetBudgetRate(
        {
          remainingPercent: 61,
          resetsAt: "2026-05-25T12:43:00.000Z",
          windowMinutes: 5 * 60,
        },
        Date.parse("2026-05-25T12:00:00.000Z"),
      ),
    ).toEqual({ unit: "/ min", value: "1.4%" });
  });
});

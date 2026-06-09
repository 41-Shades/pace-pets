import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

installExtensionRuntimeHooks();

beforeAll(async () => {
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/dashboard-pace-data.js"),
    )
  );
});

describe("PacePetsDashboardPaceData", () => {
  it("derives legend group keys from the pace-state catalog", () => {
    const data = globalThis.PacePetsDashboardPaceData;
    const groupsByKey = globalThis.PacePetsLogic.PACE_STATE_GROUPS_BY_KEY;

    expect(data.PACE_LEVEL_LEGEND_STATE_KEYS).toBe(
      groupsByKey.paceLevels.displayStateKeys,
    );
    expect(data.PACE_PERFECT_LEGEND_STATE_KEYS).toBe(
      groupsByKey.perfectStates.displayStateKeys,
    );
    expect(data.PACE_IMPERFECT_LEGEND_STATE_KEYS).toBe(
      groupsByKey.imperfectStates.displayStateKeys,
    );
  });
});

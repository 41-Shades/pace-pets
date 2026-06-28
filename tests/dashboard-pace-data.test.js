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

  it("keeps brake intensity tuning ranges explicit", () => {
    const data = globalThis.PacePetsDashboardPaceData;

    expect(data.BRAKE_INTENSITY.RATIO_RANGE).toEqual([0.55, 0]);
    expect(data.BRAKE_INTENSITY.BURST_CHANCE_RANGES_PERCENT).toMatchObject({
      normal: [60, 35],
      wide: [25, 25],
      escape: [12, 15],
      extreme: [3, 25],
    });
    expect(data.BRAKE_INTENSITY.EXTREME_PARTICLE_COUNT_RANGE).toEqual([
      8000, 14000,
    ]);
  });
});

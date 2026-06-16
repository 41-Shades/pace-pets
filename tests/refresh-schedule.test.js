import { describe, expect, it } from "vitest";

import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

installExtensionRuntimeHooks();

describe("PacePetsRefreshSchedule", () => {
  it("owns alarm metadata and dashboard schedule copy", () => {
    const schedule = globalThis.PacePetsRefreshSchedule;

    expect(schedule.ALARMS.usageRefresh).toEqual({
      delayInMinutes: 1,
      name: "refresh-codex-weekly-usage",
      periodInMinutes: 5,
    });
    expect(schedule.ALARMS.badgePresentation).toEqual({
      delayInMinutes: 1,
      name: "refresh-pace-badge-presentation",
      periodInMinutes: 1,
    });
    expect(schedule.alarmCreateOptions(schedule.ALARMS.usageRefresh)).toEqual({
      delayInMinutes: 1,
      periodInMinutes: 5,
    });
    expect(schedule.AUTO_CHECKS_STATUS_TOOLTIP).toBe("Auto-checks every 5m");
    expect(schedule.CHECKS_EVERY_ARIA).toBe("Checks every 5 minutes.");
  });
});

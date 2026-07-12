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
      path.join(
        projectRoot,
        "collector/extension/dashboard-splat-fall-profile.js",
      ),
    )
  );
  await import(
    pathToFileURL(
      path.join(
        projectRoot,
        "collector/extension/dashboard-splat-entry-playback.js",
      ),
    )
  );
});

function rollController(roll) {
  return {
    randomIntegerInRange(range) {
      expect(range).toEqual([1, 100]);
      return roll;
    },
  };
}

function sequenceController(values, ranges) {
  return {
    randomIntegerInRange(range) {
      ranges.push(range);
      return values.shift();
    },
  };
}

describe("PacePetsDashboardSplatFallProfile", () => {
  it("selects Splat entry modes at 75 / 20 / 5 percent boundaries", () => {
    const profile = globalThis.PacePetsDashboardSplatFallProfile;

    expect(profile.selectSplatEntryMode(rollController(1))).toBe(
      profile.SPLAT_ENTRY_MODES.normal,
    );
    expect(profile.selectSplatEntryMode(rollController(75))).toBe(
      profile.SPLAT_ENTRY_MODES.normal,
    );
    expect(profile.selectSplatEntryMode(rollController(76))).toBe(
      profile.SPLAT_ENTRY_MODES.maxNormal,
    );
    expect(profile.selectSplatEntryMode(rollController(95))).toBe(
      profile.SPLAT_ENTRY_MODES.maxNormal,
    );
    expect(profile.selectSplatEntryMode(rollController(96))).toBe(
      profile.SPLAT_ENTRY_MODES.rareMax,
    );
    expect(profile.selectSplatEntryMode(rollController(100))).toBe(
      profile.SPLAT_ENTRY_MODES.rareMax,
    );
  });

  it("uses the regular max height range for max-normal ratio bounces", () => {
    const profile = globalThis.PacePetsDashboardSplatFallProfile;
    const ranges = [];
    const bounce = profile.maxNormalRatioBounceProfile(
      sequenceController([520, 0, 112, 0, 985, 0, 24, 12, 4], ranges),
    );

    expect(ranges[0]).toEqual([480, 560]);
    expect(bounce.peakYPx).toBe(-520);
  });

  it("keeps the extreme ratio slam vertical while preserving the settle bounce", () => {
    const profile = globalThis.PacePetsDashboardSplatFallProfile;
    const slam = profile.extremeRatioSlamProfile();

    expect(slam.peakXPx).toBe(0);
    expect(slam.reboundXPx).toBe(0);
    expect(slam.secondYPx).toBeLessThan(0);
    expect(slam.slamSettleYPx).toBeGreaterThan(0);
    expect(slam.slamSmallBounceYPx).toBeLessThan(0);
  });
});

describe("PacePetsDashboardSplatEntryPlayback", () => {
  it("resolves rare Splat entries to Max Splat playback", () => {
    const playback = globalThis.PacePetsDashboardSplatEntryPlayback;
    let ratioReads = 0;
    let queued = false;
    const controller = {
      elements: {
        paceRatioValue: {
          getBoundingClientRect: () => {
            ratioReads += 1;
            return { height: 10, left: 20, top: 30, width: 40 };
          },
        },
      },
      queueSplatMaxBounceSlam() {
        queued = true;
      },
      randomIntegerInRange: () => 96,
    };

    const resolved = playback.resolve(controller, {
      fallTiming: { cleanupMs: 1, durationMs: 1, impactMs: 1 },
      impactProfile: null,
      onImpact: null,
    });

    expect(resolved.fallTiming).toBe(playback.maxSplatFallTiming);
    expect(resolved.captureRatioOriginBeforeImpact).toBe(true);
    expect(resolved.impactProfile.ratio).toBeNull();
    expect(controller.splatMaxBounceRatioOriginRect).toBeUndefined();
    expect(ratioReads).toBe(0);

    resolved.onImpact();

    expect(queued).toBe(true);
  });

  it("ignores no-layout ratio origins", () => {
    const playback = globalThis.PacePetsDashboardSplatEntryPlayback;
    const controller = {
      elements: {
        paceRatioValue: {
          getBoundingClientRect: () => ({
            height: 0,
            left: 0,
            top: 0,
            width: 0,
          }),
        },
      },
      randomIntegerInRange: () => 96,
    };

    expect(playback.ratioOriginRect(controller)).toBeNull();
  });
});

describe("PacePetsDashboardSplatEntryPlayback timing", () => {
  it("forces Max Splat playback when displayed time remaining is over 50%", () => {
    const playback = globalThis.PacePetsDashboardSplatEntryPlayback;
    let randomRolls = 0;
    const controller = {
      currentPaceSummaryTimePercent: 50.6,
      elements: {
        paceRatioValue: {
          getBoundingClientRect: () => ({
            height: 10,
            left: 20,
            top: 30,
            width: 40,
          }),
        },
      },
      randomIntegerInRange: () => {
        randomRolls += 1;
        return 1;
      },
    };

    const resolved = playback.resolve(controller, {
      fallTiming: { cleanupMs: 1, durationMs: 1, impactMs: 1 },
      impactProfile: null,
      onImpact: null,
    });

    expect(resolved.fallTiming).toBe(playback.maxSplatFallTiming);
    expect(resolved.impactProfile.ratio).toBeNull();
    expect(randomRolls).toBe(0);
  });

  it("uses regular Splat odds when displayed time remaining is 50% or below", () => {
    const playback = globalThis.PacePetsDashboardSplatEntryPlayback;
    const ranges = [];
    const controller = {
      currentPaceSummaryTimePercent: 50.4,
      elements: {
        paceRatioValue: {
          getBoundingClientRect: () => ({
            height: 10,
            left: 20,
            top: 30,
            width: 40,
          }),
        },
      },
      randomIntegerInRange: sequenceController(
        [
          1, 640, 8, -4, -42, 24, -32, 180, 16, -60, 320, 0, 112, 0, 985, 0, 24,
          12, 4,
        ],
        ranges,
      ).randomIntegerInRange,
    };

    const resolved = playback.resolve(controller, {
      fallTiming: { cleanupMs: 1, durationMs: 1, impactMs: 1 },
      impactProfile: null,
      onImpact: null,
    });

    expect(ranges[0]).toEqual([1, 100]);
    expect(resolved.fallTiming).toEqual({
      cleanupMs: 1,
      durationMs: 1,
      impactMs: 1,
    });
    expect(resolved.impactProfile.ratio.peakYPx).toBeLessThan(0);
  });
});

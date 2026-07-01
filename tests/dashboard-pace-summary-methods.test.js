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
  await importExtensionScript("collector/extension/dashboard-pace-data.js");
  await importExtensionScript("collector/extension/dashboard-pace-core.js");
  await importExtensionScript(
    "collector/extension/dashboard-pace-summary-methods.js",
  );
});

function createController() {
  return Object.create(globalThis.PacePetsDashboardPaceController.prototype);
}

describe("PacePetsDashboardPaceController blocked zero summary", () => {
  it("keeps exact exhausted usage in Splat when perfect zero is blocked", () => {
    const controller = createController();
    const summary = controller.paceSummaryModel({
      allowPerfectZero: false,
      comparisonPaceRatio: null,
      remainingPercent: 0,
      resetCountdownDisplaysZero: true,
      staleWindow: false,
      timePercent: 0.1,
      waitingForReadingText: "Waiting for reading",
    });

    expect(summary).toMatchObject({
      level: globalThis.PacePetsLogic.PACE_STATES.splat.className,
      paceRatioDisplayOverride: 0,
      title: "Splat!",
    });
  });

  it("keeps exhausted stale windows on their held zero state", () => {
    const controller = createController();
    const summary = controller.paceSummaryModel({
      allowPerfectZero: false,
      comparisonPaceRatio: null,
      remainingPercent: 0,
      resetCountdownDisplaysZero: false,
      staleWindow: true,
      timePercent: 0,
      waitingForReadingText: "Waiting for reading",
    });

    expect(summary).toMatchObject({
      heldZeroState: true,
      level: globalThis.PacePetsLogic.PACE_STATES.splat.className,
      paceRatioDisplayOverride: 0,
      title: "Splat!",
    });
  });

  it("keeps stale perfect zero on its held zero state", () => {
    const controller = createController();
    const summary = controller.paceSummaryModel({
      allowPerfectZero: true,
      comparisonPaceRatio: null,
      remainingPercent: 0.4,
      resetCountdownDisplaysZero: false,
      staleWindow: true,
      timePercent: 0,
      waitingForReadingText: "Waiting for reading",
    });

    expect(summary).toMatchObject({
      heldZeroState: true,
      level: globalThis.PacePetsLogic.PACE_STATES.perfectZero.className,
      paceRatioDisplayOverride: 0,
      title: "Perfect zero",
    });
  });

  it("keeps stale final-countdown perfect zero on Singularity", () => {
    const controller = createController();
    const summary = controller.paceSummaryModel({
      allowPerfectZero: true,
      comparisonPaceRatio: null,
      remainingPercent: 0.4,
      resetCountdownDisplaysZero: true,
      staleWindow: true,
      timePercent: 0,
      waitingForReadingText: "Waiting for reading",
    });

    expect(summary).toMatchObject({
      heldZeroState: true,
      level: globalThis.PacePetsLogic.PACE_STATES.singularity.className,
      paceRatioDisplayOverride: 0,
      resetCountdownOverride: "0d 0h 0m",
      title: "Singularity",
    });
  });
});

describe("PacePetsDashboardPaceController stale zero fallback", () => {
  it("leaves non-zero stale windows on Nothingness", () => {
    const controller = createController();
    const summary = controller.paceSummaryModel({
      allowPerfectZero: true,
      comparisonPaceRatio: null,
      remainingPercent: 42,
      resetCountdownDisplaysZero: false,
      staleWindow: true,
      timePercent: 0,
      waitingForReadingText: "Waiting for reading",
    });

    expect(summary).toMatchObject({
      level: globalThis.PacePetsLogic.PACE_STATES.nothingness.className,
      title: "Nothingness",
    });
    expect(summary.heldZeroState).toBeUndefined();
  });

  it("keeps fractional display-zero usage on the blocked fallback", () => {
    const controller = createController();
    const summary = controller.paceSummaryModel({
      allowPerfectZero: false,
      comparisonPaceRatio: null,
      remainingPercent: 0.4,
      resetCountdownDisplaysZero: true,
      staleWindow: false,
      timePercent: 0,
      waitingForReadingText: "Waiting for reading",
    });

    expect(summary).toMatchObject({
      level: globalThis.PacePetsLogic.PACE_STATES.criticalBehind.className,
      title: "Brake hard!",
    });
  });
});

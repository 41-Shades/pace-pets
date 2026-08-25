import { importExtensionScript } from "./helpers/extension-runtime.js";

import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await importExtensionScript("collector/extension/usage-windows.js");
});

describe("CodexUsageWindows runtime availability", () => {
  it("defaults to weekly until a successful sample is stored", () => {
    expect(globalThis.CodexUsageWindows.selectableWindowKeys({})).toEqual([
      "weekly",
    ]);
  });

  it("offers only windows present in the latest normalized sample", () => {
    const windows = globalThis.CodexUsageWindows;

    expect(windows.selectableWindowKeys({ weekly: {} })).toEqual(["weekly"]);
    expect(windows.isSelectableWindowKey({ weekly: {} }, "fiveHour")).toBe(
      false,
    );
    expect(windows.selectableWindowKeys({ fiveHour: {}, weekly: {} })).toEqual([
      "weekly",
      "fiveHour",
    ]);
    expect(
      windows.isSelectableWindowKey({ fiveHour: {}, weekly: {} }, "fiveHour"),
    ).toBe(true);
  });
});

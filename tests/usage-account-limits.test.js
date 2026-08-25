import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

describe("CodexWeeklyUsage account limits", () => {
  it("ignores additional model limits when resolving account windows", () => {
    const usage = globalThis.CodexWeeklyUsage.normalizeWhamUsage({
      rate_limit: {
        primary_window: {
          used_percent: 10,
          reset_at: "2026-05-26T12:00:00.000Z",
          window_duration_mins: 7 * 24 * 60,
        },
      },
      additional_rate_limits: [
        {
          limit_name: "model-specific",
          metered_feature: "model-specific",
          rate_limit: {
            primary_window: {
              used_percent: 20,
              reset_at: "2026-05-25T17:00:00.000Z",
              window_duration_mins: 5 * 60,
            },
          },
        },
      ],
    });

    expect(usage.windows.weekly).toMatchObject({
      remainingPercent: 90,
      windowMinutes: 10080,
    });
    expect(usage.windows).not.toHaveProperty("fiveHour");
  });
});

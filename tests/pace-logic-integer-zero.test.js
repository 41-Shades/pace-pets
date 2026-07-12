import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

describe("PacePetsLogic integer-provider zero history", () => {
  it("documents integer-provider zero presentation behavior", () => {
    const earlyWindow = {
      remainingPercent: 0,
      resetsAt: "2026-05-25T12:02:00.000Z",
      windowMinutes: 300,
    };
    const earlyAtMs = Date.parse("2026-05-25T12:00:00.000Z");
    const earlyPresentation =
      globalThis.PacePetsLogic.pacePresentationForWindow(earlyWindow, {
        atMs: earlyAtMs,
      });

    expect(earlyPresentation.state.key).toBe("splat");
    expect(earlyPresentation.displayRatio).toBe(0);

    const finalAtMs = Date.parse("2026-05-25T12:01:30.000Z");
    const finalPresentation =
      globalThis.PacePetsLogic.pacePresentationForWindow(earlyWindow, {
        atMs: finalAtMs,
      });

    expect(finalPresentation.state.key).toBe("singularity");

    const history = {
      samples: [
        {
          collectedAt: "2026-05-25T12:00:00.000Z",
          windows: {
            weekly: earlyWindow,
          },
        },
      ],
    };

    expect(
      globalThis.PacePetsLogic.allowsPerfectZeroForWindow(
        history,
        "weekly",
        earlyWindow,
      ),
    ).toBe(false);
    const blockedFinalPresentation =
      globalThis.PacePetsLogic.pacePresentationForWindow(earlyWindow, {
        allowPerfectZero: false,
        atMs: finalAtMs,
      });
    expect(blockedFinalPresentation.state.key).toBe("splat");
    expect(blockedFinalPresentation.displayRatio).toBe(0);

    expect(
      globalThis.PacePetsLogic.pacePresentationForWindow(earlyWindow, {
        allowPerfectZero: false,
        atMs: Date.parse("2026-05-25T12:02:00.000Z"),
      }),
    ).toMatchObject({
      displayRatio: null,
      paceRatio: null,
      state: { key: "muted" },
    });
  });
});

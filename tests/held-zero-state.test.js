import { describe, expect, it } from "vitest";

import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

installExtensionRuntimeHooks();

describe("PacePetsHeldZeroState", () => {
  it("normalizes only reset-keyed semantic zero states", () => {
    const held = globalThis.PacePetsHeldZeroState.normalizeHeldZeroStates({
      fiveHour: {
        resetsAt: "2026-05-25T17:00:00.000Z",
        stateKey: "splat",
      },
      weekly: {
        resetsAt: "invalid",
        stateKey: "singularity",
      },
      unsupported: {
        resetsAt: "2026-05-25T17:00:00.000Z",
        stateKey: "perfectZero",
      },
    });

    expect(held).toEqual({
      fiveHour: {
        resetsAt: "2026-05-25T17:00:00.000Z",
        stateKey: "splat",
      },
    });
    expect(
      globalThis.PacePetsHeldZeroState.stateKeyForWindow(held, "fiveHour", {
        resetsAt: "2026-05-25T17:00:00.000Z",
      }),
    ).toBe("splat");
    expect(
      globalThis.PacePetsHeldZeroState.stateKeyForWindow(held, "fiveHour", {
        resetsAt: "2026-05-25T18:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("records active states, preserves stale identity, and clears new resets", () => {
    const contract = globalThis.PacePetsHeldZeroState;
    const resetAt = "2026-05-25T12:01:00.000Z";
    const windows = { weekly: { resetsAt: resetAt } };
    const active = contract.nextHeldZeroStates(
      {},
      windows,
      { weekly: "splat" },
      Date.parse("2026-05-25T12:00:00.000Z"),
    );
    expect(active.weekly.stateKey).toBe("splat");

    const progressed = contract.nextHeldZeroStates(
      active,
      windows,
      { weekly: "singularity" },
      Date.parse("2026-05-25T12:00:30.000Z"),
    );
    expect(progressed.weekly.stateKey).toBe("singularity");

    const stale = contract.nextHeldZeroStates(
      progressed,
      windows,
      { weekly: "muted" },
      Date.parse("2026-05-25T12:02:00.000Z"),
    );
    expect(stale).toEqual(progressed);

    expect(
      contract.nextHeldZeroStates(
        stale,
        { weekly: { resetsAt: "2026-05-26T12:01:00.000Z" } },
        { weekly: "on" },
        Date.parse("2026-05-25T12:03:00.000Z"),
      ),
    ).toEqual({});
  });

  it("merges same-reset holds by semantic terminal precedence", () => {
    const contract = globalThis.PacePetsHeldZeroState;
    const resetsAt = "2026-05-25T12:01:00.000Z";
    expect(
      contract.mergeHeldZeroStates(
        { weekly: { resetsAt, stateKey: "perfectZero" } },
        { weekly: { resetsAt, stateKey: "singularity" } },
      ),
    ).toEqual({ weekly: { resetsAt, stateKey: "singularity" } });
    expect(
      contract.mergeHeldZeroStates(
        { weekly: { resetsAt, stateKey: "singularity" } },
        { weekly: { resetsAt, stateKey: "splat" } },
      ),
    ).toEqual({ weekly: { resetsAt, stateKey: "splat" } });
  });
});

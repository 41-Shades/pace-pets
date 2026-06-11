import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

describe("PacePetsRefreshControl", () => {
  it("owns manual refresh message, response, and cooldown semantics", () => {
    const refreshControl = globalThis.PacePetsRefreshControl;
    const refreshState = globalThis.CodexRefreshStatus.successState({
      refreshedAt: "2026-05-25T12:00:00.000Z",
      sampleCount: 2,
      stored: true,
    });

    expect(refreshControl.refreshNowMessage()).toEqual({
      type: refreshControl.REFRESH_NOW_MESSAGE_TYPE,
    });
    expect(
      refreshControl.isRefreshNowMessage(refreshControl.refreshNowMessage()),
    ).toBe(true);
    expect(refreshControl.isRefreshNowMessage({ type: "other" })).toBe(false);
    expect(refreshControl.cooldownRemainingMs(1_750, 1_000)).toBe(750);
    expect(refreshControl.refreshNowResponse(refreshState)).toMatchObject({
      ok: true,
      refreshStatus: {
        ok: true,
        refreshedAt: "2026-05-25T12:00:00.000Z",
        sampleCount: 2,
        stored: true,
      },
    });

    const cooldownResponse = refreshControl.manualRefreshCooldownResponse(
      refreshState,
      1_250,
    );
    expect(cooldownResponse).toMatchObject({
      ok: false,
      cooldownRemainingMs: 1_250,
      refreshStatus: {
        ok: true,
      },
    });
    expect(
      refreshControl.isManualRefreshCooldownResponse(cooldownResponse),
    ).toBe(true);
    expect(
      refreshControl.responseCooldownUntilMs(cooldownResponse, 2_000),
    ).toBe(3_250);
    expect(refreshControl.manualRefreshResponseFailed(cooldownResponse)).toBe(
      false,
    );
  });

  it("normalizes manual refresh failures without leaking secrets", () => {
    const refreshControl = globalThis.PacePetsRefreshControl;

    expect(
      refreshControl.manualRefreshResponseFailed({
        ok: false,
        refreshStatus: null,
        message: "Request failed.",
      }),
    ).toBe(true);
    expect(
      refreshControl.manualRefreshResponseFailed({
        ok: true,
        refreshStatus: { ok: true },
      }),
    ).toBe(false);
    expect(
      refreshControl.refreshErrorResponse({
        message: "Bearer root-secret failed",
      }),
    ).toEqual({
      ok: false,
      refreshStatus: null,
      message: "Bearer [redacted] failed",
    });
    expect(refreshControl.responseCooldownUntilMs({ ok: false }, 2_000)).toBe(
      null,
    );
  });
});

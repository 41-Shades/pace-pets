import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

describe("PacePetsRefreshControl clear data", () => {
  it("owns the background clear-data message contract", () => {
    const refreshControl = globalThis.PacePetsRefreshControl;
    const result = {
      history: { historyVersion: 1, samples: [] },
      refreshStatus: null,
    };

    expect(refreshControl.clearUsageDataMessage()).toEqual({
      type: refreshControl.CLEAR_USAGE_DATA_MESSAGE_TYPE,
    });
    expect(
      refreshControl.isClearUsageDataMessage(
        refreshControl.clearUsageDataMessage(),
      ),
    ).toBe(true);
    expect(refreshControl.isClearUsageDataMessage({ type: "other" })).toBe(
      false,
    );
    expect(refreshControl.clearUsageDataResponse(result)).toEqual({
      ok: true,
      ...result,
    });
    expect(refreshControl.clearUsageDataErrorResponse()).toEqual({
      ok: false,
      message: refreshControl.CLEAR_USAGE_DATA_FAILURE_MESSAGE,
    });
  });
});

describe("PacePetsRefreshControl manual refresh", () => {
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

describe("PacePetsRefreshControl persistent manual refresh cooldown", () => {
  it("normalizes persistent manual refresh cooldown storage", () => {
    const refreshControl = globalThis.PacePetsRefreshControl;
    const nowMs = Date.parse("2026-05-25T12:00:00.000Z");
    const cooldownUntil = "2026-05-25T12:01:00.000Z";
    const poisonedCooldownUntil = "2026-05-25T13:00:00.000Z";

    expect(refreshControl.MANUAL_REFRESH_COOLDOWN_STORAGE_KEY).toBe(
      "pacePetsManualRefreshCooldownUntil",
    );
    expect(refreshControl.manualRefreshCooldownUntilMs(cooldownUntil)).toBe(
      Date.parse(cooldownUntil),
    );
    expect(refreshControl.manualRefreshCooldownUntilMs("not a date")).toBe(0);
    expect(
      refreshControl.manualRefreshCooldownUntilMs(poisonedCooldownUntil, nowMs),
    ).toBe(0);
    expect(
      refreshControl.cooldownRemainingMs(poisonedCooldownUntil, nowMs),
    ).toBe(0);
    expect(
      refreshControl.manualRefreshCooldownStorageValue(
        Date.parse(cooldownUntil),
      ),
    ).toBe(cooldownUntil);
    expect(refreshControl.manualRefreshCooldownStorageValue("not a date")).toBe(
      null,
    );
    expect(
      refreshControl.manualRefreshCooldownStorageValue(
        poisonedCooldownUntil,
        nowMs,
      ),
    ).toBeNull();
  });
});

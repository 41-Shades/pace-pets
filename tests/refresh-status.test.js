import { describe, expect, it } from "vitest";

import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

installExtensionRuntimeHooks();

describe("CodexRefreshStatus states", () => {
  it("builds an observable refresh success", () => {
    const status = globalThis.CodexRefreshStatus;

    expect(
      status.successState({
        badgePaceRatio: 0.75,
        badgeWindowKey: "weekly",
        heldZeroStates: {
          weekly: {
            resetsAt: "2026-05-25T13:00:00.000Z",
            stateKey: "splat",
          },
        },
        refreshedAt: "2026-05-25T12:00:00.000Z",
        sampleCount: 3,
        stored: true,
        windows: { weekly: { remainingPercent: 80 } },
      }),
    ).toMatchObject({
      ok: true,
      message: status.SUCCESS_STORED_MESSAGE,
      authFailure: false,
      statusCode: null,
      refreshedAt: "2026-05-25T12:00:00.000Z",
      badgeWindowKey: "weekly",
      badgePaceRatio: 0.75,
      heldZeroStates: {
        weekly: {
          resetsAt: "2026-05-25T13:00:00.000Z",
          stateKey: "splat",
        },
      },
      sampleCount: 3,
      stored: true,
    });
  });
});

describe("CodexRefreshStatus failure state", () => {
  it("builds an observable failure while preserving semantic holds", () => {
    const status = globalThis.CodexRefreshStatus;
    const failure = status.failureState(
      {
        message:
          "Request failed with Authorization: Bearer secret-token and accessToken=second-secret",
        authFailure: true,
        statusCode: 401,
      },
      {
        heldZeroStates: {
          weekly: {
            resetsAt: "2026-05-25T13:00:00.000Z",
            stateKey: "singularity",
          },
        },
        refreshedAt: "2026-05-25T12:00:00.000Z",
      },
    );

    expect(failure).toMatchObject({
      ok: false,
      authFailure: true,
      statusCode: 401,
      refreshedAt: "2026-05-25T12:00:00.000Z",
      windows: null,
      badgeWindowKey: null,
      badgePaceRatio: null,
      heldZeroStates: {
        weekly: {
          resetsAt: "2026-05-25T13:00:00.000Z",
          stateKey: "singularity",
        },
      },
      sampleCount: 0,
      stored: null,
    });
    expect(failure.message).not.toContain("secret-token");
    expect(failure.message).not.toContain("second-secret");
    expect(failure.message).toContain("[redacted]");
  });
});

describe("CodexRefreshStatus normalization", () => {
  it("normalizes persisted refresh status shape", () => {
    expect(
      globalThis.CodexRefreshStatus.normalizeRefreshStatus({
        ok: false,
        message: "  failed\nbecause token was unavailable  ",
        authFailure: true,
        statusCode: "401",
        refreshedAt: "2026-05-25T11:59:00.000Z",
        badgeWindowKey: "fiveHour",
        badgePaceRatio: "1.25",
        heldZeroStates: {
          weekly: {
            resetsAt: "2026-05-25T13:00:00.000Z",
            stateKey: "invalid",
          },
        },
        sampleCount: "3",
        stored: false,
      }),
    ).toEqual({
      ok: false,
      message: "failed because token was unavailable",
      authFailure: true,
      statusCode: 401,
      refreshedAt: "2026-05-25T11:59:00.000Z",
      badgeWindowKey: null,
      badgePaceRatio: null,
      heldZeroStates: {},
      sampleCount: 3,
      stored: false,
    });
  });
});

describe("CodexRefreshStatus badge presentation", () => {
  it("normalizes successful badge and held-state metadata", () => {
    const status = globalThis.CodexRefreshStatus;

    expect(
      status.statusWithBadgePresentation(
        {
          ok: true,
          message: status.SUCCESS_STORED_MESSAGE,
          refreshedAt: "2026-05-25T12:00:00.000Z",
          sampleCount: 1,
          stored: true,
        },
        {
          badgePaceRatio: "1.0625",
          badgeWindowKey: "weekly",
          heldZeroStates: {
            fiveHour: {
              resetsAt: "2026-05-25T17:00:00.000Z",
              stateKey: "perfectZero",
            },
          },
          sampleCount: 2,
        },
      ),
    ).toMatchObject({
      ok: true,
      badgePaceRatio: 1.0625,
      badgeWindowKey: "weekly",
      heldZeroStates: {
        fiveHour: {
          resetsAt: "2026-05-25T17:00:00.000Z",
          stateKey: "perfectZero",
        },
      },
      sampleCount: 2,
      stored: true,
    });

    expect(
      status.statusWithBadgePresentation(
        {
          ok: false,
          message: "failed",
          refreshedAt: "2026-05-25T12:00:00.000Z",
        },
        { heldZeroStates: {} },
      ),
    ).toBeNull();
  });

  it("drops legacy presentation timestamps instead of retaining two paths", () => {
    const normalized = globalThis.CodexRefreshStatus.normalizeRefreshStatus({
      message: "Stored usage history locally.",
      ok: true,
      pacePresentationAt: "2026-05-25T12:01:00.000Z",
      pacePresentationSampleId: "sample-1",
      refreshedAt: "2026-05-25T12:00:00.000Z",
    });

    expect(normalized.heldZeroStates).toEqual({});
    expect(normalized).not.toHaveProperty("pacePresentationAt");
    expect(normalized).not.toHaveProperty("pacePresentationSampleId");
  });
});

describe("CodexRefreshStatus safe text", () => {
  it("redacts bearer tokens without leaking callback offsets", () => {
    const status = globalThis.CodexRefreshStatus;

    expect(
      status.safeFailureMessage({
        message: "Bearer root-secret failed",
      }),
    ).toBe("Bearer [redacted] failed");
    expect(
      status.safeFailureMessage({
        message: "Request failed with Bearer later-secret",
      }),
    ).toBe("Request failed with Bearer [redacted]");

    const labeledMessage = status.safeFailureMessage({
      message:
        "Request failed with Authorization: Bearer secret-token and accessToken=second-secret",
    });
    expect(labeledMessage).toBe(
      "Request failed with Authorization: [redacted] and accessToken: [redacted]",
    );
    expect(labeledMessage).not.toMatch(/\b\d+: \[redacted\]/);
    expect(labeledMessage).not.toContain("secret-token");
    expect(labeledMessage).not.toContain("second-secret");
  });
});

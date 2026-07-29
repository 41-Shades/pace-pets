import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const formatClockTime = (value) => `clock:${value}`;

async function importDashboardStatus() {
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/dashboard-status-logic.js"),
    )
  );
  await import(
    pathToFileURL(
      path.join(
        projectRoot,
        "collector/extension/dashboard-status-controller.js",
      ),
    )
  );
}

installExtensionRuntimeHooks();

beforeAll(async () => {
  await importDashboardStatus();
});

describe("PacePetsDashboardStatus empty history", () => {
  it("uses refresh schedule copy for automatic-check labels", () => {
    const schedule = globalThis.PacePetsRefreshSchedule;
    const status = globalThis.PacePetsDashboardStatusLogic;

    expect(status.AUTO_CHECKS_STATUS_TOOLTIP).toBe(
      schedule.AUTO_CHECKS_STATUS_TOOLTIP,
    );
    expect(status.CHECKS_EVERY_ARIA).toBe(schedule.CHECKS_EVERY_ARIA);
  });

  it("projects empty-history waiting and stale states from one policy", () => {
    const status = globalThis.PacePetsDashboardStatus;

    expect(
      status.emptyHistoryCollectionState({ formatClockTime }),
    ).toMatchObject({
      chartCopy: "Waiting for local history.",
      paceCopy: "No history yet in this void.",
      paceTitle: "Nothingness",
      status: {
        detail: "",
        manualRefresh: true,
        mode: "ok",
        text: "Waiting",
      },
    });

    expect(
      status.emptyHistoryCollectionState({
        formatClockTime,
        refreshStatus: {
          ok: true,
          refreshedAt: "2026-05-25T11:00:00.000Z",
        },
      }).status,
    ).toEqual({
      detail: "",
      manualRefresh: true,
      mode: "stale",
      text: "Refresh needed",
    });
  });

  it("uses permission-specific Nothingness copy before the first check", () => {
    const status = globalThis.PacePetsDashboardStatus;

    expect(
      status.emptyHistoryCollectionState({
        formatClockTime,
        hasChatGptAccess: false,
      }),
    ).toEqual({
      chartCopy: "Grant access to begin.",
      paceCopy: "Grant access to escape the void.",
      paceTitle: "Nothingness",
      status: {
        detail: "",
        manualRefresh: true,
        manualRefreshLabel: "Allow & check",
        mode: "warning",
        text: "Access needed",
      },
    });
  });

  it("projects empty-history failure copy and collection status together", () => {
    const status = globalThis.PacePetsDashboardStatus;
    const state = status.emptyHistoryCollectionState({
      formatClockTime,
      refreshStatus: {
        authFailure: true,
        message: "No session",
        ok: false,
        refreshedAt: "2026-05-25T11:55:00.000Z",
      },
    });

    expect(state).toMatchObject({
      chartCopy: "ChatGPT sign-in not found",
      paceCopy: "ChatGPT sign-in not found in this void.",
      paceTitle: "Nothingness",
      status: {
        manualRefresh: true,
        mode: "warning",
        text: "ChatGPT sign-in not found",
      },
    });
    expect(state.status.detail).toContain(
      "Latest check failed because ChatGPT sign-in was not found.",
    );
    expect(state.status.detail).toContain(
      "attempt clock:2026-05-25T11:55:00.000Z",
    );
  });
});

describe("PacePetsDashboardStatus permission state", () => {
  it("keeps stored history while surfacing revoked access", () => {
    const status = globalThis.PacePetsDashboardStatus;

    expect(
      status.historyCollectionStatusState({
        hasAnySupportedWindow: true,
        hasChatGptAccess: false,
        hasResetTiming: true,
        summaryWindow: {},
      }),
    ).toEqual({
      detail: "",
      manualRefresh: true,
      manualRefreshLabel: "Allow & check",
      mode: "warning",
      text: "Access needed",
    });
  });
});

describe("PacePetsDashboardStatus populated history", () => {
  it("includes latest stored sample context for populated-history failures", () => {
    const status = globalThis.PacePetsDashboardStatus;

    expect(
      status.historyCollectionStatusState({
        formatClockTime,
        hasAnySupportedWindow: true,
        hasResetTiming: true,
        latest: { collectedAt: "2026-05-25T11:40:00.000Z" },
        refreshStatus: {
          message: "Fetch failed",
          ok: false,
          refreshedAt: "2026-05-25T11:55:00.000Z",
          statusCode: 503,
        },
        summaryWindow: { remainingPercent: 72 },
      }),
    ).toEqual({
      detail:
        "Fetch failed; HTTP 503; attempt clock:2026-05-25T11:55:00.000Z; stored clock:2026-05-25T11:40:00.000Z",
      manualRefresh: true,
      mode: "error",
      text: "Check failed",
    });
  });

  it("projects populated-history stale, missing-window, and live statuses", () => {
    const status = globalThis.PacePetsDashboardStatus;
    const summaryWindow = { remainingPercent: 72 };

    expect(
      status.historyCollectionStatusState({
        formatClockTime,
        hasAnySupportedWindow: true,
        hasResetTiming: true,
        refreshStatus: {
          ok: true,
          refreshedAt: "2026-05-25T11:55:00.000Z",
        },
        staleWindow: true,
        summaryWindow,
      }),
    ).toEqual({
      detail: "",
      manualRefresh: true,
      mode: "live",
      text: "Waiting for reading",
    });

    expect(
      status.historyCollectionStatusState({
        formatClockTime,
        hasAnySupportedWindow: true,
        hasResetTiming: true,
        refreshStatus: {
          ok: true,
          refreshedAt: "2026-05-25T11:00:00.000Z",
        },
        summaryWindow,
      }),
    ).toEqual({
      detail: "",
      manualRefresh: true,
      mode: "stale",
      text: "Refresh needed",
    });

    expect(
      status.historyCollectionStatusState({
        formatClockTime,
        hasAnySupportedWindow: false,
        hasResetTiming: false,
        refreshStatus: {
          ok: true,
          refreshedAt: "2026-05-25T11:55:00.000Z",
        },
        summaryWindow: null,
      }),
    ).toEqual({
      detail: "",
      manualRefresh: true,
      mode: "warning",
      text: "Waiting",
    });

    expect(
      status.historyCollectionStatusState({
        formatClockTime,
        hasAnySupportedWindow: true,
        hasResetTiming: true,
        manualRefreshLeadWindow: true,
        refreshStatus: {
          ok: true,
          refreshedAt: "2026-05-25T11:55:00.000Z",
        },
        summaryWindow,
      }),
    ).toEqual({
      detail: "",
      manualRefresh: true,
      mode: "live",
      text: "Live",
    });
  });
});

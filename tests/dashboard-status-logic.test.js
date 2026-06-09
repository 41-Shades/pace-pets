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
  it("projects empty-history waiting and stale states from one policy", () => {
    const status = globalThis.PacePetsDashboardStatus;

    expect(
      status.emptyHistoryCollectionState({ formatClockTime }),
    ).toMatchObject({
      chartCopy: "Waiting for local history.",
      paceCopy: "Waiting for the first automatic usage check.",
      paceTitle: "No history yet",
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
      paceCopy: "Open ChatGPT to resume checks.",
      paceTitle: "ChatGPT sign-in not found",
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
      manualRefresh: false,
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

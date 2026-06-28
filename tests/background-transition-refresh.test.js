import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function importExtensionScript(source) {
  await import(
    pathToFileURL(path.join(projectRoot, "collector/extension", source))
  );
}

installExtensionRuntimeHooks();

beforeAll(async () => {
  await importExtensionScript("background-transition-refresh.js");
});

function weeklyWindow(overrides = {}) {
  return {
    remainingPercent: 2,
    resetsAt: "2026-05-25T12:10:00.000Z",
    windowMinutes: 10080,
    ...overrides,
  };
}

describe("PacePetsBackgroundTransitionRefresh watch windows", () => {
  it("watches valid windows at usage, time, and stale reset thresholds", () => {
    const transition = globalThis.PacePetsBackgroundTransitionRefresh;
    const atMs = Date.parse("2026-05-25T12:00:00.000Z");

    expect(transition.isTransitionWatchWindow(weeklyWindow(), atMs)).toBe(true);
    expect(
      transition.isTransitionWatchWindow(
        weeklyWindow({
          remainingPercent: 2.1,
          resetsAt: "2026-05-25T14:00:00.000Z",
          windowMinutes: 300,
        }),
        atMs,
      ),
    ).toBe(false);
    expect(
      transition.isTransitionWatchWindow(
        weeklyWindow({ remainingPercent: 0, resetsAt: "not-a-date" }),
        atMs,
      ),
    ).toBe(false);
    expect(
      transition.isTransitionWatchWindow(
        weeklyWindow({
          remainingPercent: 42,
          resetsAt: "2026-05-25T12:01:00.000Z",
          windowMinutes: 300,
        }),
        atMs,
      ),
    ).toBe(true);
    expect(
      transition.isTransitionWatchWindow(
        weeklyWindow({
          remainingPercent: 42,
          resetsAt: "2026-05-25T11:59:00.000Z",
          windowMinutes: 300,
        }),
        atMs,
      ),
    ).toBe(true);
    expect(
      transition.transitionWatchWindowKeys({
        fiveHour: weeklyWindow({ remainingPercent: 1 }),
        weekly: weeklyWindow({
          remainingPercent: 42,
          resetsAt: "2026-05-25T14:00:00.000Z",
          windowMinutes: 300,
        }),
      }),
    ).toEqual(["fiveHour"]);
  });

  it("runs transition refreshes no more than once per minute", () => {
    const transition = globalThis.PacePetsBackgroundTransitionRefresh;
    const windows = { weekly: weeklyWindow() };
    const recentStatus = {
      ok: true,
      refreshedAt: "2026-05-25T11:59:30.000Z",
    };
    const dueStatus = {
      ok: true,
      refreshedAt: "2026-05-25T11:59:00.000Z",
    };
    const atMs = Date.parse("2026-05-25T12:00:00.000Z");

    expect(
      transition.shouldRunTransitionRefresh({
        atMs,
        refreshStatus: recentStatus,
        windows,
      }),
    ).toBe(false);
    expect(
      transition.shouldRunTransitionRefresh({
        atMs,
        refreshStatus: dueStatus,
        windows,
      }),
    ).toBe(true);
    expect(
      transition.shouldRunTransitionRefresh({
        atMs,
        refreshStatus: { ok: false, refreshedAt: dueStatus.refreshedAt },
        windows,
      }),
    ).toBe(false);
  });
});

describe("PacePetsBackgroundTransitionRefresh runner", () => {
  it("promotes a badge presentation wakeup to a usage refresh in transition watch", async () => {
    const transition = globalThis.PacePetsBackgroundTransitionRefresh;
    const runScheduledRefresh = vi.fn(async () => "refreshed");
    const updatePaceBadgeFromHistory = vi.fn();

    await expect(
      transition.run({
        lastRefreshState: null,
        readHistory: async () => ({
          samples: [{ windows: { weekly: weeklyWindow() } }],
        }),
        readRefreshStatus: async () => ({
          ok: true,
          refreshedAt: "2026-05-25T11:59:00.000Z",
        }),
        runScheduledRefresh,
        scheduledRefreshActive: () => false,
        updatePaceBadgeFromHistory,
      }),
    ).resolves.toBe("refreshed");

    expect(runScheduledRefresh).toHaveBeenCalledOnce();
    expect(updatePaceBadgeFromHistory).not.toHaveBeenCalled();
  });

  it("keeps presentation-only refreshes outside transition watch", async () => {
    const transition = globalThis.PacePetsBackgroundTransitionRefresh;
    const refreshStatus = {
      ok: true,
      refreshedAt: "2026-05-25T11:59:00.000Z",
    };
    const updatePaceBadgeFromHistory = vi.fn(async () => "badge");

    await expect(
      transition.run({
        lastRefreshState: null,
        readHistory: async () => ({
          samples: [
            {
              windows: {
                weekly: weeklyWindow({
                  remainingPercent: 42,
                  resetsAt: "2026-05-25T14:00:00.000Z",
                  windowMinutes: 300,
                }),
              },
            },
          ],
        }),
        readRefreshStatus: async () => refreshStatus,
        runScheduledRefresh: vi.fn(),
        scheduledRefreshActive: () => false,
        updatePaceBadgeFromHistory,
      }),
    ).resolves.toBe("badge");

    expect(updatePaceBadgeFromHistory).toHaveBeenCalledWith({
      refreshStatus,
    });
  });
});

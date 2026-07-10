import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function deferredPromise() {
  let reject;
  let resolve;
  const promise = new Promise((promiseResolve, promiseReject) => {
    reject = promiseReject;
    resolve = promiseResolve;
  });
  return { promise, reject, resolve };
}

beforeAll(async () => {
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/dashboard-state-loader.js"),
    )
  );
});

describe("PacePetsDashboardStateLoader", () => {
  it("allows only the newest asynchronous dashboard load to commit", async () => {
    const firstLoad = deferredPromise();
    const secondLoad = deferredPromise();
    const applyState = vi.fn();
    const readState = vi
      .fn()
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);
    const loader = globalThis.PacePetsDashboardStateLoader.createController({
      applyState,
      readState,
    });

    const firstResult = loader.load({ refreshWindowSelection: true });
    expect(loader.isLoading()).toBe(true);
    const secondResult = loader.load({ refreshWindowSelection: false });
    firstLoad.resolve({ selectedWindowKey: "weekly" });

    await expect(firstResult).resolves.toBe(false);
    expect(loader.isLoading()).toBe(true);
    expect(applyState).not.toHaveBeenCalled();

    secondLoad.resolve({ selectedWindowKey: "fiveHour" });

    await expect(secondResult).resolves.toBe(true);
    expect(loader.isLoading()).toBe(false);
    expect(applyState).toHaveBeenCalledOnce();
    expect(applyState).toHaveBeenCalledWith({
      selectedWindowKey: "fiveHour",
    });
    expect(readState).toHaveBeenNthCalledWith(1, {
      refreshWindowSelection: true,
    });
    expect(readState).toHaveBeenNthCalledWith(2, {
      refreshWindowSelection: false,
    });
  });

  it("invalidates a pending load before an external state commit", async () => {
    const pendingLoad = deferredPromise();
    const applyState = vi.fn();
    const loader = globalThis.PacePetsDashboardStateLoader.createController({
      applyState,
      readState: vi.fn(() => pendingLoad.promise),
    });
    const result = loader.load();

    loader.invalidate();
    expect(loader.isLoading()).toBe(false);
    pendingLoad.resolve({ history: "stale" });

    await expect(result).resolves.toBe(false);
    expect(applyState).not.toHaveBeenCalled();
  });

  it("absorbs a rejected read after a newer load commits", async () => {
    const staleLoad = deferredPromise();
    const currentLoad = deferredPromise();
    const applyState = vi.fn();
    const readState = vi
      .fn()
      .mockReturnValueOnce(staleLoad.promise)
      .mockReturnValueOnce(currentLoad.promise);
    const loader = globalThis.PacePetsDashboardStateLoader.createController({
      applyState,
      readState,
    });
    const staleResult = loader.load();
    const currentResult = loader.load();
    currentLoad.resolve({ history: "current" });

    await expect(currentResult).resolves.toBe(true);
    staleLoad.reject(new Error("stale read failed"));

    await expect(staleResult).resolves.toBe(false);
    expect(applyState).toHaveBeenCalledOnce();
    expect(applyState).toHaveBeenCalledWith({ history: "current" });
  });

  it("rethrows an error from the current load", async () => {
    const error = new Error("current read failed");
    const loader = globalThis.PacePetsDashboardStateLoader.createController({
      applyState: vi.fn(),
      readState: vi.fn(() => Promise.reject(error)),
    });

    await expect(loader.load()).rejects.toBe(error);
  });
});

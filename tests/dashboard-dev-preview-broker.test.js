import {
  importExtensionScript,
  installExtensionRuntimeHooks,
} from "./helpers/extension-runtime.js";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

function eventChannel() {
  const listeners = [];
  return {
    addListener: vi.fn((listener) => listeners.push(listener)),
    emit: (message) => listeners.forEach((listener) => listener(message)),
  };
}

function dashboardPort() {
  return {
    onDisconnect: eventChannel(),
    onMessage: eventChannel(),
    postMessage: vi.fn(),
  };
}

installExtensionRuntimeHooks();

beforeAll(async () => {
  await importExtensionScript(
    "collector/extension/dashboard-dev-preview-broker.js",
  );
});

beforeEach(() => {
  globalThis.document = {
    addEventListener: vi.fn(),
    hasFocus: vi.fn(() => true),
    hidden: false,
  };
  globalThis.addEventListener = vi.fn();
});

describe("PacePetsDashboardDevPreviewBroker", () => {
  it("registers one port and returns request-correlated action results", async () => {
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    const port = dashboardPort();
    globalThis.chrome.runtime.connect = vi.fn(() => port);
    const broker =
      globalThis.PacePetsDashboardDevPreviewBroker.createController();
    const handler = vi.fn(() => ({ ok: true }));
    broker.registerHandler(registry.ACTION_KEYS.brakeMaxBurst, handler);

    broker.start();

    expect(globalThis.chrome.runtime.connect).toHaveBeenCalledWith({
      name: registry.BROKER.portName,
    });
    expect(port.postMessage).toHaveBeenCalledWith(
      registry.dashboardStatusMessage({ focused: true, visible: true }),
    );

    const execution = registry.brokerExecutionForRequest(
      registry.brokerRequestForKey(
        registry.ACTION_KEYS.brakeMaxBurst,
        "request-dashboard",
      ),
    );
    port.onMessage.emit(execution);
    await Promise.resolve();
    await Promise.resolve();

    expect(handler).toHaveBeenCalledOnce();
    expect(port.postMessage).toHaveBeenLastCalledWith(
      registry.brokerResultForExecution(execution, { ok: true }),
    );
  });

  it("does not execute preview work in a hidden dashboard", async () => {
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    const port = dashboardPort();
    globalThis.document.hidden = true;
    globalThis.chrome.runtime.connect = vi.fn(() => port);
    const broker =
      globalThis.PacePetsDashboardDevPreviewBroker.createController();
    const handler = vi.fn(() => ({ ok: true }));
    broker.registerHandler(registry.ACTION_KEYS.rareSweat, handler);
    broker.start();
    const execution = registry.brokerExecutionForRequest(
      registry.brokerRequestForKey(
        registry.ACTION_KEYS.rareSweat,
        "request-hidden",
      ),
    );

    port.onMessage.emit(execution);
    await Promise.resolve();
    await Promise.resolve();

    expect(handler).not.toHaveBeenCalled();
    expect(port.postMessage).toHaveBeenLastCalledWith(
      registry.brokerResultForExecution(execution, {
        message:
          "Open the dashboard on Push harder before previewing Rare burst (5%).",
        ok: false,
      }),
    );
  });
});

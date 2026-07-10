import {
  importExtensionScript,
  installExtensionRuntimeHooks,
} from "./helpers/extension-runtime.js";

import { beforeAll, describe, expect, it, vi } from "vitest";

function eventChannel() {
  const listeners = [];
  return {
    addListener: vi.fn((listener) => listeners.push(listener)),
    emit: (message) => listeners.forEach((listener) => listener(message)),
  };
}

function dashboardPort() {
  return {
    name: globalThis.PacePetsDevPreviewActionRegistry.BROKER.portName,
    onDisconnect: eventChannel(),
    onMessage: eventChannel(),
    postMessage: vi.fn(),
  };
}

function sendStatus(port, { focused, visible }) {
  const registry = globalThis.PacePetsDevPreviewActionRegistry;
  port.onMessage.emit(registry.dashboardStatusMessage({ focused, visible }));
}

installExtensionRuntimeHooks();

beforeAll(async () => {
  await importExtensionScript(
    "collector/extension/background-dev-preview-broker.js",
  );
});

describe("PacePetsBackgroundDevPreviewBroker", () => {
  it("tries ranked dashboards sequentially and accepts one successful owner", () => {
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    const broker =
      globalThis.PacePetsBackgroundDevPreviewBroker.createController();
    const olderDashboard = dashboardPort();
    const activeDashboard = dashboardPort();
    const sendResponse = vi.fn();
    broker.connectDashboard(olderDashboard);
    broker.connectDashboard(activeDashboard);
    sendStatus(olderDashboard, { focused: false, visible: true });
    sendStatus(activeDashboard, { focused: true, visible: true });
    const request = registry.brokerRequestForKey(
      registry.ACTION_KEYS.brakeMaxBurst,
      "request-ranked",
    );

    expect(broker.handleRequest(request, sendResponse)).toBe(true);
    expect(activeDashboard.postMessage).toHaveBeenCalledOnce();
    expect(olderDashboard.postMessage).not.toHaveBeenCalled();

    const activeExecution = activeDashboard.postMessage.mock.calls[0][0];
    activeDashboard.onMessage.emit(
      registry.brokerResultForExecution(activeExecution, { ok: false }),
    );

    expect(olderDashboard.postMessage).toHaveBeenCalledOnce();
    expect(sendResponse).not.toHaveBeenCalled();

    const olderExecution = olderDashboard.postMessage.mock.calls[0][0];
    olderDashboard.onMessage.emit(
      registry.brokerResultForExecution(olderExecution, { ok: true }),
    );

    expect(sendResponse).toHaveBeenCalledOnce();
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      requestId: "request-ranked",
    });
  });

  it("returns a correlated fallback when no dashboard is connected", () => {
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    const broker =
      globalThis.PacePetsBackgroundDevPreviewBroker.createController();
    const sendResponse = vi.fn();
    const request = registry.brokerRequestForKey(
      registry.ACTION_KEYS.rareSweat,
      "request-empty",
    );

    expect(broker.handleRequest(request, sendResponse)).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({
      message:
        "Open the dashboard on Push harder before previewing Rare burst (5%).",
      ok: false,
      requestId: "request-empty",
    });
  });
});

describe("PacePetsBackgroundDevPreviewBroker delivery safety", () => {
  it("does not redispatch after a delivered owner times out", () => {
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    const brokerContract = globalThis.PacePetsBackgroundDevPreviewBroker;
    const broker = brokerContract.createController();
    const firstDashboard = dashboardPort();
    const secondDashboard = dashboardPort();
    const sendResponse = vi.fn();
    broker.connectDashboard(firstDashboard);
    broker.connectDashboard(secondDashboard);
    const request = registry.brokerRequestForKey(
      registry.ACTION_KEYS.checkerboardReveal,
      "request-timeout",
    );

    broker.handleRequest(request, sendResponse);
    expect(secondDashboard.postMessage).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(brokerContract.REQUEST_TIMEOUT_MS);

    expect(firstDashboard.postMessage).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({
      message: "The dashboard did not respond to the preview request.",
      ok: false,
      requestId: "request-timeout",
    });
  });

  it("does not redispatch after the current owner disconnects", () => {
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    const broker =
      globalThis.PacePetsBackgroundDevPreviewBroker.createController();
    const standbyDashboard = dashboardPort();
    const ownerDashboard = dashboardPort();
    const sendResponse = vi.fn();
    broker.connectDashboard(standbyDashboard);
    broker.connectDashboard(ownerDashboard);
    const request = registry.brokerRequestForKey(
      registry.ACTION_KEYS.bigBangReplay,
      "request-disconnect",
    );

    broker.handleRequest(request, sendResponse);
    expect(ownerDashboard.postMessage).toHaveBeenCalledOnce();
    ownerDashboard.onDisconnect.emit();

    expect(standbyDashboard.postMessage).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({
      message: "The dashboard closed before the preview completed.",
      ok: false,
      requestId: "request-disconnect",
    });
  });

  it("does not redispatch a non-retryable dashboard failure", () => {
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    const broker =
      globalThis.PacePetsBackgroundDevPreviewBroker.createController();
    const standbyDashboard = dashboardPort();
    const ownerDashboard = dashboardPort();
    const sendResponse = vi.fn();
    broker.connectDashboard(standbyDashboard);
    broker.connectDashboard(ownerDashboard);
    const request = registry.brokerRequestForKey(
      registry.ACTION_KEYS.paceStateTransition,
      "request-non-retryable",
    );
    broker.handleRequest(request, sendResponse);
    const execution = ownerDashboard.postMessage.mock.calls[0][0];

    ownerDashboard.onMessage.emit(
      registry.brokerResultForExecution(execution, {
        message: "Preview handler failed after dispatch.",
        ok: false,
        retryable: false,
      }),
    );

    expect(standbyDashboard.postMessage).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({
      message: "Preview handler failed after dispatch.",
      ok: false,
      requestId: "request-non-retryable",
    });
  });
});

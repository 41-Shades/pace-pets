import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";

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
  await importExtensionScript("dev-flags-preview-actions.js");
});

describe("PacePetsDevPreviewActionRegistry", () => {
  it("owns preview action metadata and message contracts", () => {
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    const actionKey = registry.ACTION_KEYS.brakeMaxBurst;
    const action = registry.requireActionForKey(actionKey);

    expect(action).toMatchObject({
      fallbackErrorMessage:
        "Open the dashboard on Brake hard before previewing Max debris burst.",
      key: "brakeMaxBurst",
      label: "Max debris burst",
      responseRequired: true,
      status: "Max debris burst preview requested.",
    });
    expect(Object.isFrozen(action)).toBe(true);
    expect(() => registry.messageForKey(actionKey)).toThrow(
      "Preview action requires the broker: brakeMaxBurst",
    );
    expect(registry.fallbackErrorMessageForKey(actionKey)).toBe(
      action.fallbackErrorMessage,
    );
    expect(registry.responseErrorMessage(actionKey, {})).toBe(
      action.fallbackErrorMessage,
    );
    expect(registry.controlForAction(actionKey).actionKey).toBe(actionKey);
    expect(
      registry.requireActionForKey(registry.ACTION_KEYS.bigBangReplay),
    ).toMatchObject({
      fallbackErrorMessage:
        "Open the dashboard on Big Bang before replaying Big Bang.",
      key: "bigBangReplay",
      label: "Replay Big Bang",
      responseRequired: true,
      status: "Big Bang replay requested.",
    });
    expect(
      registry.requireActionForKey(registry.ACTION_KEYS.rareSweat),
    ).toMatchObject({
      fallbackErrorMessage:
        "Open the dashboard on Push harder before previewing Rare burst (5%).",
      key: "rareSweat",
      label: "Rare burst (5%)",
      responseRequired: true,
      status: "Rare burst (5%) requested.",
    });
    expect(() => registry.requireActionForKey("unsupported")).toThrow(
      "Unknown dev preview action: unsupported",
    );
  });

  it("exposes direct messages only for fire-and-forget controls", () => {
    const registry = globalThis.PacePetsDevPreviewActionRegistry;

    expect(globalThis.PacePetsBrakeExtremePreviewControl).toEqual({
      actionKey: registry.ACTION_KEYS.brakeMaxBurst,
      fallbackErrorMessage: registry.fallbackErrorMessageForKey(
        registry.ACTION_KEYS.brakeMaxBurst,
      ),
    });
    expect(globalThis.PacePetsPushSweatPreviewControl).toEqual({
      actionKey: registry.ACTION_KEYS.rareSweat,
      fallbackErrorMessage: registry.fallbackErrorMessageForKey(
        registry.ACTION_KEYS.rareSweat,
      ),
    });
    expect(
      globalThis.PacePetsSyncMonkEscapePreviewControl.isLaunchMessage(
        registry.messageForKey(registry.ACTION_KEYS.monkEscape),
      ),
    ).toBe(true);
  });
});

describe("PacePetsDevPreviewActionRegistry broker transport", () => {
  it("sends response-backed preview actions through the shared request path", async () => {
    const actions = globalThis.PacePetsDevFlagsPreviewActions;
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    globalThis.chrome.runtime.sendMessage = vi.fn((message, done) => {
      done({ ok: false, requestId: message.requestId });
    });

    await expect(
      actions.requestPreviewAction(registry.ACTION_KEYS.rareSweat),
    ).rejects.toThrow(
      "Open the dashboard on Push harder before previewing Rare burst (5%).",
    );
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        actionKey: registry.ACTION_KEYS.rareSweat,
        requestId: expect.any(String),
        type: registry.BROKER.requestType,
      }),
      expect.any(Function),
    );
  });

  it("correlates broker execution and result messages by request ID", () => {
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    const request = registry.brokerRequestForKey(
      registry.ACTION_KEYS.checkerboardReveal,
      "request-123",
    );
    const execution = registry.brokerExecutionForRequest(request);
    const result = registry.brokerResultForExecution(execution, { ok: true });

    expect(request).toEqual({
      actionKey: registry.ACTION_KEYS.checkerboardReveal,
      requestId: "request-123",
      type: registry.BROKER.requestType,
    });
    expect(registry.isBrokerRequest(request)).toBe(true);
    expect(registry.isBrokerExecution(execution)).toBe(true);
    expect(registry.isBrokerResult(result)).toBe(true);
    expect(result).toEqual({
      actionKey: registry.ACTION_KEYS.checkerboardReveal,
      requestId: "request-123",
      response: { ok: true },
      retryable: false,
      type: registry.BROKER.resultType,
    });
    expect(registry.brokerResponseForRequest(request, result.response)).toEqual(
      { ok: true, requestId: "request-123" },
    );
  });

  it("rejects responses for a different broker request", async () => {
    const actions = globalThis.PacePetsDevFlagsPreviewActions;
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    globalThis.chrome.runtime.sendMessage = vi.fn((_message, done) => {
      done({ ok: true, requestId: "different-request" });
    });

    await expect(
      actions.requestPreviewAction(registry.ACTION_KEYS.brakeMaxBurst),
    ).rejects.toThrow("Dashboard preview response ID did not match.");
  });

  it("keeps fire-and-forget preview actions promise compatible", async () => {
    const actions = globalThis.PacePetsDevFlagsPreviewActions;
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    globalThis.chrome.runtime.sendMessage = vi.fn();

    await expect(
      actions.requestPreviewAction(registry.ACTION_KEYS.monkEscape),
    ).resolves.toBeUndefined();
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      registry.messageForKey(registry.ACTION_KEYS.monkEscape),
    );
  });
});

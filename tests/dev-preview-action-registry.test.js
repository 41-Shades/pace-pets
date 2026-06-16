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
    const message = registry.messageForKey(actionKey);

    expect(action).toMatchObject({
      fallbackErrorMessage:
        "Open the dashboard on Brake hard before previewing Max debris burst.",
      key: "brakeMaxBurst",
      label: "Max debris burst",
      messageType: "pacePets.brakeExtremePreview.max",
      responseRequired: true,
      status: "Max debris burst preview requested.",
    });
    expect(Object.isFrozen(action)).toBe(true);
    expect(message).toEqual({ type: action.messageType });
    expect(Object.isFrozen(message)).toBe(true);
    expect(registry.isMessageForKey(actionKey, message)).toBe(true);
    expect(registry.fallbackErrorMessageForKey(actionKey)).toBe(
      action.fallbackErrorMessage,
    );
    expect(registry.responseErrorMessage(actionKey, {})).toBe(
      action.fallbackErrorMessage,
    );
    expect(
      registry.requireActionForKey(registry.ACTION_KEYS.rareSweat),
    ).toMatchObject({
      fallbackErrorMessage:
        "Open the dashboard on Push harder before previewing Rare burst (5%).",
      key: "rareSweat",
      label: "Rare burst (5%)",
      messageType: "pacePets.pushSweatPreview.rare",
      responseRequired: true,
      status: "Rare burst (5%) requested.",
    });
    expect(() => registry.requireActionForKey("unsupported")).toThrow(
      "Unknown dev preview action: unsupported",
    );
  });

  it("keeps legacy preview controls backed by the shared registry", () => {
    const registry = globalThis.PacePetsDevPreviewActionRegistry;

    expect(
      globalThis.PacePetsBrakeExtremePreviewControl.maxBurstMessage(),
    ).toEqual(registry.messageForKey(registry.ACTION_KEYS.brakeMaxBurst));
    expect(
      globalThis.PacePetsBrakeExtremePreviewControl.fallbackErrorMessage,
    ).toBe(
      registry.fallbackErrorMessageForKey(registry.ACTION_KEYS.brakeMaxBurst),
    );
    expect(
      globalThis.PacePetsPushSweatPreviewControl.isForceRareMessage(
        registry.messageForKey(registry.ACTION_KEYS.rareSweat),
      ),
    ).toBe(true);
    expect(
      globalThis.PacePetsSplatBouncePreviewControl.isMaxBounceMessage(
        registry.messageForKey(registry.ACTION_KEYS.maxSplatBounce),
      ),
    ).toBe(true);
    expect(
      globalThis.PacePetsSyncMonkEscapePreviewControl.isLaunchMessage(
        registry.messageForKey(registry.ACTION_KEYS.monkEscape),
      ),
    ).toBe(true);
  });

  it("sends response-backed preview actions through the shared request path", async () => {
    const actions = globalThis.PacePetsDevFlagsPreviewActions;
    const registry = globalThis.PacePetsDevPreviewActionRegistry;
    globalThis.chrome.runtime.sendMessage = vi.fn((_message, done) => {
      done({ ok: false });
    });

    await expect(
      actions.requestPreviewAction(registry.ACTION_KEYS.rareSweat),
    ).rejects.toThrow(
      "Open the dashboard on Push harder before previewing Rare burst (5%).",
    );
    expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      registry.messageForKey(registry.ACTION_KEYS.rareSweat),
      expect.any(Function),
    );
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

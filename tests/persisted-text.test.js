import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

describe("CodexPersistedText", () => {
  it("normalizes safe persisted text with one whitespace and length rule", () => {
    const persistedText = globalThis.CodexPersistedText;

    expect(persistedText.safeText("  codex\n  extension  ")).toBe(
      "codex extension",
    );
    expect(persistedText.safeText("", "  fallback\nvalue  ")).toBe(
      "fallback value",
    );
    expect(persistedText.safeText("x".repeat(120))).toHaveLength(
      persistedText.MAX_SAFE_TEXT_LENGTH,
    );
  });

  it("redacts sensitive persisted failure text before truncating", () => {
    const persistedText = globalThis.CodexPersistedText;
    const message = persistedText.safeRedactedText(
      "Request failed with Authorization: Bearer secret-token and accessToken=second-secret",
      "Refresh failed.",
    );

    expect(message).toBe(
      "Request failed with Authorization: [redacted] and accessToken: [redacted]",
    );
    expect(message).not.toContain("secret-token");
    expect(message).not.toContain("second-secret");
    expect(persistedText.safeRedactedText("Bearer root-secret failed")).toBe(
      "Bearer [redacted] failed",
    );
  });
});

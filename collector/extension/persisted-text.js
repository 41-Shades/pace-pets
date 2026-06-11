(function attachCodexPersistedText(root) {
  "use strict";

  const MAX_SAFE_TEXT_LENGTH = 80;
  const SECRET_TEXT_REPLACEMENTS = Object.freeze([
    Object.freeze({
      pattern:
        /\b(access[_-]?token|authorization)\s*[:=]\s*(?:Bearer\s+)?[-A-Za-z0-9._~+/=]+/gi,
      replacement: (_match, label) => `${label}: [redacted]`,
    }),
    Object.freeze({
      pattern: /\bBearer\s+[-A-Za-z0-9._~+/=]+/gi,
      replacement: "Bearer [redacted]",
    }),
  ]);

  function safeText(value, fallback = "") {
    return String(value || fallback)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_SAFE_TEXT_LENGTH);
  }

  function redactedText(value, fallback = "") {
    let text = String(value || fallback);
    for (const { pattern, replacement } of SECRET_TEXT_REPLACEMENTS) {
      text = text.replace(pattern, replacement);
    }
    return text;
  }

  function safeRedactedText(value, fallback = "") {
    return safeText(redactedText(value, fallback), fallback);
  }

  root.CodexPersistedText = Object.freeze({
    MAX_SAFE_TEXT_LENGTH,
    SECRET_TEXT_REPLACEMENTS,
    redactedText,
    safeRedactedText,
    safeText,
  });
})(globalThis);

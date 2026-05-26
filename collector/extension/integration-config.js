(function attachCodexIntegrationConfig(root) {
  "use strict";

  const CHATGPT_ORIGIN = "https://chatgpt.com";
  const CHATGPT_HOST_PERMISSION = `${CHATGPT_ORIGIN}/*`;
  const CHATGPT_USAGE_ENDPOINT = `${CHATGPT_ORIGIN}/backend-api/wham/usage`;
  const AUTH_SESSION_URLS = Object.freeze([
    `${CHATGPT_ORIGIN}/api/auth/session`,
    `${CHATGPT_ORIGIN}/backend-api/auth/session`,
  ]);
  const SOURCE_MARKERS = Object.freeze({
    normalizedUsage: "codex-wham-extension",
    background: "codex-wham-extension-background",
    dashboardLive: "codex-dashboard-live",
  });

  root.CodexIntegrationConfig = Object.freeze({
    AUTH_SESSION_URLS,
    CHATGPT_HOST_PERMISSION,
    CHATGPT_ORIGIN,
    CHATGPT_USAGE_ENDPOINT,
    SOURCE_MARKERS,
  });
})(globalThis);

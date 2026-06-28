(function attachPacePetsUsagePermissions(root) {
  "use strict";

  const EXTENSION_STORAGE = root.CodexExtensionStorage;
  if (!EXTENSION_STORAGE) {
    throw new Error(
      "Codex storage adapter must load before usage-permissions.js.",
    );
  }
  const INTEGRATION_CONFIG = root.CodexIntegrationConfig;
  if (!INTEGRATION_CONFIG) {
    throw new Error(
      "Codex integration config must load before usage-permissions.js.",
    );
  }

  const CHATGPT_HOST_PERMISSION = INTEGRATION_CONFIG.CHATGPT_HOST_PERMISSION;
  const CHATGPT_ACCESS_REQUIRED_MESSAGE =
    "ChatGPT access is needed before Pace Pets can check usage.";
  const CHATGPT_ACCESS_DENIED_MESSAGE = "ChatGPT access was not granted.";

  function chatGptHostPermissionRequest() {
    return {
      origins: [CHATGPT_HOST_PERMISSION],
    };
  }

  function chatGptAccessRequiredError() {
    const error = new Error(CHATGPT_ACCESS_REQUIRED_MESSAGE);
    error.permissionRequired = true;
    return error;
  }

  function chatGptAccessDeniedError() {
    const error = new Error(CHATGPT_ACCESS_DENIED_MESSAGE);
    error.permissionDenied = true;
    return error;
  }

  async function hasChatGptHostPermission() {
    return Boolean(
      await EXTENSION_STORAGE.callbackWithLastError((done) => {
        chrome.permissions.contains(chatGptHostPermissionRequest(), done);
      }),
    );
  }

  async function requestChatGptHostPermission() {
    return Boolean(
      await EXTENSION_STORAGE.callbackWithLastError((done) => {
        chrome.permissions.request(chatGptHostPermissionRequest(), done);
      }),
    );
  }

  async function ensureChatGptHostPermission() {
    if (await requestChatGptHostPermission()) {
      return true;
    }

    throw chatGptAccessDeniedError();
  }

  root.PacePetsUsagePermissions = Object.freeze({
    CHATGPT_ACCESS_DENIED_MESSAGE,
    CHATGPT_ACCESS_REQUIRED_MESSAGE,
    CHATGPT_HOST_PERMISSION,
    chatGptAccessDeniedError,
    chatGptAccessRequiredError,
    chatGptHostPermissionRequest,
    ensureChatGptHostPermission,
    hasChatGptHostPermission,
    requestChatGptHostPermission,
  });
})(globalThis);

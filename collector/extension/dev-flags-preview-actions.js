(() => {
  "use strict";

  const REGISTRY = globalThis.PacePetsDevPreviewActionRegistry;
  if (!REGISTRY) {
    throw new Error("Dev preview action dependencies did not load.");
  }

  function runtimeMessaging() {
    if (!chrome?.runtime?.sendMessage) {
      throw new Error("Runtime messaging is unavailable.");
    }
    return chrome.runtime;
  }

  function requestPreviewActionWithResponse(action) {
    return new Promise((resolve, reject) => {
      const request = REGISTRY.brokerRequestForKey(action.key);
      runtimeMessaging().sendMessage(request, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        if (response?.requestId !== request.requestId) {
          reject(new Error("Dashboard preview response ID did not match."));
          return;
        }
        if (!response?.ok) {
          reject(
            new Error(REGISTRY.responseErrorMessage(action.key, response)),
          );
          return;
        }

        resolve(response);
      });
    });
  }

  function requestPreviewAction(actionKey) {
    const action = REGISTRY.requireActionForKey(actionKey);
    if (!action.responseRequired) {
      runtimeMessaging().sendMessage(REGISTRY.messageForKey(action.key));
      return Promise.resolve();
    }

    return requestPreviewActionWithResponse(action);
  }

  function requestBrakeMaxBurstPreview() {
    return requestPreviewAction(REGISTRY.ACTION_KEYS.brakeMaxBurst);
  }

  function requestRarePushSweatPreview() {
    return requestPreviewAction(REGISTRY.ACTION_KEYS.rareSweat);
  }

  function requestSyncMonkEscapeLaunch() {
    return requestPreviewAction(REGISTRY.ACTION_KEYS.monkEscape);
  }

  function requestCheckerboardRevealPreview() {
    return requestPreviewAction(REGISTRY.ACTION_KEYS.checkerboardReveal);
  }

  globalThis.PacePetsDevFlagsPreviewActions = Object.freeze({
    requestCheckerboardRevealPreview,
    requestPreviewAction,
    requestBrakeMaxBurstPreview,
    requestRarePushSweatPreview,
    requestSyncMonkEscapeLaunch,
  });
})();

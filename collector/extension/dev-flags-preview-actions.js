(() => {
  "use strict";

  const SINGULARITY_TRANSITION_PREVIEW =
    globalThis.PacePetsSingularityTransitionPreviewControl;
  const SYNC_MONK_ESCAPE_PREVIEW =
    globalThis.PacePetsSyncMonkEscapePreviewControl;
  if (!SINGULARITY_TRANSITION_PREVIEW || !SYNC_MONK_ESCAPE_PREVIEW) {
    throw new Error("Dev preview action dependencies did not load.");
  }

  function runtimeMessaging() {
    if (!chrome?.runtime?.sendMessage) {
      throw new Error("Runtime messaging is unavailable.");
    }
    return chrome.runtime;
  }

  function requestSyncMonkEscapeLaunch() {
    runtimeMessaging().sendMessage(SYNC_MONK_ESCAPE_PREVIEW.launchMessage());
  }

  function requestSingularityTransitionPreview(options) {
    return new Promise((resolve, reject) => {
      runtimeMessaging().sendMessage(
        SINGULARITY_TRANSITION_PREVIEW.launchMessage(options),
        (response) => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          if (!response?.ok) {
            reject(
              new Error(
                response?.message ||
                  "Open the dashboard on a prior state before previewing.",
              ),
            );
            return;
          }

          resolve(response);
        },
      );
    });
  }

  globalThis.PacePetsDevFlagsPreviewActions = Object.freeze({
    requestSingularityTransitionPreview,
    requestSyncMonkEscapeLaunch,
  });
})();

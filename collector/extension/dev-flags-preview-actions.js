(() => {
  "use strict";

  const SINGULARITY_TRANSITION_PREVIEW =
    globalThis.PacePetsSingularityTransitionPreviewControl;
  const PUSH_SWEAT_PREVIEW = globalThis.PacePetsPushSweatPreviewControl;
  const SPLAT_BOUNCE_PREVIEW = globalThis.PacePetsSplatBouncePreviewControl;
  const SYNC_MONK_ESCAPE_PREVIEW =
    globalThis.PacePetsSyncMonkEscapePreviewControl;
  if (
    !SINGULARITY_TRANSITION_PREVIEW ||
    !PUSH_SWEAT_PREVIEW ||
    !SPLAT_BOUNCE_PREVIEW ||
    !SYNC_MONK_ESCAPE_PREVIEW
  ) {
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

  function requestSplatMaxBouncePreview() {
    return new Promise((resolve, reject) => {
      runtimeMessaging().sendMessage(
        SPLAT_BOUNCE_PREVIEW.maxBounceMessage(),
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
                  "Open the dashboard on Splat before previewing max bounce.",
              ),
            );
            return;
          }

          resolve(response);
        },
      );
    });
  }

  function requestRarePushSweatPreview() {
    return new Promise((resolve, reject) => {
      runtimeMessaging().sendMessage(
        PUSH_SWEAT_PREVIEW.forceRareMessage(),
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
                  "Open the dashboard on Push harder before forcing rare sweat.",
              ),
            );
            return;
          }

          resolve(response);
        },
      );
    });
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
    requestRarePushSweatPreview,
    requestSingularityTransitionPreview,
    requestSplatMaxBouncePreview,
    requestSyncMonkEscapeLaunch,
  });
})();

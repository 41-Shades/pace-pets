(function attachPacePetsDashboardCaptureControl(root) {
  "use strict";

  const CAPTURE_VISIBLE_DASHBOARD_MESSAGE_TYPE =
    "pacePets.captureVisibleDashboard";
  const CAPTURE_IMAGE_FORMAT = "jpeg";
  const CAPTURE_IMAGE_QUALITY = 86;

  function isCaptureVisibleDashboardMessage(message) {
    return (
      Boolean(message) &&
      message.type === CAPTURE_VISIBLE_DASHBOARD_MESSAGE_TYPE
    );
  }

  function captureImageDetails() {
    return {
      format: CAPTURE_IMAGE_FORMAT,
      quality: CAPTURE_IMAGE_QUALITY,
    };
  }

  function normalizedCaptureResponse(response) {
    if (response?.ok && typeof response.dataUrl === "string") {
      return response;
    }

    return {
      dataUrl: null,
      message:
        typeof response?.message === "string"
          ? response.message
          : "Dashboard capture failed.",
      ok: false,
    };
  }

  function captureVisibleDashboard() {
    return new Promise((resolve) => {
      if (!root.chrome?.runtime?.sendMessage) {
        resolve({
          dataUrl: null,
          message: "Dashboard capture runtime is unavailable.",
          ok: false,
        });
        return;
      }

      root.chrome.runtime.sendMessage(
        { type: CAPTURE_VISIBLE_DASHBOARD_MESSAGE_TYPE },
        (response) => {
          const lastError = root.chrome.runtime.lastError;
          if (lastError) {
            resolve({
              dataUrl: null,
              message: lastError.message,
              ok: false,
            });
            return;
          }

          resolve(normalizedCaptureResponse(response));
        },
      );
    });
  }

  root.PacePetsDashboardCaptureControl = Object.freeze({
    CAPTURE_VISIBLE_DASHBOARD_MESSAGE_TYPE,
    captureImageDetails,
    captureVisibleDashboard,
    isCaptureVisibleDashboardMessage,
  });
})(globalThis);

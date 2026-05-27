(function attachPacePetsRefreshControl(root) {
  "use strict";

  const REFRESH_NOW_MESSAGE_TYPE = "pacePets.refreshUsageNow";
  const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000;

  function isRefreshNowMessage(message) {
    return message?.type === REFRESH_NOW_MESSAGE_TYPE;
  }

  root.PacePetsRefreshControl = Object.freeze({
    MANUAL_REFRESH_COOLDOWN_MS,
    REFRESH_NOW_MESSAGE_TYPE,
    isRefreshNowMessage,
  });
})(globalThis);

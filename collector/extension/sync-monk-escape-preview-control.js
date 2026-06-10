((root) => {
  "use strict";

  const LAUNCH_MESSAGE_TYPE = "pacePets.syncMonkEscapePreview.launch";

  function launchMessage() {
    return Object.freeze({ type: LAUNCH_MESSAGE_TYPE });
  }

  function isLaunchMessage(message) {
    return message?.type === LAUNCH_MESSAGE_TYPE;
  }

  root.PacePetsSyncMonkEscapePreviewControl = Object.freeze({
    isLaunchMessage,
    launchMessage,
  });
})(globalThis);

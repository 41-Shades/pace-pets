((root) => {
  "use strict";

  const FORCE_RARE_MESSAGE_TYPE = "pacePets.pushSweatPreview.rare";

  function forceRareMessage() {
    return Object.freeze({ type: FORCE_RARE_MESSAGE_TYPE });
  }

  function isForceRareMessage(message) {
    return message?.type === FORCE_RARE_MESSAGE_TYPE;
  }

  root.PacePetsPushSweatPreviewControl = Object.freeze({
    forceRareMessage,
    isForceRareMessage,
  });
})(globalThis);

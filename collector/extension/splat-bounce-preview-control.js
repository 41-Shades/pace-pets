((root) => {
  "use strict";

  const MAX_BOUNCE_MESSAGE_TYPE = "pacePets.splatBouncePreview.max";

  function maxBounceMessage() {
    return Object.freeze({ type: MAX_BOUNCE_MESSAGE_TYPE });
  }

  function isMaxBounceMessage(message) {
    return message?.type === MAX_BOUNCE_MESSAGE_TYPE;
  }

  root.PacePetsSplatBouncePreviewControl = Object.freeze({
    isMaxBounceMessage,
    maxBounceMessage,
  });
})(globalThis);

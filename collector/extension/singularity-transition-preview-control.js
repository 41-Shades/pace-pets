((root) => {
  "use strict";

  const LAUNCH_MESSAGE_TYPE = "pacePets.singularityTransitionPreview.launch";

  function launchMessage({ blackHoleVersion } = {}) {
    return Object.freeze({
      blackHoleVersion,
      type: LAUNCH_MESSAGE_TYPE,
    });
  }

  function isLaunchMessage(message) {
    return message?.type === LAUNCH_MESSAGE_TYPE;
  }

  root.PacePetsSingularityTransitionPreviewControl = Object.freeze({
    isLaunchMessage,
    launchMessage,
  });
})(globalThis);

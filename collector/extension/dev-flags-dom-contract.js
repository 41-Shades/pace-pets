(() => {
  "use strict";

  const DEV_FLAG_ELEMENT_SELECTORS = Object.freeze({
    currentModePanel: ".current-mode-panel",
    currentModeSummary: "#current-mode-summary",
    featurePreviewList: "#feature-preview-list",
    resetAll: "#reset-all",
    scenarioPreviewList: "#scenario-preview-list",
    sprintIntensityPreviewList: "#sprint-intensity-preview-list",
    statusMessage: "#status-message",
    themeModeList: "#theme-mode-list",
  });

  function idFromSelector(selector) {
    const match = /^#([A-Za-z][\w-]*)$/.exec(selector);
    return match?.[1] || null;
  }

  const REQUIRED_DEV_FLAG_ELEMENT_IDS = Object.freeze(
    Object.values(DEV_FLAG_ELEMENT_SELECTORS)
      .map(idFromSelector)
      .filter(Boolean),
  );

  function requiredElement(documentRef, selector) {
    const element = documentRef.querySelector(selector);
    if (!element) {
      throw new Error(`Dev controls element ${selector} is missing.`);
    }
    return element;
  }

  function stateGroupElements(documentRef, developerOptions) {
    return Object.freeze(
      Object.fromEntries(
        developerOptions.FORCEABLE_PACE_STATE_GROUPS.map((group) => [
          group.key,
          requiredElement(documentRef, `#${group.listElementId}`),
        ]),
      ),
    );
  }

  function collectElements(
    documentRef,
    developerOptions = globalThis.PacePetsDeveloperOptions,
  ) {
    if (!developerOptions) {
      throw new Error(
        "Pace Pets developer options must load before dev controls DOM collection.",
      );
    }

    return Object.freeze({
      ...Object.fromEntries(
        Object.entries(DEV_FLAG_ELEMENT_SELECTORS).map(([key, selector]) => [
          key,
          requiredElement(documentRef, selector),
        ]),
      ),
      stateGroupElements: stateGroupElements(documentRef, developerOptions),
    });
  }

  globalThis.PacePetsDevFlagsDom = Object.freeze({
    DEV_FLAG_ELEMENT_SELECTORS,
    REQUIRED_DEV_FLAG_ELEMENT_IDS,
    collectElements,
  });
})();

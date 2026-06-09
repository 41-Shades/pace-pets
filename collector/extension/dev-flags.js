(() => {
  "use strict";

  const DEVELOPER_OPTIONS = globalThis.PacePetsDeveloperOptions;
  const CURRENT_MODE = globalThis.PacePetsDevFlagsCurrentMode;
  const PACE_STATE_DATA = globalThis.PacePetsPaceStateData;
  const STORAGE = globalThis.CodexExtensionStorage;
  if (!CURRENT_MODE || !DEVELOPER_OPTIONS || !PACE_STATE_DATA || !STORAGE) {
    throw new Error("Dev controls dependencies did not load.");
  }

  function requiredElement(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Dev controls element ${selector} is missing.`);
    }
    return element;
  }

  function requiredElementById(id) {
    return requiredElement(`#${id}`);
  }

  const elements = {
    currentModePanel: requiredElement(".current-mode-panel"),
    currentModeSummary: requiredElementById("current-mode-summary"),
    featurePreviewList: requiredElementById("feature-preview-list"),
    resetAll: requiredElementById("reset-all"),
    statusMessage: requiredElementById("status-message"),
  };

  const stateGroupElements = Object.freeze(
    Object.fromEntries(
      DEVELOPER_OPTIONS.FORCEABLE_PACE_STATE_GROUPS.map((group) => [
        group.key,
        requiredElementById(group.listElementId),
      ]),
    ),
  );
  let currentForcedPaceStateKey = null;
  let currentCriticalBadgeWindow = false;
  let currentManualRefreshLeadWindow = false;
  let statusTimer = null;

  function setStatus(message) {
    window.clearTimeout(statusTimer);
    elements.statusMessage.textContent = message;
    statusTimer = window.setTimeout(() => {
      elements.statusMessage.textContent = "";
    }, 2200);
  }

  async function readDeveloperOptions() {
    const items = await STORAGE.getLocal(DEVELOPER_OPTIONS.STORAGE_KEY);
    return DEVELOPER_OPTIONS.developerOptionsFromStorageItems(items);
  }

  async function writeDeveloperOptions(options) {
    const storageItems =
      DEVELOPER_OPTIONS.developerOptionsStorageItems(options);
    if (!storageItems) {
      await STORAGE.removeLocal(DEVELOPER_OPTIONS.STORAGE_KEY);
      return DEVELOPER_OPTIONS.developerOptionsFromStorageItems(null);
    }

    await STORAGE.setLocal(storageItems);
    return DEVELOPER_OPTIONS.developerOptionsFromStorageItems(storageItems);
  }

  function currentDeveloperOptions() {
    return {
      criticalBadgeWindow: currentCriticalBadgeWindow,
      forcedPaceStateKey: currentForcedPaceStateKey,
      manualRefreshLeadWindow: currentManualRefreshLeadWindow,
    };
  }

  async function persistDeveloperOptions(nextOptions) {
    const options = await writeDeveloperOptions({
      ...currentDeveloperOptions(),
      ...nextOptions,
    });
    currentCriticalBadgeWindow = options.criticalBadgeWindow;
    currentForcedPaceStateKey = options.forcedPaceStateKey;
    currentManualRefreshLeadWindow = options.manualRefreshLeadWindow;
    render();
  }

  function paceStateByKey(stateKey) {
    return PACE_STATE_DATA.PACE_STATES[stateKey] || null;
  }

  function stateLabelForKey(stateKey) {
    return paceStateByKey(stateKey)?.title || "Unknown state";
  }

  function activeFeaturePreviewOptions() {
    const options = currentDeveloperOptions();
    return DEVELOPER_OPTIONS.FEATURE_PREVIEW_OPTIONS.filter((option) =>
      Boolean(options[option.key]),
    );
  }

  function currentModeLabel() {
    const labels = [];
    if (currentForcedPaceStateKey) {
      labels.push(stateLabelForKey(currentForcedPaceStateKey));
    }
    labels.push(...activeFeaturePreviewOptions().map((option) => option.label));
    return labels.length > 0 ? labels.join(" + ") : "Live data";
  }

  function currentModeDetail() {
    const activeCount =
      Number(Boolean(currentForcedPaceStateKey)) +
      activeFeaturePreviewOptions().length;
    if (activeCount === 0) {
      return "Live data";
    }
    return activeCount === 1 ? "Dev override active" : "Dev overrides active";
  }

  function hasActiveOverride() {
    return (
      Boolean(currentForcedPaceStateKey) ||
      activeFeaturePreviewOptions().length > 0
    );
  }

  function optionButton({ labelText, onClick, pressed, value }) {
    const button = document.createElement("button");
    button.className = "option-row";
    button.type = "button";
    button.value = value;
    button.setAttribute("aria-pressed", String(pressed));
    button.addEventListener("click", () => {
      onClick({ pressed }).catch((error) => {
        setStatus(error.message || "Could not update.");
        render();
      });
    });
    const text = document.createElement("span");
    text.className = "option-label";
    text.textContent = labelText;
    button.append(text);
    return button;
  }

  function optionRowsForStateOptions(stateOptions) {
    return stateOptions.map((option) => {
      const label = stateLabelForKey(option.key);
      return optionButton({
        labelText: label,
        pressed: currentForcedPaceStateKey === option.key,
        value: option.key,
        onClick: async ({ pressed }) => {
          const forcedPaceStateKey = pressed ? null : option.key;
          await persistDeveloperOptions({ forcedPaceStateKey });
          setStatus(
            forcedPaceStateKey
              ? `State override: ${label}.`
              : "State override cleared.",
          );
        },
      });
    });
  }

  function renderCurrentMode() {
    const hasOverride = hasActiveOverride();
    CURRENT_MODE.renderCurrentMode({
      hasOverride,
      modeDetail: currentModeDetail(),
      modeLabel: currentModeLabel(),
      panel: elements.currentModePanel,
      summary: elements.currentModeSummary,
    });
  }

  function renderStateOverrideColumns() {
    DEVELOPER_OPTIONS.FORCEABLE_PACE_STATE_GROUPS.forEach((group) => {
      stateGroupElements[group.key].replaceChildren(
        ...optionRowsForStateOptions(group.options),
      );
    });
  }

  function renderFeaturePreviews() {
    const options = currentDeveloperOptions();
    elements.featurePreviewList.replaceChildren(
      ...DEVELOPER_OPTIONS.FEATURE_PREVIEW_OPTIONS.map((preview) =>
        optionButton({
          labelText: preview.label,
          pressed: Boolean(options[preview.key]),
          value: preview.value,
          onClick: async ({ pressed }) => {
            const enabled = !pressed;
            await persistDeveloperOptions({ [preview.key]: enabled });
            setStatus(enabled ? preview.enableStatus : preview.disableStatus);
          },
        }),
      ),
    );
  }

  function render() {
    renderCurrentMode();
    renderStateOverrideColumns();
    renderFeaturePreviews();
    elements.resetAll.hidden = !hasActiveOverride();
    elements.resetAll.disabled = !hasActiveOverride();
  }

  async function resetAllOverrides() {
    await persistDeveloperOptions({
      ...Object.fromEntries(
        DEVELOPER_OPTIONS.FEATURE_PREVIEW_OPTIONS.map((option) => [
          option.key,
          false,
        ]),
      ),
      forcedPaceStateKey: null,
    });
    setStatus("Dev overrides reset.");
  }

  elements.resetAll.addEventListener("click", () => {
    resetAllOverrides().catch((error) => {
      setStatus(error.message || "Could not reset overrides.");
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
      !STORAGE.isLocalArea(areaName) ||
      !DEVELOPER_OPTIONS.hasDeveloperOptionsChange(changes)
    ) {
      return;
    }

    const options = DEVELOPER_OPTIONS.developerOptionsFromStorageItems({
      [DEVELOPER_OPTIONS.STORAGE_KEY]:
        changes[DEVELOPER_OPTIONS.STORAGE_KEY]?.newValue,
    });
    currentCriticalBadgeWindow = options.criticalBadgeWindow;
    currentForcedPaceStateKey = options.forcedPaceStateKey;
    currentManualRefreshLeadWindow = options.manualRefreshLeadWindow;
    render();
  });

  readDeveloperOptions()
    .then((options) => {
      currentCriticalBadgeWindow = options.criticalBadgeWindow;
      currentForcedPaceStateKey = options.forcedPaceStateKey;
      currentManualRefreshLeadWindow = options.manualRefreshLeadWindow;
      render();
    })
    .catch((error) => {
      setStatus(error.message || "Could not load developer controls.");
    });
})();

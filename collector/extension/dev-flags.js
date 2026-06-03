(() => {
  "use strict";

  const DEVELOPER_OPTIONS = globalThis.PacePetsDeveloperOptions;
  const STORAGE = globalThis.CodexExtensionStorage;
  if (!DEVELOPER_OPTIONS || !STORAGE) {
    throw new Error("Dev controls dependencies did not load.");
  }

  const elements = {
    currentModePanel: document.querySelector(".current-mode-panel"),
    currentModeSummary: document.querySelector("#current-mode-summary"),
    paceLevelList: document.querySelector("#pace-level-list"),
    perfectStateList: document.querySelector("#perfect-state-list"),
    resetAll: document.querySelector("#reset-all"),
    statusMessage: document.querySelector("#status-message"),
  };

  const PACE_LEVEL_STATE_KEYS = Object.freeze([
    "wellAhead",
    "strongAhead",
    "ahead",
    "on",
    "behind",
    "wellBehind",
    "criticalBehind",
  ]);
  const PERFECT_STATE_KEYS = Object.freeze([
    "sync",
    "perfectZero",
    "singularity",
  ]);

  let currentForcedPaceStateKey = null;
  let statusTimer = null;

  function setStatus(message) {
    window.clearTimeout(statusTimer);
    elements.statusMessage.textContent = message;
    statusTimer = window.setTimeout(() => {
      elements.statusMessage.textContent = "";
    }, 2200);
  }

  function storageValue(forcedPaceStateKey) {
    const normalizedForcedPaceStateKey =
      DEVELOPER_OPTIONS.normalizeForcedPaceStateKey(forcedPaceStateKey);
    if (!normalizedForcedPaceStateKey) {
      return {};
    }
    return {
      [DEVELOPER_OPTIONS.FORCED_PACE_STATE_KEY]: normalizedForcedPaceStateKey,
    };
  }

  function developerOptionsFromStorage(value) {
    const options = DEVELOPER_OPTIONS.normalizeDeveloperOptions(value);
    return {
      forcedPaceStateKey: options.forcedPaceStateKey,
    };
  }

  async function readDeveloperOptions() {
    const items = await STORAGE.getLocal(DEVELOPER_OPTIONS.STORAGE_KEY);
    return developerOptionsFromStorage(items?.[DEVELOPER_OPTIONS.STORAGE_KEY]);
  }

  async function writeDeveloperOptions(forcedPaceStateKey) {
    const normalizedValue = storageValue(forcedPaceStateKey);
    if (Object.keys(normalizedValue).length === 0) {
      await STORAGE.removeLocal(DEVELOPER_OPTIONS.STORAGE_KEY);
      return developerOptionsFromStorage(null);
    }

    await STORAGE.setLocal({
      [DEVELOPER_OPTIONS.STORAGE_KEY]: normalizedValue,
    });
    return developerOptionsFromStorage(normalizedValue);
  }

  async function persistDeveloperOptions(forcedPaceStateKey) {
    const options = await writeDeveloperOptions(forcedPaceStateKey);
    currentForcedPaceStateKey = options.forcedPaceStateKey;
    render();
  }

  function stateOptionByKey(stateKey) {
    return (
      DEVELOPER_OPTIONS.FORCEABLE_PACE_STATE_OPTIONS.find(
        (option) => option.key === stateKey,
      ) || null
    );
  }

  function currentModeLabel() {
    return currentForcedPaceStateKey
      ? stateOptionByKey(currentForcedPaceStateKey)?.label || "Unknown state"
      : "Live data";
  }

  function currentModeDetail() {
    return currentForcedPaceStateKey ? "Dev override active" : "No override";
  }

  function optionRow({ checked, labelText, onChange, value }) {
    const label = document.createElement("label");
    label.className = "option-row";
    const input = document.createElement("input");
    input.checked = checked;
    input.name = "state-override";
    input.type = "radio";
    input.value = value;
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }
      onChange(input).catch((error) => {
        setStatus(error.message || "Could not update.");
        render();
      });
    });
    const text = document.createElement("span");
    text.className = "option-label";
    text.textContent = labelText;
    label.append(input, text);
    return label;
  }

  function optionRowsForKeys(stateKeys) {
    return stateKeys
      .map(stateOptionByKey)
      .filter(Boolean)
      .map((state) =>
        optionRow({
          checked: currentForcedPaceStateKey === state.key,
          labelText: state.label,
          value: state.key,
          onChange: async () => {
            await persistDeveloperOptions(state.key);
            setStatus(`State override: ${state.label}.`);
          },
        }),
      );
  }

  function renderCurrentMode() {
    elements.currentModePanel.classList.toggle(
      "has-override",
      Boolean(currentForcedPaceStateKey),
    );

    const label = document.createElement("div");
    label.className = "current-mode-label";
    label.textContent = currentModeLabel();

    const detail = document.createElement("div");
    detail.className = "current-mode-detail";
    detail.textContent = currentModeDetail();

    elements.currentModeSummary.replaceChildren(label, detail);
  }

  function renderStateOverrideColumns() {
    elements.paceLevelList.replaceChildren(
      ...optionRowsForKeys(PACE_LEVEL_STATE_KEYS),
    );
    elements.perfectStateList.replaceChildren(
      ...optionRowsForKeys(PERFECT_STATE_KEYS),
    );
  }

  function render() {
    renderCurrentMode();
    renderStateOverrideColumns();
    elements.resetAll.disabled = !currentForcedPaceStateKey;
  }

  async function resetAllOverrides() {
    await persistDeveloperOptions(null);
    setStatus("State override reset.");
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

    const options = developerOptionsFromStorage(
      changes[DEVELOPER_OPTIONS.STORAGE_KEY]?.newValue,
    );
    currentForcedPaceStateKey = options.forcedPaceStateKey;
    render();
  });

  readDeveloperOptions()
    .then((options) => {
      currentForcedPaceStateKey = options.forcedPaceStateKey;
      render();
    })
    .catch((error) => {
      setStatus(error.message || "Could not load developer controls.");
    });
})();

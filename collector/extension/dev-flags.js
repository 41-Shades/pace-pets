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
    featurePreviewList: document.querySelector("#feature-preview-list"),
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
  let currentManualRefreshLeadWindow = false;
  let statusTimer = null;

  function setStatus(message) {
    window.clearTimeout(statusTimer);
    elements.statusMessage.textContent = message;
    statusTimer = window.setTimeout(() => {
      elements.statusMessage.textContent = "";
    }, 2200);
  }

  function storageValue({
    forcedPaceStateKey,
    manualRefreshLeadWindow = false,
  } = {}) {
    const normalizedForcedPaceStateKey =
      DEVELOPER_OPTIONS.normalizeForcedPaceStateKey(forcedPaceStateKey);
    const normalizedManualRefreshLeadWindow =
      DEVELOPER_OPTIONS.normalizeManualRefreshLeadWindow(
        manualRefreshLeadWindow,
      );
    const value = {};
    if (normalizedForcedPaceStateKey) {
      value[DEVELOPER_OPTIONS.FORCED_PACE_STATE_KEY] =
        normalizedForcedPaceStateKey;
    }
    if (normalizedManualRefreshLeadWindow) {
      value[DEVELOPER_OPTIONS.MANUAL_REFRESH_LEAD_WINDOW_KEY] = true;
    }
    return value;
  }

  function developerOptionsFromStorage(value) {
    const options = DEVELOPER_OPTIONS.normalizeDeveloperOptions(value);
    return {
      forcedPaceStateKey: options.forcedPaceStateKey,
      manualRefreshLeadWindow: options.manualRefreshLeadWindow,
    };
  }

  async function readDeveloperOptions() {
    const items = await STORAGE.getLocal(DEVELOPER_OPTIONS.STORAGE_KEY);
    return developerOptionsFromStorage(items?.[DEVELOPER_OPTIONS.STORAGE_KEY]);
  }

  async function writeDeveloperOptions(options) {
    const normalizedValue = storageValue(options);
    if (Object.keys(normalizedValue).length === 0) {
      await STORAGE.removeLocal(DEVELOPER_OPTIONS.STORAGE_KEY);
      return developerOptionsFromStorage(null);
    }

    await STORAGE.setLocal({
      [DEVELOPER_OPTIONS.STORAGE_KEY]: normalizedValue,
    });
    return developerOptionsFromStorage(normalizedValue);
  }

  function currentDeveloperOptions() {
    return {
      forcedPaceStateKey: currentForcedPaceStateKey,
      manualRefreshLeadWindow: currentManualRefreshLeadWindow,
    };
  }

  async function persistDeveloperOptions(nextOptions) {
    const options = await writeDeveloperOptions({
      ...currentDeveloperOptions(),
      ...nextOptions,
    });
    currentForcedPaceStateKey = options.forcedPaceStateKey;
    currentManualRefreshLeadWindow = options.manualRefreshLeadWindow;
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
    const labels = [];
    if (currentForcedPaceStateKey) {
      labels.push(
        stateOptionByKey(currentForcedPaceStateKey)?.label || "Unknown state",
      );
    }
    if (currentManualRefreshLeadWindow) {
      labels.push("Refresh link");
    }
    return labels.length > 0 ? labels.join(" + ") : "Live data";
  }

  function currentModeDetail() {
    const activeCount =
      Number(Boolean(currentForcedPaceStateKey)) +
      Number(currentManualRefreshLeadWindow);
    if (activeCount === 0) {
      return "No override";
    }
    return activeCount === 1
      ? "Dev override active"
      : `${activeCount} dev overrides active`;
  }

  function hasActiveOverride() {
    return Boolean(currentForcedPaceStateKey) || currentManualRefreshLeadWindow;
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

  function optionRowsForKeys(stateKeys) {
    return stateKeys
      .map(stateOptionByKey)
      .filter(Boolean)
      .map((state) =>
        optionButton({
          labelText: state.label,
          pressed: currentForcedPaceStateKey === state.key,
          value: state.key,
          onClick: async ({ pressed }) => {
            const forcedPaceStateKey = pressed ? null : state.key;
            await persistDeveloperOptions({ forcedPaceStateKey });
            setStatus(
              forcedPaceStateKey
                ? `State override: ${state.label}.`
                : "State override cleared.",
            );
          },
        }),
      );
  }

  function renderCurrentMode() {
    elements.currentModePanel.classList.toggle(
      "has-override",
      hasActiveOverride(),
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

  function renderFeaturePreviews() {
    elements.featurePreviewList.replaceChildren(
      optionButton({
        labelText: "Refresh link",
        pressed: currentManualRefreshLeadWindow,
        value: "manual-refresh-lead-window",
        onClick: async ({ pressed }) => {
          const manualRefreshLeadWindow = !pressed;
          await persistDeveloperOptions({
            manualRefreshLeadWindow,
          });
          setStatus(
            manualRefreshLeadWindow
              ? "Refresh link forced."
              : "Refresh link returned to timing.",
          );
        },
      }),
    );
  }

  function render() {
    renderCurrentMode();
    renderStateOverrideColumns();
    renderFeaturePreviews();
    elements.resetAll.disabled = !hasActiveOverride();
  }

  async function resetAllOverrides() {
    await persistDeveloperOptions({
      forcedPaceStateKey: null,
      manualRefreshLeadWindow: false,
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

    const options = developerOptionsFromStorage(
      changes[DEVELOPER_OPTIONS.STORAGE_KEY]?.newValue,
    );
    currentForcedPaceStateKey = options.forcedPaceStateKey;
    currentManualRefreshLeadWindow = options.manualRefreshLeadWindow;
    render();
  });

  readDeveloperOptions()
    .then((options) => {
      currentForcedPaceStateKey = options.forcedPaceStateKey;
      currentManualRefreshLeadWindow = options.manualRefreshLeadWindow;
      render();
    })
    .catch((error) => {
      setStatus(error.message || "Could not load developer controls.");
    });
})();

(() => {
  "use strict";

  const DEVELOPER_OPTIONS = globalThis.PacePetsDeveloperOptions;
  const CURRENT_MODE = globalThis.PacePetsDevFlagsCurrentMode;
  const STORAGE = globalThis.CodexExtensionStorage;
  if (!CURRENT_MODE || !DEVELOPER_OPTIONS || !STORAGE) {
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
  const BADGE_REFRESH_MESSAGE = Object.freeze({
    type: "pacePets.restoreBadge",
  });

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

  function storageValue({
    criticalBadgeWindow = false,
    forcedPaceStateKey,
    manualRefreshLeadWindow = false,
  } = {}) {
    const normalizedCriticalBadgeWindow =
      DEVELOPER_OPTIONS.normalizeCriticalBadgeWindow(criticalBadgeWindow);
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
    if (normalizedCriticalBadgeWindow) {
      value[DEVELOPER_OPTIONS.CRITICAL_BADGE_WINDOW_KEY] = true;
    }
    if (normalizedManualRefreshLeadWindow) {
      value[DEVELOPER_OPTIONS.MANUAL_REFRESH_LEAD_WINDOW_KEY] = true;
    }
    return value;
  }

  function developerOptionsFromStorage(value) {
    const options = DEVELOPER_OPTIONS.normalizeDeveloperOptions(value);
    return {
      criticalBadgeWindow: options.criticalBadgeWindow,
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

  async function requestBadgeRefresh() {
    const response = await chrome.runtime.sendMessage(BADGE_REFRESH_MESSAGE);
    if (response?.ok !== true) {
      throw new Error(response?.message || "Badge refresh did not run.");
    }
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
    await requestBadgeRefresh();
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
    if (currentCriticalBadgeWindow) {
      labels.push("Brake hard badge");
    }
    if (currentManualRefreshLeadWindow) {
      labels.push("Refresh link");
    }
    return labels.length > 0 ? labels.join(" + ") : "Live data";
  }

  function currentModeDetail() {
    const activeCount =
      Number(Boolean(currentForcedPaceStateKey)) +
      Number(currentCriticalBadgeWindow) +
      Number(currentManualRefreshLeadWindow);
    if (activeCount === 0) {
      return "Live data";
    }
    return activeCount === 1 ? "Dev override active" : "Dev overrides active";
  }

  function hasActiveOverride() {
    return (
      Boolean(currentForcedPaceStateKey) ||
      currentCriticalBadgeWindow ||
      currentManualRefreshLeadWindow
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
        labelText: "Brake hard badge",
        pressed: currentCriticalBadgeWindow,
        value: "critical-badge-window",
        onClick: async ({ pressed }) => {
          const criticalBadgeWindow = !pressed;
          await persistDeveloperOptions({
            criticalBadgeWindow,
          });
          setStatus(
            criticalBadgeWindow
              ? "Brake hard badge forced."
              : "Brake hard badge returned to live data.",
          );
        },
      }),
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
    elements.resetAll.hidden = !hasActiveOverride();
    elements.resetAll.disabled = !hasActiveOverride();
  }

  async function resetAllOverrides() {
    await persistDeveloperOptions({
      criticalBadgeWindow: false,
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

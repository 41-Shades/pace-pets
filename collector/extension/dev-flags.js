(() => {
  "use strict";

  const FEATURE_FLAGS = globalThis.PacePetsFeatureFlags;
  const STORAGE = globalThis.CodexExtensionStorage;
  if (!FEATURE_FLAGS || !STORAGE) {
    throw new Error("Dev flags dependencies did not load.");
  }

  const elements = {
    resetAll: document.querySelector("#reset-all"),
    statusMessage: document.querySelector("#status-message"),
    tableBody: document.querySelector("#settings-table-body"),
  };

  let currentOverrides = {};
  let currentForcedPaceStateKey = null;
  let statusTimer = null;

  function setStatus(message) {
    window.clearTimeout(statusTimer);
    elements.statusMessage.textContent = message;
    statusTimer = window.setTimeout(() => {
      elements.statusMessage.textContent = "";
    }, 2400);
  }

  function defaultValueFor(key) {
    return FEATURE_FLAGS.DEFAULT_FEATURE_FLAGS[key] === true;
  }

  function activeOverrideCount(overrides, forcedPaceStateKey) {
    return Object.keys(overrides).length + (forcedPaceStateKey ? 1 : 0);
  }

  function storageValue(overrides, forcedPaceStateKey) {
    const value = {
      ...FEATURE_FLAGS.normalizeFeatureFlagOverrides(overrides),
    };
    const normalizedForcedPaceStateKey =
      FEATURE_FLAGS.normalizeForcedPaceStateKey(forcedPaceStateKey);
    if (normalizedForcedPaceStateKey) {
      value[FEATURE_FLAGS.FORCED_PACE_STATE_KEY] = normalizedForcedPaceStateKey;
    }
    return value;
  }

  function developerOptionsFromStorage(value) {
    const options = FEATURE_FLAGS.normalizeDeveloperOptions(value);
    return {
      forcedPaceStateKey: options.forcedPaceStateKey,
      overrides: options.featureFlagOverrides,
    };
  }

  async function readDeveloperOptions() {
    const items = await STORAGE.getLocal(FEATURE_FLAGS.STORAGE_KEY);
    return developerOptionsFromStorage(items?.[FEATURE_FLAGS.STORAGE_KEY]);
  }

  async function writeDeveloperOptions(overrides, forcedPaceStateKey) {
    const normalizedValue = storageValue(overrides, forcedPaceStateKey);
    if (activeOverrideCount(overrides, forcedPaceStateKey) === 0) {
      await STORAGE.removeLocal(FEATURE_FLAGS.STORAGE_KEY);
      return developerOptionsFromStorage(null);
    }

    await STORAGE.setLocal({ [FEATURE_FLAGS.STORAGE_KEY]: normalizedValue });
    return developerOptionsFromStorage(normalizedValue);
  }

  async function persistDeveloperOptions(overrides, forcedPaceStateKey) {
    const options = await writeDeveloperOptions(overrides, forcedPaceStateKey);
    currentOverrides = options.overrides;
    currentForcedPaceStateKey = options.forcedPaceStateKey;
    render();
  }

  async function setFlagOverride(key, enabled) {
    const nextOverrides = { ...currentOverrides };
    if (enabled === defaultValueFor(key)) {
      delete nextOverrides[key];
    } else {
      nextOverrides[key] = enabled;
    }

    await persistDeveloperOptions(nextOverrides, currentForcedPaceStateKey);
    setStatus(`${FEATURE_FLAGS.FEATURE_FLAG_DEFINITIONS[key].label} updated.`);
  }

  async function resetFlag(key) {
    const nextOverrides = { ...currentOverrides };
    delete nextOverrides[key];
    await persistDeveloperOptions(nextOverrides, currentForcedPaceStateKey);
    setStatus(
      `${FEATURE_FLAGS.FEATURE_FLAG_DEFINITIONS[key].label} reset to default.`,
    );
  }

  async function setForcedPaceState(value) {
    const nextForcedPaceStateKey =
      FEATURE_FLAGS.normalizeForcedPaceStateKey(value);
    await persistDeveloperOptions(currentOverrides, nextForcedPaceStateKey);
    setStatus(
      nextForcedPaceStateKey
        ? `Forced state set to ${labelForForcedState(nextForcedPaceStateKey)}.`
        : "Display override cleared.",
    );
  }

  function labelForForcedState(stateKey) {
    return (
      FEATURE_FLAGS.FORCEABLE_PACE_STATE_OPTIONS.find(
        (option) => option.key === stateKey,
      )?.label || stateKey
    );
  }

  function cell(...children) {
    const td = document.createElement("td");
    td.append(...children);
    return td;
  }

  function textCell(text, className = "") {
    const td = document.createElement("td");
    td.textContent = text;
    if (className) {
      td.className = className;
    }
    return td;
  }

  function resetButton({ disabled, onClick }) {
    const button = document.createElement("button");
    button.className = "secondary-button";
    button.disabled = disabled;
    button.textContent = "Reset";
    button.type = "button";
    button.addEventListener("click", () => {
      onClick().catch((error) => {
        setStatus(error.message || "Could not reset.");
      });
    });
    return button;
  }

  function forcedStateRadio(value, labelText) {
    const label = document.createElement("label");
    label.className = "radio-pill";
    const radio = document.createElement("input");
    radio.checked = (currentForcedPaceStateKey || "") === value;
    radio.name = "forced-pace-state";
    radio.type = "radio";
    radio.value = value;
    radio.addEventListener("change", () => {
      if (!radio.checked) {
        return;
      }
      setForcedPaceState(value).catch((error) => {
        setStatus(error.message || "Could not update display override.");
        render();
      });
    });
    const text = document.createElement("span");
    text.textContent = labelText;
    label.append(radio, text);
    return label;
  }

  function forcedStateRow() {
    const row = document.createElement("tr");
    const group = document.createElement("div");
    group.className = "radio-group";
    group.append(
      forcedStateRadio("", "Live data"),
      ...FEATURE_FLAGS.FORCEABLE_PACE_STATE_OPTIONS.map((state) =>
        forcedStateRadio(state.key, state.label),
      ),
    );

    row.append(
      textCell("Display override", "setting-name"),
      textCell("Live data", "muted"),
      cell(group),
      textCell(
        currentForcedPaceStateKey
          ? labelForForcedState(currentForcedPaceStateKey)
          : "Live data",
      ),
      cell(
        resetButton({
          disabled: !currentForcedPaceStateKey,
          onClick: () => persistDeveloperOptions(currentOverrides, null),
        }),
      ),
    );
    return row;
  }

  function flagRow(definition, flags) {
    const row = document.createElement("tr");
    const checkbox = document.createElement("input");
    checkbox.checked = flags[definition.key] === true;
    checkbox.type = "checkbox";
    checkbox.addEventListener("change", () => {
      setFlagOverride(definition.key, checkbox.checked).catch((error) => {
        setStatus(error.message || "Could not update flag.");
        render();
      });
    });

    const label = document.createElement("label");
    label.className = "flag-toggle";
    const labelText = document.createElement("span");
    labelText.textContent = "Allowed";
    label.append(checkbox, labelText);

    row.append(
      textCell(definition.label, "setting-name"),
      textCell(defaultValueFor(definition.key) ? "On" : "Off", "muted"),
      cell(label),
      textCell(flags[definition.key] ? "On" : "Off"),
      cell(
        resetButton({
          disabled: !Object.hasOwn(currentOverrides, definition.key),
          onClick: () => resetFlag(definition.key),
        }),
      ),
    );
    return row;
  }

  function render() {
    const flags = FEATURE_FLAGS.normalizeFeatureFlags(currentOverrides);
    elements.tableBody.replaceChildren(
      forcedStateRow(),
      ...FEATURE_FLAGS.FEATURE_FLAG_KEYS.map((key) =>
        flagRow(FEATURE_FLAGS.FEATURE_FLAG_DEFINITIONS[key], flags),
      ),
    );

    const count = activeOverrideCount(
      currentOverrides,
      currentForcedPaceStateKey,
    );
    elements.resetAll.disabled = count === 0;
    elements.resetAll.textContent =
      count === 0 ? "No active overrides" : `Reset ${count} override(s)`;
  }

  async function resetAllOverrides() {
    await persistDeveloperOptions({}, null);
    setStatus("All overrides reset.");
  }

  elements.resetAll.addEventListener("click", () => {
    resetAllOverrides().catch((error) => {
      setStatus(error.message || "Could not reset overrides.");
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
      !STORAGE.isLocalArea(areaName) ||
      !FEATURE_FLAGS.hasFeatureFlagsChange(changes)
    ) {
      return;
    }

    const options = developerOptionsFromStorage(
      changes[FEATURE_FLAGS.STORAGE_KEY]?.newValue,
    );
    currentOverrides = options.overrides;
    currentForcedPaceStateKey = options.forcedPaceStateKey;
    render();
  });

  readDeveloperOptions()
    .then((options) => {
      currentOverrides = options.overrides;
      currentForcedPaceStateKey = options.forcedPaceStateKey;
      render();
    })
    .catch((error) => {
      setStatus(error.message || "Could not load developer flags.");
    });
})();

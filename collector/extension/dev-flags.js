(() => {
  "use strict";

  const DEVELOPER_OPTIONS = globalThis.PacePetsDeveloperOptions;
  const CURRENT_MODE = globalThis.PacePetsDevFlagsCurrentMode;
  const PACE_STATE_DATA = globalThis.PacePetsPaceStateData;
  const PREVIEW_ACTIONS = globalThis.PacePetsDevFlagsPreviewActions;
  const RENDERING = globalThis.PacePetsDevFlagsRendering;
  const SINGULARITY_CONTROLS = globalThis.PacePetsDevFlagsSingularityControls;
  const STORAGE = globalThis.CodexExtensionStorage;
  if (
    !CURRENT_MODE ||
    !DEVELOPER_OPTIONS ||
    !PACE_STATE_DATA ||
    !PREVIEW_ACTIONS ||
    !RENDERING ||
    !SINGULARITY_CONTROLS ||
    !STORAGE
  ) {
    throw new Error("Dev controls dependencies did not load.");
  }

  const FEATURE_PREVIEW_ACTIONS = Object.freeze([
    Object.freeze({
      label: "Rare sweat",
      run: () => PREVIEW_ACTIONS.requestRarePushSweatPreview(),
      status: "Rare sweat requested.",
    }),
    Object.freeze({
      label: "Max Splat bounce",
      run: () => PREVIEW_ACTIONS.requestSplatMaxBouncePreview(),
      status: "Max Splat bounce preview requested.",
    }),
    Object.freeze({
      label: "Monk escape",
      run: () => {
        PREVIEW_ACTIONS.requestSyncMonkEscapeLaunch();
        return Promise.resolve();
      },
      status: "Monk escape launch requested.",
    }),
  ]);

  const { optionButton, requiredElement, requiredElementById } = RENDERING;

  const elements = {
    currentModePanel: requiredElement(".current-mode-panel"),
    currentModeSummary: requiredElementById("current-mode-summary"),
    featurePreviewList: requiredElementById("feature-preview-list"),
    resetAll: requiredElementById("reset-all"),
    singularityTransitionPreviewList: requiredElementById(
      "singularity-transition-preview-list",
    ),
    sprintIntensityPreviewList: requiredElementById(
      "sprint-intensity-preview-list",
    ),
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
  let currentMaxPoolFill = false;
  let currentResetExhaustedPreview = false;
  let currentSprintIntensityPreview = null;
  let singularityTransitionPreviewActive = false;
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
      maxPoolFill: currentMaxPoolFill,
      resetExhaustedPreview: currentResetExhaustedPreview,
      sprintIntensityPreview: currentSprintIntensityPreview,
    };
  }

  async function persistDeveloperOptions(nextOptions) {
    const options = await writeDeveloperOptions({
      ...currentDeveloperOptions(),
      ...nextOptions,
    });
    applyDeveloperOptions(options);
    render();
  }

  function applyDeveloperOptions(options) {
    currentCriticalBadgeWindow = options.criticalBadgeWindow;
    currentForcedPaceStateKey = options.forcedPaceStateKey;
    currentManualRefreshLeadWindow = options.manualRefreshLeadWindow;
    currentMaxPoolFill = options.maxPoolFill;
    currentResetExhaustedPreview = options.resetExhaustedPreview;
    currentSprintIntensityPreview = options.sprintIntensityPreview;
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

  function activeSprintIntensityPreviewOption() {
    return (
      DEVELOPER_OPTIONS.SPRINT_INTENSITY_PREVIEW_OPTIONS.find(
        (option) => option.value === currentSprintIntensityPreview,
      ) || null
    );
  }

  function currentModeLabel() {
    const labels = [];
    if (currentForcedPaceStateKey) {
      labels.push(stateLabelForKey(currentForcedPaceStateKey));
    }
    const sprintIntensityPreview = activeSprintIntensityPreviewOption();
    if (sprintIntensityPreview) {
      labels.push(sprintIntensityPreview.label);
    }
    labels.push(...activeFeaturePreviewOptions().map((option) => option.label));
    return labels.length > 0 ? labels.join(" + ") : "Live data";
  }

  function currentModeDetail() {
    const activeCount =
      Number(Boolean(currentForcedPaceStateKey)) +
      Number(Boolean(activeSprintIntensityPreviewOption())) +
      activeFeaturePreviewOptions().length;
    if (activeCount === 0) {
      return "Live data";
    }
    return activeCount === 1 ? "Dev override active" : "Dev overrides active";
  }

  function hasActiveOverride() {
    return (
      Boolean(currentForcedPaceStateKey) ||
      Boolean(activeSprintIntensityPreviewOption()) ||
      activeFeaturePreviewOptions().length > 0
    );
  }

  function optionRow(options) {
    return optionButton({
      ...options,
      onError(error) {
        setStatus(error.message || "Could not update.");
        render();
      },
    });
  }

  function optionRowsForStateOptions(stateOptions) {
    return stateOptions.map((option) => {
      const label = stateLabelForKey(option.key);
      return optionRow({
        labelText: label,
        pressed: currentForcedPaceStateKey === option.key,
        onClick: async ({ pressed }) => {
          const forcedPaceStateKey = pressed ? null : option.key;
          await persistDeveloperOptions({
            forcedPaceStateKey,
            sprintIntensityPreview: null,
          });
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
      resetButton: elements.resetAll,
      statusMessage: elements.statusMessage,
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

  function setSingularityTransitionPreviewActive(active) {
    singularityTransitionPreviewActive = active;
    render();
  }

  function renderSingularityControls() {
    SINGULARITY_CONTROLS.render({
      optionRow,
      previewActions: PREVIEW_ACTIONS,
      previewActive: singularityTransitionPreviewActive,
      previewList: elements.singularityTransitionPreviewList,
      setPreviewActive: setSingularityTransitionPreviewActive,
      setStatus,
    });
  }

  function renderSprintIntensityPreviews() {
    const sprintStateKey = PACE_STATE_DATA.PACE_STATES.wellAhead.key;
    elements.sprintIntensityPreviewList.replaceChildren(
      ...DEVELOPER_OPTIONS.SPRINT_INTENSITY_PREVIEW_OPTIONS.map((preview) =>
        optionRow({
          indicator: false,
          labelText: preview.label,
          pressed: currentSprintIntensityPreview === preview.value,
          onClick: async ({ pressed }) => {
            if (pressed) {
              return;
            }

            await persistDeveloperOptions({
              forcedPaceStateKey: sprintStateKey,
              sprintIntensityPreview: preview.value,
            });
            setStatus(preview.status);
          },
        }),
      ),
    );
  }

  function renderFeaturePreviews() {
    const options = currentDeveloperOptions();
    elements.featurePreviewList.replaceChildren(
      ...DEVELOPER_OPTIONS.FEATURE_PREVIEW_OPTIONS.map((preview) =>
        optionRow({
          indicator: false,
          labelText: preview.label,
          pressed: Boolean(options[preview.key]),
          onClick: async ({ pressed }) => {
            const enabled = !pressed;
            await persistDeveloperOptions({ [preview.key]: enabled });
            setStatus(enabled ? preview.enableStatus : preview.disableStatus);
          },
        }),
      ),
      ...FEATURE_PREVIEW_ACTIONS.map((preview) =>
        optionRow({
          action: true,
          indicator: false,
          labelText: preview.label,
          onClick: async () => {
            await preview.run();
            setStatus(preview.status);
          },
        }),
      ),
    );
  }

  function render() {
    renderCurrentMode();
    renderStateOverrideColumns();
    renderSingularityControls();
    renderSprintIntensityPreviews();
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
      sprintIntensityPreview: null,
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
    applyDeveloperOptions(options);
    render();
  });

  readDeveloperOptions()
    .then((options) => {
      applyDeveloperOptions(options);
      render();
    })
    .catch((error) => {
      setStatus(error.message || "Could not load developer controls.");
    });
})();

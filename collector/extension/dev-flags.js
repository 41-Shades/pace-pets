(() => {
  "use strict";

  const DEVELOPER_OPTIONS = globalThis.PacePetsDeveloperOptions;
  const CURRENT_MODE = globalThis.PacePetsDevFlagsCurrentMode;
  const DEV_FLAGS_DOM = globalThis.PacePetsDevFlagsDom;
  const FEATURE_PREVIEWS = globalThis.PacePetsDevFlagsFeaturePreviews;
  const PACE_STATE_DATA = globalThis.PacePetsPaceStateData;
  const RENDERING = globalThis.PacePetsDevFlagsRendering;
  const STORAGE = globalThis.CodexExtensionStorage;
  const THEME_MODE = globalThis.PacePetsDevFlagsThemeMode;
  if (
    !CURRENT_MODE ||
    !DEV_FLAGS_DOM ||
    !DEVELOPER_OPTIONS ||
    !FEATURE_PREVIEWS ||
    !PACE_STATE_DATA ||
    !RENDERING ||
    !STORAGE ||
    !THEME_MODE
  ) {
    throw new Error("Dev controls dependencies did not load.");
  }

  const { optionButton } = RENDERING;

  const elements = DEV_FLAGS_DOM.collectElements(document, DEVELOPER_OPTIONS);

  const { stateGroupElements } = elements;
  let currentForcedPaceStateKey = null;
  let currentCheckerboardRevealWhiteTransparent = false;
  let currentCriticalBadgeWindow = false;
  let currentManualRefreshLeadWindow = false;
  let currentMaxPoolFill = false;
  let currentRailHidden = false;
  let currentResetExhaustedPreview = false;
  let currentSplatTimeRemainingPreview = null;
  let currentSprintIntensityPreview = null;
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
      checkerboardRevealWhiteTransparent:
        currentCheckerboardRevealWhiteTransparent,
      criticalBadgeWindow: currentCriticalBadgeWindow,
      forcedPaceStateKey: currentForcedPaceStateKey,
      manualRefreshLeadWindow: currentManualRefreshLeadWindow,
      maxPoolFill: currentMaxPoolFill,
      railHidden: currentRailHidden,
      resetExhaustedPreview: currentResetExhaustedPreview,
      splatTimeRemainingPreview: currentSplatTimeRemainingPreview,
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
    currentCheckerboardRevealWhiteTransparent =
      options.checkerboardRevealWhiteTransparent;
    currentCriticalBadgeWindow = options.criticalBadgeWindow;
    currentForcedPaceStateKey = options.forcedPaceStateKey;
    currentManualRefreshLeadWindow = options.manualRefreshLeadWindow;
    currentMaxPoolFill = options.maxPoolFill;
    currentRailHidden = options.railHidden;
    currentResetExhaustedPreview = options.resetExhaustedPreview;
    currentSplatTimeRemainingPreview = options.splatTimeRemainingPreview;
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

  function activeSplatTimeRemainingPreviewOption() {
    if (
      currentForcedPaceStateKey !== PACE_STATE_DATA.PACE_STATES.splat.key ||
      !currentSplatTimeRemainingPreview
    ) {
      return null;
    }

    return (
      DEVELOPER_OPTIONS.SPLAT_TIME_REMAINING_PREVIEW_OPTIONS.find(
        (option) => option.value === currentSplatTimeRemainingPreview,
      ) || null
    );
  }

  function currentModeLabel() {
    const labels = [];
    if (currentForcedPaceStateKey) {
      labels.push(
        activeSplatTimeRemainingPreviewOption()?.label ||
          stateLabelForKey(currentForcedPaceStateKey),
      );
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

  const themeModeControl = THEME_MODE.createThemeModeControl({
    listElement: elements.themeModeList,
    optionRow,
    setStatus,
  });

  function optionRowsForStateOptions(stateOptions) {
    return stateOptions.flatMap((option) => {
      if (option.key === PACE_STATE_DATA.PACE_STATES.splat.key) {
        return DEVELOPER_OPTIONS.SPLAT_TIME_REMAINING_PREVIEW_OPTIONS.map(
          (preview) =>
            optionRow({
              labelText: preview.label,
              pressed:
                currentForcedPaceStateKey === option.key &&
                currentSplatTimeRemainingPreview === preview.value,
              onClick: async ({ pressed }) => {
                const forcedPaceStateKey = pressed ? null : option.key;
                await persistDeveloperOptions({
                  forcedPaceStateKey,
                  splatTimeRemainingPreview: pressed ? null : preview.value,
                  sprintIntensityPreview: null,
                });
                setStatus(
                  forcedPaceStateKey
                    ? `State override: ${preview.label}.`
                    : "State override cleared.",
                );
              },
            }),
        );
      }

      const label = stateLabelForKey(option.key);
      return optionRow({
        labelText: label,
        pressed: currentForcedPaceStateKey === option.key,
        onClick: async ({ pressed }) => {
          const forcedPaceStateKey = pressed ? null : option.key;
          await persistDeveloperOptions({
            forcedPaceStateKey,
            splatTimeRemainingPreview: null,
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
              splatTimeRemainingPreview: null,
              sprintIntensityPreview: preview.value,
            });
            setStatus(preview.status);
          },
        }),
      ),
    );
  }

  function renderFeaturePreviews() {
    FEATURE_PREVIEWS.renderFeaturePreviews({
      container: elements.featurePreviewList,
      currentOptions: currentDeveloperOptions(),
      optionRow,
      persistDeveloperOptions,
      setStatus,
    });
  }

  function render() {
    renderCurrentMode();
    renderStateOverrideColumns();
    renderSprintIntensityPreviews();
    renderFeaturePreviews();
    themeModeControl.render();
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
      splatTimeRemainingPreview: null,
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

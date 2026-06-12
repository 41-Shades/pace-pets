(() => {
  "use strict";

  const PREVIEW_ACTIVE_DURATION_MS = 18000;
  const QUEUED_ACTIVE_DURATION_MS = 2200;

  function renderBlackHoleOptions({
    currentVersion,
    list,
    optionRow,
    persistDeveloperOptions,
    setStatus,
    versionOptions,
  }) {
    list.replaceChildren(
      ...versionOptions.map((option) =>
        optionRow({
          indicator: false,
          labelText: option.label,
          pressed: currentVersion === option.value,
          onClick: async ({ pressed }) => {
            if (pressed) {
              return;
            }

            await persistDeveloperOptions({
              singularityBlackHoleVersion: option.value,
            });
            setStatus(option.status);
          },
        }),
      ),
    );
  }

  function renderPreviewAction({
    currentBlackHoleVersion,
    list,
    optionRow,
    previewActions,
    previewActive,
    setPreviewActive,
    setStatus,
  }) {
    list.replaceChildren(
      optionRow({
        action: true,
        active: previewActive,
        indicator: false,
        labelText: "Run from current state",
        onClick: async () => {
          setPreviewActive(true);
          try {
            const response =
              await previewActions.requestSingularityTransitionPreview({
                blackHoleVersion: currentBlackHoleVersion,
              });
            const durationMs = response?.queued
              ? QUEUED_ACTIVE_DURATION_MS
              : PREVIEW_ACTIVE_DURATION_MS;
            setStatus(
              response?.queued
                ? "Queued. Switch to the dashboard tab."
                : "Running Singularity entry preview.",
            );
            window.setTimeout(() => setPreviewActive(false), durationMs);
          } catch (error) {
            setPreviewActive(false);
            throw error;
          }
        },
      }),
    );
  }

  function render({
    blackHoleVersionList,
    currentBlackHoleVersion,
    optionRow,
    persistDeveloperOptions,
    previewActions,
    previewActive,
    previewList,
    setPreviewActive,
    setStatus,
    versionOptions,
  }) {
    renderBlackHoleOptions({
      currentVersion: currentBlackHoleVersion,
      list: blackHoleVersionList,
      optionRow,
      persistDeveloperOptions,
      setStatus,
      versionOptions,
    });
    renderPreviewAction({
      currentBlackHoleVersion,
      list: previewList,
      optionRow,
      previewActions,
      previewActive,
      setPreviewActive,
      setStatus,
    });
  }

  globalThis.PacePetsDevFlagsSingularityControls = Object.freeze({ render });
})();

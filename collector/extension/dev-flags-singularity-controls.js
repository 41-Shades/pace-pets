(() => {
  "use strict";

  const PREVIEW_ACTIVE_DURATION_MS = 19000;
  const QUEUED_ACTIVE_DURATION_MS = 2200;

  function renderVersionOptions({
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
          labelText: option.label,
          pressed: currentVersion === option.value,
          onClick: async ({ pressed }) => {
            if (pressed) {
              return;
            }

            await persistDeveloperOptions({
              singularityTransitionVersion: option.value,
            });
            setStatus(option.status);
          },
        }),
      ),
    );
  }

  function renderPreviewAction({
    list,
    optionRow,
    persistDeveloperOptions,
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
            await persistDeveloperOptions({
              singularityTransitionVersion: "v2",
            });
            const response =
              await previewActions.requestSingularityTransitionPreview();
            const durationMs = response?.queued
              ? QUEUED_ACTIVE_DURATION_MS
              : PREVIEW_ACTIVE_DURATION_MS;
            setStatus(
              response?.queued
                ? "Queued. Switch to the dashboard tab."
                : "Running Singularity V2 entry preview.",
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
    currentVersion,
    optionRow,
    persistDeveloperOptions,
    previewActions,
    previewActive,
    previewList,
    setPreviewActive,
    setStatus,
    versionList,
    versionOptions,
  }) {
    renderVersionOptions({
      currentVersion,
      list: versionList,
      optionRow,
      persistDeveloperOptions,
      setStatus,
      versionOptions,
    });
    renderPreviewAction({
      list: previewList,
      optionRow,
      persistDeveloperOptions,
      previewActions,
      previewActive,
      setPreviewActive,
      setStatus,
    });
  }

  globalThis.PacePetsDevFlagsSingularityControls = Object.freeze({ render });
})();

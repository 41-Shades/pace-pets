(() => {
  "use strict";

  const PREVIEW_ACTIVE_DURATION_MS = 28000;
  const QUEUED_ACTIVE_DURATION_MS = 2200;

  function renderPreviewAction({
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
              await previewActions.requestSingularityTransitionPreview();
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
    optionRow,
    previewActions,
    previewActive,
    previewList,
    setPreviewActive,
    setStatus,
  }) {
    renderPreviewAction({
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

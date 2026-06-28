(() => {
  "use strict";

  function paceScaleLabel(preview) {
    return Number.isInteger(preview.ratio)
      ? String(preview.ratio)
      : preview.value;
  }

  function intensityScaleCaption() {
    const caption = document.createElement("span");
    caption.className = "pace-scale-caption";
    caption.textContent = "Pace";
    return caption;
  }

  function intensityScaleButton({
    currentPreviewValue,
    onSelect,
    preview,
    previewKey,
    stateKey,
  }) {
    const active = currentPreviewValue === preview.value;
    const button = document.createElement("button");
    button.className = "pace-scale-option";
    button.classList.toggle("is-active", active);
    button.type = "button";
    button.textContent = paceScaleLabel(preview);
    button.setAttribute("aria-label", preview.label);
    button.setAttribute("aria-pressed", String(active));
    button.addEventListener("click", () => {
      if (!active) {
        onSelect({ preview, previewKey, stateKey });
      }
    });
    return button;
  }

  function renderIntensityScale({
    currentPreviewValue,
    listElement,
    onSelect,
    options,
    previewKey,
    stateKey,
  }) {
    listElement.replaceChildren(
      intensityScaleCaption(),
      ...options.map((preview) =>
        intensityScaleButton({
          currentPreviewValue,
          onSelect,
          preview,
          previewKey,
          stateKey,
        }),
      ),
    );
  }

  globalThis.PacePetsDevFlagsPaceScalePreviews = Object.freeze({
    renderIntensityScale,
  });
})();

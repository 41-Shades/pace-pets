(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  if (!DATA) {
    throw new Error(
      "Pace data must load before dashboard-pace-icon-selection.js.",
    );
  }

  function hasMatchingPlayfulPaceIcon(container, state) {
    const image = container.firstElementChild;
    return (
      DATA.USE_PLAYFUL_PACE_ICONS &&
      container.classList.contains("is-playful") &&
      typeof state.playfulImage === "string" &&
      image?.tagName === "IMG" &&
      image.src === new URL(state.playfulImage, document.baseURI).href
    );
  }

  function hasMatchingPerfectZeroApertureIcon(container, state) {
    const image = container.querySelector(":scope > .perfect-zero-cameo");
    return (
      container.classList.contains("is-perfect-zero-aperture") &&
      typeof state.playfulImage === "string" &&
      image?.tagName === "IMG" &&
      image.src === new URL(state.playfulImage, document.baseURI).href
    );
  }

  function usesOutlinePlaceholderIcon(state) {
    return state.iconPresentation === "outline";
  }

  function hasMatchingOutlinePlaceholderIcon(container, state) {
    return (
      usesOutlinePlaceholderIcon(state) &&
      container.classList.contains("is-outline-placeholder") &&
      !container.firstElementChild
    );
  }

  function hasMatchingRenderedPaceIcon(
    container,
    state,
    { usePerfectZeroPageAperture },
  ) {
    if (usePerfectZeroPageAperture) {
      return hasMatchingPerfectZeroApertureIcon(container, state);
    }

    if (container.classList.contains("is-perfect-zero-aperture")) {
      return false;
    }

    if (usesOutlinePlaceholderIcon(state)) {
      return hasMatchingOutlinePlaceholderIcon(container, state);
    }

    if (DATA.USE_PLAYFUL_PACE_ICONS && state.playfulImage) {
      return hasMatchingPlayfulPaceIcon(container, state);
    }

    return container.firstElementChild?.tagName === "SVG";
  }

  function renderSelectedPaceIcon(
    controller,
    container,
    state,
    { shouldRenderPerfectZeroPageAperture, src, useEffects },
  ) {
    if (usesOutlinePlaceholderIcon(state)) {
      controller.renderOutlinePlaceholderPaceIcon(container);
      return;
    }

    if (shouldRenderPerfectZeroPageAperture) {
      controller.renderPerfectZeroApertureIcon(container, src);
      return;
    }

    if (DATA.USE_PLAYFUL_PACE_ICONS && src) {
      controller.renderPlayfulPaceIcon(container, src, state, useEffects);
      return;
    }

    controller.renderSvgPaceIcon(container, state, useEffects);
  }

  globalThis.PacePetsDashboardPaceIconSelection = Object.freeze({
    hasMatchingRenderedPaceIcon,
    renderSelectedPaceIcon,
  });
})();

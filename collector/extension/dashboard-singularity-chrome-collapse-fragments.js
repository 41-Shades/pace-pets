(function attachPacePetsDashboardSingularityChromeCollapseFragments(root) {
  "use strict";

  const SPLIT_CONTAINER_SELECTORS = Object.freeze([
    ".panel-header",
    "#pace-card",
    ".chart-panel",
    ".chart-frame",
    ".metric-row",
    ".reset-card",
    ".reset-details",
    ".reset-progress",
    ".reset-countdown-group",
    ".panel-controls > *",
    ".collection-meta",
    ".state-column-section",
    ".state-column-title",
    ".state-chip",
    ".state-stack > *",
  ]);

  const INNER_FRAGMENT_SELECTORS = Object.freeze([
    ".brand-title > *",
    ".panel-actions > *",
    ".panel-controls > *",
    ".collection-meta > *",
    ".pace-icon",
    ".pace-copy > *",
    ".pace-stats > *",
    ".chart-meta > *",
    ".chart-frame > *",
    ".metric-main > *",
    ".metric-bar",
    ".reset-detail",
    ".reset-detail-copy > *",
    ".reset-progress > *",
    ".reset-summary-copy > *",
    ".early-reset-action > *",
    ".state-chip > *",
    ".state-copy > *",
  ]);

  const MAX_INNER_FRAGMENTS_PER_CONTAINER = 8;

  function viewportSize() {
    const rootElement = document.documentElement;
    return {
      height: Math.max(1, root.innerHeight || rootElement.clientHeight || 1),
      width: Math.max(1, root.innerWidth || rootElement.clientWidth || 1),
    };
  }

  function visibleRect(element) {
    const rect = element.getBoundingClientRect();
    const style = root.getComputedStyle(element);
    if (
      rect.width < 2 ||
      rect.height < 2 ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    ) {
      return null;
    }

    const { height, width } = viewportSize();
    if (
      rect.right < 0 ||
      rect.bottom < 0 ||
      rect.left > width ||
      rect.top > height
    ) {
      return null;
    }

    return rect;
  }

  function collectSplitContainers() {
    const containers = [];
    const seen = new Set();
    document
      .querySelectorAll(SPLIT_CONTAINER_SELECTORS.join(","))
      .forEach((element, index) => {
        const rect = visibleRect(element);
        if (
          !seen.has(element) &&
          rect &&
          rect.width >= 12 &&
          rect.height >= 10
        ) {
          seen.add(element);
          containers.push({ element, index, rect });
        }
      });

    const containerElements = new Set(
      containers.map((container) => container.element),
    );
    return containers.map((container) => ({
      ...container,
      innerFragments: collectInnerFragments(container, containerElements),
    }));
  }

  function ownsFragment(element, containerElement, containerElements) {
    let current = element.parentElement;
    while (current && current !== containerElement) {
      if (containerElements.has(current)) {
        return false;
      }
      current = current.parentElement;
    }
    return current === containerElement;
  }

  function collectInnerFragments(container, containerElements) {
    const fragments = [];
    const seen = new Set();
    container.element
      .querySelectorAll(INNER_FRAGMENT_SELECTORS.join(","))
      .forEach((element) => {
        const rect = visibleRect(element);
        if (
          fragments.length < MAX_INNER_FRAGMENTS_PER_CONTAINER &&
          !seen.has(element) &&
          !containerElements.has(element) &&
          ownsFragment(element, container.element, containerElements) &&
          rect &&
          rect.width >= 4 &&
          rect.height >= 4
        ) {
          seen.add(element);
          fragments.push({
            element,
            index: fragments.length,
            parentIndex: container.index,
            rect,
          });
        }
      });
    return fragments;
  }

  root.PacePetsDashboardSingularityChromeCollapseFragments = Object.freeze({
    collectSplitContainers,
  });
})(globalThis);

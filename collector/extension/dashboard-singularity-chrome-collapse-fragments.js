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
    ".state-stack > *",
  ]);

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
    return containers;
  }

  root.PacePetsDashboardSingularityChromeCollapseFragments = Object.freeze({
    collectSplitContainers,
  });
})(globalThis);

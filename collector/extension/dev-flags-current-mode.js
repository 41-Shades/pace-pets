(function attachPacePetsDevFlagsCurrentMode(root) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  function textElement(tagName, className, textContent) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = textContent;
    return element;
  }

  function appendSvgElement(svg, tagName, attributes) {
    const element = document.createElementNS(SVG_NS, tagName);
    Object.entries(attributes).forEach(([name, value]) => {
      element.setAttribute(name, value);
    });
    svg.append(element);
  }

  function modeIcon(name) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.classList.add("current-mode-icon", `current-mode-icon-${name}`);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    if (name === "check") {
      appendSvgElement(svg, "circle", {
        class: "current-mode-icon-fill",
        cx: "12",
        cy: "12",
        r: "10",
      });
      appendSvgElement(svg, "path", {
        class: "current-mode-icon-mark",
        d: "m7.5 12 3 3 6-7",
      });
      return svg;
    }

    throw new Error(`Unknown current mode icon: ${name}`);
  }

  function modeBadge(text) {
    const badge = textElement("span", "current-mode-badge", text);
    const dot = document.createElement("span");
    dot.className = "current-mode-badge-dot";
    badge.prepend(dot);
    return badge;
  }

  function renderCurrentMode({
    hasOverride,
    modeDetail,
    modeLabel,
    panel,
    resetButton,
    summary,
  }) {
    panel.classList.toggle("has-override", hasOverride);
    panel.classList.toggle("is-live", !hasOverride);
    panel.setAttribute("aria-label", modeDetail);
    panel.removeAttribute("aria-labelledby");

    const primary = document.createElement("div");
    const detail = document.createElement("div");
    primary.className = "current-mode-cell current-mode-primary";
    detail.className = "current-mode-cell current-mode-detail";
    detail.append(
      textElement("span", "current-mode-label", "Current source"),
      textElement("span", "current-mode-value", modeLabel),
    );

    if (hasOverride) {
      primary.classList.add("has-reset-action");
      primary.append(resetButton, modeBadge("OVERRIDE"));
    } else {
      const title = textElement("h2", "current-mode-title", modeDetail);
      title.id = "current-mode-title";
      primary.append(modeIcon("check"), title, modeBadge("LIVE"));
    }
    summary.replaceChildren(primary, detail);
  }

  root.PacePetsDevFlagsCurrentMode = Object.freeze({
    renderCurrentMode,
  });
})(globalThis);

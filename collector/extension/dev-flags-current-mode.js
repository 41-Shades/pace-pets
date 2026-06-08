(function attachPacePetsDevFlagsCurrentMode(root) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const COPY = Object.freeze({
    liveFooter: "Default operating mode",
    liveNotice: "No override active. Streaming from live sensors.",
    overrideNotice: "Manual test control is overriding live sensors.",
  });

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

    if (name === "warning") {
      appendSvgElement(svg, "path", {
        d: "M12 3 22 20H2L12 3Z",
      });
      appendSvgElement(svg, "path", {
        d: "M12 9v5",
      });
      appendSvgElement(svg, "circle", {
        class: "current-mode-icon-dot",
        cx: "12",
        cy: "17",
        r: "0.8",
      });
      return svg;
    }

    if (name === "terminal") {
      appendSvgElement(svg, "path", {
        d: "m6 8 4 4-4 4",
      });
      appendSvgElement(svg, "path", {
        d: "M12 16h6",
      });
      return svg;
    }

    if (name === "shield") {
      appendSvgElement(svg, "path", {
        d: "M12 3 19 6v5c0 4.5-2.8 8.1-7 10-4.2-1.9-7-5.5-7-10V6l7-3Z",
      });
      return svg;
    }

    appendSvgElement(svg, "circle", {
      cx: "12",
      cy: "12",
      r: "9",
    });
    appendSvgElement(svg, "path", {
      d: "M12 11v5",
    });
    appendSvgElement(svg, "circle", {
      class: "current-mode-icon-dot",
      cx: "12",
      cy: "8",
      r: "0.7",
    });
    return svg;
  }

  function modeBadge(text) {
    const badge = textElement("span", "current-mode-badge", text);
    const dot = document.createElement("span");
    dot.className = "current-mode-badge-dot";
    badge.prepend(dot);
    return badge;
  }

  function modeNotice(message) {
    const notice = document.createElement("div");
    notice.className = "current-mode-notice";
    notice.append(
      modeIcon("info"),
      textElement("span", "current-mode-notice-text", message),
    );
    return notice;
  }

  function renderOverrideMode({ modeLabel, summary }) {
    const body = document.createElement("div");
    const command = document.createElement("div");
    body.className = "current-mode-body";
    command.className = "current-mode-command";
    command.append(
      modeIcon("terminal"),
      textElement("span", "current-mode-command-text", modeLabel),
    );
    body.append(command, modeNotice(COPY.overrideNotice));
    summary.append(body);
  }

  function renderLiveMode(summary) {
    const body = document.createElement("div");
    const footer = document.createElement("footer");
    body.className = "current-mode-body";
    footer.className = "current-mode-footer";
    footer.append(
      modeIcon("shield"),
      textElement("span", "current-mode-footer-text", COPY.liveFooter),
    );
    body.append(modeNotice(COPY.liveNotice));
    summary.append(body, footer);
  }

  function renderCurrentMode({
    hasOverride,
    modeDetail,
    modeLabel,
    panel,
    summary,
  }) {
    panel.classList.toggle("has-override", hasOverride);
    panel.classList.toggle("is-live", !hasOverride);
    panel.setAttribute("aria-labelledby", "current-mode-title");

    const header = document.createElement("header");
    const title = textElement("h2", "current-mode-title", modeDetail);
    header.className = "current-mode-header";
    title.id = "current-mode-title";
    header.append(
      modeIcon(hasOverride ? "warning" : "check"),
      title,
      modeBadge(hasOverride ? "OVERRIDE" : "LIVE"),
    );

    summary.replaceChildren(header);
    if (hasOverride) {
      renderOverrideMode({ modeLabel, summary });
      return;
    }
    renderLiveMode(summary);
  }

  root.PacePetsDevFlagsCurrentMode = Object.freeze({
    renderCurrentMode,
  });
})(globalThis);

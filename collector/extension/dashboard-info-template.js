(() => {
  "use strict";

  const INFO_ITEMS = Object.freeze([
    ["Pace", "Compares usage remaining with time remaining."],
    ["Perfect", "Zero is not enough. Timing makes it perfect."],
    [
      "Source",
      "Uses the ChatGPT session already signed in to this Chrome profile to check usage status from chatgpt.com.",
    ],
    [
      "Local",
      "Usage and reset history stay in this browser; no server, account, or sync. Pace Pets cannot read chats or page contents.",
    ],
    [
      "Affiliation",
      "Independent 41 Shades utility; not an OpenAI product. Usage source may change or stop working.",
    ],
  ]);
  const META_LINKS = Object.freeze([
    ["41 Shades", "https://www.41-shades.com/"],
    [
      "Chrome Web Store",
      "https://chromewebstore.google.com/detail/pace-pets/dgemeohjkjclceamjacmfneodafbcbdk",
    ],
    ["GitHub", "https://github.com/41-Shades/pace-pets"],
  ]);

  function element(documentRef, tagName, attributes = {}, children = []) {
    const node = documentRef.createElement(tagName);
    for (const [name, value] of Object.entries(attributes)) {
      if (value === true) {
        node.setAttribute(name, "");
      } else if (value !== false && value !== null && value !== undefined) {
        node.setAttribute(name, value);
      }
    }
    node.append(...children);
    return node;
  }

  function infoItem(documentRef, [label, text]) {
    return element(documentRef, "p", { class: "info-panel-item" }, [
      element(documentRef, "span", { class: "info-panel-label" }, [
        `${label}:`,
      ]),
      ` ${text}`,
    ]);
  }

  function metaLink(documentRef, [label, href]) {
    return element(
      documentRef,
      "a",
      {
        class: "info-panel-meta-link",
        href,
        rel: "noopener noreferrer",
        target: "_blank",
      },
      [label],
    );
  }

  function metaSeparator(documentRef) {
    return element(
      documentRef,
      "span",
      { class: "info-panel-meta-separator" },
      ["·"],
    );
  }

  function metaLinks(documentRef) {
    const children = [];
    META_LINKS.forEach((link, index) => {
      if (index > 0) {
        children.push(metaSeparator(documentRef));
      }
      children.push(metaLink(documentRef, link));
    });
    return element(documentRef, "p", { class: "info-panel-meta" }, children);
  }

  function clearDataButton(documentRef) {
    return element(
      documentRef,
      "button",
      {
        "aria-label": "Clears all local usage history. Resets Pace Pets.",
        class: "info-panel-clear-data",
        "data-tooltip": "Clears all local usage history.",
        "data-tooltip-hint": "Resets Pace Pets.",
        id: "clear-data-button",
        type: "button",
      },
      ["Clear data"],
    );
  }

  function motionToggle(documentRef) {
    return element(
      documentRef,
      "button",
      {
        "aria-label": "Turn motion effects off",
        "aria-pressed": "true",
        class: "info-panel-motion-toggle",
        "data-tooltip": "Turn motion effects off",
        id: "info-motion-toggle",
        type: "button",
      },
      [
        element(documentRef, "span", { class: "info-panel-motion-option on" }, [
          "On",
        ]),
        element(
          documentRef,
          "span",
          { class: "info-panel-motion-option off" },
          ["Off"],
        ),
      ],
    );
  }

  function infoPanelControlRow(documentRef) {
    return element(documentRef, "div", { class: "info-panel-control-row" }, [
      element(documentRef, "div", { class: "info-panel-control-group" }, [
        element(documentRef, "span", { class: "info-panel-motion-control" }, [
          element(documentRef, "span", { class: "info-panel-control-label" }, [
            "Motion effects",
          ]),
          motionToggle(documentRef),
        ]),
        clearDataButton(documentRef),
      ]),
    ]);
  }

  function infoPanelContent(documentRef) {
    return element(documentRef, "div", { class: "info-panel-content" }, [
      element(
        documentRef,
        "div",
        { class: "info-panel-grid" },
        INFO_ITEMS.map((item) => infoItem(documentRef, item)),
      ),
      infoPanelControlRow(documentRef),
      element(documentRef, "div", { class: "info-panel-meta-row" }, [
        metaLinks(documentRef),
      ]),
    ]);
  }

  function infoPanelHeader(documentRef) {
    return element(documentRef, "header", { class: "info-panel-header" }, [
      element(
        documentRef,
        "button",
        {
          "aria-label": "Close dashboard info",
          class: "info-close",
          id: "info-close",
          type: "button",
        },
        [
          element(documentRef, "span", {
            "aria-hidden": "true",
            class: "info-close-icon",
          }),
        ],
      ),
    ]);
  }

  function infoPanel(documentRef) {
    return element(
      documentRef,
      "section",
      {
        "aria-label": "About Pace Pets",
        "aria-modal": "true",
        class: "info-panel",
        role: "dialog",
      },
      [infoPanelHeader(documentRef), infoPanelContent(documentRef)],
    );
  }

  function infoOverlay(documentRef) {
    return element(
      documentRef,
      "div",
      {
        class: "info-overlay",
        hidden: true,
        id: "info-overlay",
      },
      [infoPanel(documentRef)],
    );
  }

  function attachInfoOverlay(documentRef) {
    if (documentRef.getElementById("info-overlay")) {
      return;
    }

    const usagePanel = documentRef.querySelector(".usage-panel");
    if (!usagePanel) {
      throw new Error("Dashboard usage panel must exist before info template.");
    }

    usagePanel.append(infoOverlay(documentRef));
  }

  attachInfoOverlay(document);
})();

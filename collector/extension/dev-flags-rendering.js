(() => {
  "use strict";

  function requiredElement(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Dev controls element ${selector} is missing.`);
    }
    return element;
  }

  function requiredElementById(id) {
    return requiredElement(`#${id}`);
  }

  function optionButton({
    action = false,
    active = false,
    indicator = true,
    labelText,
    onClick,
    onError,
    pressed,
  }) {
    const button = document.createElement("button");
    button.className = "option-row";
    button.classList.toggle("has-option-indicator", indicator);
    button.classList.toggle("is-active", active);
    button.type = "button";
    if (!action) {
      button.setAttribute("aria-pressed", String(pressed));
    }
    button.addEventListener("click", () => {
      onClick({ pressed }).catch(onError);
    });
    const text = document.createElement("span");
    text.className = "option-label";
    text.textContent = labelText;
    button.append(text);
    return button;
  }

  globalThis.PacePetsDevFlagsRendering = Object.freeze({
    optionButton,
    requiredElement,
    requiredElementById,
  });
})();

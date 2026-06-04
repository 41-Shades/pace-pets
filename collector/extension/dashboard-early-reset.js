(() => {
  "use strict";

  const EARLY_RESET_POPOVER_MESSAGES = [
    "This button does nothing. But keep trying.",
    "Still nothing. It did get bigger.",
    "Persistent click detected.",
    "Reset pressure rising.",
    "Early reset request submitted to balloon.",
    "Reset looks close.\nSurely one more click.",
  ];
  const EARLY_RESET_POPOVER_HIDE_DELAY_MS = 3600;
  const EARLY_RESET_POPOVER_POP_DELAY_MS = 1000;

  function createController({ button, popover, popoverText, hideTooltip }) {
    let popoverTimer = null;
    let clickCount = 0;
    let isPopping = false;

    function setMessage(message) {
      const lines = message.split("\n");
      const fragment = document.createDocumentFragment();

      popover.setAttribute("aria-label", message.replace(/\n/g, " "));

      lines.forEach((line) => {
        const lineElement = document.createElement("span");
        lineElement.className = "early-reset-popover-line";

        line.split(" ").forEach((word) => {
          const wordElement = document.createElement("span");
          wordElement.className = "early-reset-popover-word";
          wordElement.setAttribute("aria-hidden", "true");
          wordElement.textContent = word;
          lineElement.append(wordElement);
        });

        fragment.append(lineElement);
      });

      popoverText.replaceChildren(fragment);
    }

    function restore() {
      clickCount = 0;
      isPopping = false;
      popover.classList.remove("is-popping");
      popover.removeAttribute("data-early-reset-stage");
      setMessage(EARLY_RESET_POPOVER_MESSAGES[0]);
    }

    function hide() {
      window.clearTimeout(popoverTimer);
      popoverTimer = null;
      popover.hidden = true;
      restore();
    }

    function scheduleHide(delay = EARLY_RESET_POPOVER_HIDE_DELAY_MS) {
      window.clearTimeout(popoverTimer);
      popoverTimer = window.setTimeout(hide, delay);
    }

    function setStage(stageIndex) {
      setMessage(EARLY_RESET_POPOVER_MESSAGES[stageIndex]);
      popover.dataset.earlyResetStage = String(stageIndex);
    }

    function pop() {
      isPopping = true;
      setMessage("RESET\nDENIED!");
      popover.dataset.earlyResetStage = "pop";
      popover.classList.add("is-popping");
      scheduleHide(EARLY_RESET_POPOVER_POP_DELAY_MS);
    }

    function handleButtonClick(event) {
      event.stopPropagation();
      hideTooltip?.({ immediate: true });

      if (isPopping) {
        return;
      }

      popover.hidden = false;
      clickCount += 1;

      if (clickCount > EARLY_RESET_POPOVER_MESSAGES.length) {
        pop();
        return;
      }

      setStage(clickCount - 1);
      scheduleHide();
    }

    function hideIfOutside(event) {
      if (!button.contains(event.target)) {
        hide();
      }
    }

    return Object.freeze({
      handleButtonClick,
      hide,
      hideIfOutside,
    });
  }

  globalThis.PacePetsEarlyReset = Object.freeze({
    createController,
  });
})();

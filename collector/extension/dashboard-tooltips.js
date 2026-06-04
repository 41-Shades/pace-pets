(() => {
  "use strict";

  const APP_TOOLTIP_ID = "app-tooltip";
  const APP_TOOLTIP_SELECTOR = "[data-tooltip]";
  const APP_TOOLTIP_SHOW_DELAY_MS = 180;
  const APP_TOOLTIP_OFFSET_PX = 8;
  const APP_TOOLTIP_VIEWPORT_MARGIN_PX = 8;
  const APP_TOOLTIP_SLOW_FADE_MS = 1600;
  const APP_TOOLTIP_SLOW_AUTO_HIDE_DELAY_MS = APP_TOOLTIP_SLOW_FADE_MS + 500;
  const APP_TOOLTIP_SUPPRESS_AFTER_INFO_CLOSE_MS = 360;

  function targetFromEvent(event) {
    return event.target instanceof Element
      ? event.target.closest(APP_TOOLTIP_SELECTOR)
      : null;
  }

  function textForTarget(target) {
    return target?.dataset?.tooltip?.trim() || "";
  }

  function hintForTarget(target) {
    return target?.dataset?.tooltipHint?.trim() || "";
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isPointerClick(event) {
    return event.detail > 0;
  }

  function createController({ tooltipElement }) {
    let activeTarget = null;
    let showTimer = null;
    let hideTimer = null;
    let autoHideTimer = null;
    let suppressUntilMs = 0;

    function addDescription(target) {
      if (target.getAttribute("aria-hidden") === "true") {
        return;
      }

      const describedBy = target.getAttribute("aria-describedby") || "";
      const ids = describedBy.split(/\s+/).filter(Boolean);
      if (ids.includes(APP_TOOLTIP_ID)) {
        return;
      }

      target.dataset.appTooltipDescribed = "true";
      target.setAttribute(
        "aria-describedby",
        [...ids, APP_TOOLTIP_ID].join(" "),
      );
    }

    function removeDescription(target) {
      if (!target?.dataset?.appTooltipDescribed) {
        return;
      }

      const ids = (target.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter((id) => id && id !== APP_TOOLTIP_ID);
      if (ids.length > 0) {
        target.setAttribute("aria-describedby", ids.join(" "));
      } else {
        target.removeAttribute("aria-describedby");
      }
      delete target.dataset.appTooltipDescribed;
    }

    function position(target) {
      if (!tooltipElement) {
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltipElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = APP_TOOLTIP_VIEWPORT_MARGIN_PX;
      const preferredPlacement = target.dataset.tooltipPlacement;

      if (preferredPlacement === "right") {
        let placement = "right";
        let left = targetRect.right + APP_TOOLTIP_OFFSET_PX;
        if (left + tooltipRect.width > viewportWidth - margin) {
          placement = "left";
          left = targetRect.left - tooltipRect.width - APP_TOOLTIP_OFFSET_PX;
        }

        left = clampNumber(
          left,
          margin,
          viewportWidth - tooltipRect.width - margin,
        );
        const top = clampNumber(
          targetRect.top + targetRect.height / 2 - tooltipRect.height / 2,
          margin,
          viewportHeight - tooltipRect.height - margin,
        );
        const arrowTop = clampNumber(
          targetRect.top + targetRect.height / 2 - top,
          12,
          tooltipRect.height - 12,
        );

        tooltipElement.dataset.placement = placement;
        tooltipElement.style.left = `${left}px`;
        tooltipElement.style.top = `${top}px`;
        tooltipElement.style.setProperty(
          "--tooltip-arrow-top",
          `${arrowTop}px`,
        );
        return;
      }

      let placement = "top";
      let top = targetRect.top - tooltipRect.height - APP_TOOLTIP_OFFSET_PX;

      if (top < margin) {
        placement = "bottom";
        top = targetRect.bottom + APP_TOOLTIP_OFFSET_PX;
      }

      top = clampNumber(
        top,
        margin,
        viewportHeight - tooltipRect.height - margin,
      );
      const centeredLeft =
        targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      const left = clampNumber(
        centeredLeft,
        margin,
        viewportWidth - tooltipRect.width - margin,
      );
      const arrowLeft = clampNumber(
        targetRect.left + targetRect.width / 2 - left,
        12,
        tooltipRect.width - 12,
      );

      tooltipElement.dataset.placement = placement;
      tooltipElement.style.left = `${left}px`;
      tooltipElement.style.top = `${top}px`;
      tooltipElement.style.setProperty(
        "--tooltip-arrow-left",
        `${arrowLeft}px`,
      );
    }

    function hide({ immediate = false } = {}) {
      window.clearTimeout(showTimer);
      showTimer = null;
      window.clearTimeout(autoHideTimer);
      autoHideTimer = null;
      if (activeTarget) {
        removeDescription(activeTarget);
      }
      activeTarget = null;

      if (tooltipElement) {
        const hasSlowFade =
          tooltipElement.dataset.motion === "slow" && !tooltipElement.hidden;
        window.clearTimeout(hideTimer);
        hideTimer = null;
        tooltipElement.classList.remove("is-visible");
        if (hasSlowFade && !immediate) {
          hideTimer = window.setTimeout(() => {
            tooltipElement.hidden = true;
            delete tooltipElement.dataset.motion;
            delete tooltipElement.dataset.variant;
            hideTimer = null;
          }, APP_TOOLTIP_SLOW_FADE_MS);
        } else {
          tooltipElement.hidden = true;
          delete tooltipElement.dataset.motion;
          delete tooltipElement.dataset.variant;
        }
      }
    }

    function show(target) {
      const text = textForTarget(target);
      const hint = hintForTarget(target);
      if (!tooltipElement || !text) {
        hide();
        return;
      }

      window.clearTimeout(hideTimer);
      hideTimer = null;
      window.clearTimeout(autoHideTimer);
      autoHideTimer = null;
      activeTarget = target;
      const motion = target.dataset.tooltipMotion?.trim() || "";
      if (motion) {
        tooltipElement.dataset.motion = motion;
      } else {
        delete tooltipElement.dataset.motion;
      }
      const variant = target.dataset.tooltipVariant?.trim() || "";
      if (variant) {
        tooltipElement.dataset.variant = variant;
      } else {
        delete tooltipElement.dataset.variant;
      }
      tooltipElement.textContent = text;
      if (hint) {
        const hintElement = document.createElement("span");
        hintElement.className = "app-tooltip-hint";
        hintElement.textContent = hint;
        tooltipElement.append(hintElement);
      }
      tooltipElement.hidden = false;
      tooltipElement.classList.remove("is-visible");
      position(target);
      addDescription(target);

      window.requestAnimationFrame(() => {
        if (activeTarget === target) {
          tooltipElement.classList.add("is-visible");
          if (target.dataset.tooltipAutoHide === "true") {
            autoHideTimer = window.setTimeout(() => {
              if (activeTarget === target) {
                hide();
              }
            }, APP_TOOLTIP_SLOW_AUTO_HIDE_DELAY_MS);
          }
        }
      });
    }

    function schedule(target) {
      window.clearTimeout(showTimer);
      showTimer = window.setTimeout(() => {
        showTimer = null;
        show(target);
      }, APP_TOOLTIP_SHOW_DELAY_MS);
    }

    function setText(element, text) {
      if (!element) {
        return;
      }

      const nextText = String(text || "").trim();
      if (nextText) {
        element.dataset.tooltip = nextText;
      } else {
        element.removeAttribute("data-tooltip");
      }

      if (element === activeTarget) {
        if (nextText) {
          show(element);
        } else {
          hide();
        }
      }
    }

    function suppressTemporarily(
      durationMs = APP_TOOLTIP_SUPPRESS_AFTER_INFO_CLOSE_MS,
    ) {
      suppressUntilMs = Date.now() + durationMs;
    }

    function isSuppressed() {
      return Date.now() < suppressUntilMs;
    }

    function isActiveTarget(target) {
      return activeTarget === target;
    }

    function releasePointerClickFocus(event, element) {
      if (!isPointerClick(event) || document.activeElement !== element) {
        return;
      }

      element.blur();
      hide();
    }

    return Object.freeze({
      hide,
      isActiveTarget,
      isPointerClick,
      isSuppressed,
      releasePointerClickFocus,
      schedule,
      setText,
      suppressTemporarily,
      targetFromEvent,
    });
  }

  globalThis.PacePetsAppTooltips = Object.freeze({
    createController,
    targetFromEvent,
  });
})();

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

  class AppTooltipController {
    constructor({ tooltipElement }) {
      this.activeTarget = null;
      this.autoHideTimer = null;
      this.hideTimer = null;
      this.showTimer = null;
      this.suppressUntilMs = 0;
      this.tooltipElement = tooltipElement;
    }

    addDescription(target) {
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

    removeDescription(target) {
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

    positionBesideTarget(target, targetRect, tooltipRect) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = APP_TOOLTIP_VIEWPORT_MARGIN_PX;
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

      this.tooltipElement.dataset.placement = placement;
      this.tooltipElement.style.left = `${left}px`;
      this.tooltipElement.style.top = `${top}px`;
      this.tooltipElement.style.setProperty(
        "--tooltip-arrow-top",
        `${arrowTop}px`,
      );
    }

    positionAboveOrBelowTarget(targetRect, tooltipRect) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = APP_TOOLTIP_VIEWPORT_MARGIN_PX;
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

      this.tooltipElement.dataset.placement = placement;
      this.tooltipElement.style.left = `${left}px`;
      this.tooltipElement.style.top = `${top}px`;
      this.tooltipElement.style.setProperty(
        "--tooltip-arrow-left",
        `${arrowLeft}px`,
      );
    }

    position(target) {
      if (!this.tooltipElement) {
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const tooltipRect = this.tooltipElement.getBoundingClientRect();
      if (target.dataset.tooltipPlacement === "right") {
        this.positionBesideTarget(target, targetRect, tooltipRect);
        return;
      }

      this.positionAboveOrBelowTarget(targetRect, tooltipRect);
    }

    clearTimers() {
      window.clearTimeout(this.showTimer);
      this.showTimer = null;
      window.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }

    finishHide() {
      this.tooltipElement.hidden = true;
      delete this.tooltipElement.dataset.motion;
      delete this.tooltipElement.dataset.variant;
    }

    hide({ immediate = false } = {}) {
      this.clearTimers();
      if (this.activeTarget) {
        this.removeDescription(this.activeTarget);
      }
      this.activeTarget = null;

      if (!this.tooltipElement) {
        return;
      }

      const hasSlowFade =
        this.tooltipElement.dataset.motion === "slow" &&
        !this.tooltipElement.hidden;
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
      this.tooltipElement.classList.remove("is-visible");
      if (hasSlowFade && !immediate) {
        this.hideTimer = window.setTimeout(() => {
          this.finishHide();
          this.hideTimer = null;
        }, APP_TOOLTIP_SLOW_FADE_MS);
        return;
      }

      this.finishHide();
    }

    applyTargetDecorations(target) {
      const motion = target.dataset.tooltipMotion?.trim() || "";
      const variant = target.dataset.tooltipVariant?.trim() || "";
      if (motion) {
        this.tooltipElement.dataset.motion = motion;
      } else {
        delete this.tooltipElement.dataset.motion;
      }
      if (variant) {
        this.tooltipElement.dataset.variant = variant;
      } else {
        delete this.tooltipElement.dataset.variant;
      }
    }

    renderContent(text, hint) {
      this.tooltipElement.textContent = text;
      if (hint) {
        const hintElement = document.createElement("span");
        hintElement.className = "app-tooltip-hint";
        hintElement.textContent = hint;
        this.tooltipElement.append(hintElement);
      }
    }

    scheduleAutoHide(target) {
      if (target.dataset.tooltipAutoHide !== "true") {
        return;
      }

      this.autoHideTimer = window.setTimeout(() => {
        if (this.activeTarget === target) {
          this.hide();
        }
      }, APP_TOOLTIP_SLOW_AUTO_HIDE_DELAY_MS);
    }

    show(target) {
      const text = textForTarget(target);
      const hint = hintForTarget(target);
      if (!this.tooltipElement || !text) {
        this.hide();
        return;
      }

      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
      window.clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
      this.activeTarget = target;
      this.applyTargetDecorations(target);
      this.renderContent(text, hint);
      this.tooltipElement.hidden = false;
      this.tooltipElement.classList.remove("is-visible");
      this.position(target);
      this.addDescription(target);

      window.requestAnimationFrame(() => {
        if (this.activeTarget === target) {
          this.tooltipElement.classList.add("is-visible");
          this.scheduleAutoHide(target);
        }
      });
    }

    schedule(target) {
      window.clearTimeout(this.showTimer);
      this.showTimer = window.setTimeout(() => {
        this.showTimer = null;
        this.show(target);
      }, APP_TOOLTIP_SHOW_DELAY_MS);
    }

    setText(element, text) {
      if (!element) {
        return;
      }

      const nextText = String(text || "").trim();
      if (nextText) {
        element.dataset.tooltip = nextText;
      } else {
        element.removeAttribute("data-tooltip");
      }

      if (element === this.activeTarget) {
        if (nextText) {
          this.show(element);
        } else {
          this.hide();
        }
      }
    }

    suppressTemporarily(durationMs = APP_TOOLTIP_SUPPRESS_AFTER_INFO_CLOSE_MS) {
      this.suppressUntilMs = Date.now() + durationMs;
    }

    isSuppressed() {
      return Date.now() < this.suppressUntilMs;
    }

    isActiveTarget(target) {
      return this.activeTarget === target;
    }

    releasePointerClickFocus(event, element) {
      if (!isPointerClick(event) || document.activeElement !== element) {
        return;
      }

      element.blur();
      this.hide();
    }
  }

  function createController(options) {
    const controller = new AppTooltipController(options);
    return Object.freeze({
      hide: controller.hide.bind(controller),
      isActiveTarget: controller.isActiveTarget.bind(controller),
      isPointerClick,
      isSuppressed: controller.isSuppressed.bind(controller),
      releasePointerClickFocus:
        controller.releasePointerClickFocus.bind(controller),
      schedule: controller.schedule.bind(controller),
      setText: controller.setText.bind(controller),
      suppressTemporarily: controller.suppressTemporarily.bind(controller),
      targetFromEvent,
    });
  }

  globalThis.PacePetsAppTooltips = Object.freeze({
    createController,
    targetFromEvent,
  });
})();

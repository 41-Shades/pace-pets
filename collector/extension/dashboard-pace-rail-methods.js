(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-pace-rail-methods.js.",
    );
  }

  function tooltipForState(state) {
    if (state.key === DATA.PACE_STATES.sync.key) {
      return "Usage and time perfectly match.";
    }
    if (state.key === DATA.PACE_STATES.perfectZero.key) {
      return "Usage and time perfectly round to zero, without running out.";
    }
    if (state.key === DATA.DASHBOARD_RAIL_STATES.singularity.key) {
      return "A perfect singularity of round zeros, but not actually zero.";
    }

    return `Preview mock ${state.title} status`;
  }

  function tooltipHintForState(canPreview) {
    return canPreview ? "Click to preview" : "";
  }

  Object.assign(Controller.prototype, {
    renderStateChip(stateKey) {
      const state = this.paceStateForKey(stateKey) || DATA.PACE_STATES.muted;
      const canPreview = this.previewStateKeyEnabled(state.key);
      const chip = document.createElement(canPreview ? "button" : "div");
      chip.className = `state-chip ${state.className}`;
      chip.dataset.paceStateKey = state.key;
      chip.dataset.previewable = String(canPreview);
      chip.dataset.tooltip = tooltipForState(state);
      const tooltipHint = tooltipHintForState(canPreview);
      if (tooltipHint) {
        chip.dataset.tooltipHint = tooltipHint;
      }
      if (canPreview) {
        chip.type = "button";
        chip.setAttribute("aria-controls", "pace-card");
      }

      const icon = document.createElement("div");
      icon.className = "state-icon";
      icon.setAttribute("aria-hidden", "true");
      this.renderPaceIcon(icon, state.className);

      const title = document.createElement("strong");
      title.textContent = state.title;
      const ratio = document.createElement("span");
      ratio.className = "state-ratio";
      ratio.textContent = state.ratioLabel;
      const meta = document.createElement("span");
      meta.className = "state-meta";
      meta.append(ratio);
      const copy = document.createElement("div");
      copy.className = "state-copy";
      copy.append(title, meta);
      chip.append(icon, copy);
      return chip;
    },

    renderStateColumn(className, titleText, stateKeys) {
      const column = document.createElement("div");
      column.className = `state-column ${className}`;
      const title = document.createElement("h2");
      title.className = "state-column-title";
      title.textContent = titleText;
      column.replaceChildren(
        title,
        ...stateKeys.map((stateKey) => this.renderStateChip(stateKey)),
      );
      return column;
    },

    renderStateRail() {
      if (!this.elements.paceStateStack) {
        return;
      }

      const levelStateKeys = DATA.PACE_LEVEL_LEGEND_STATE_KEYS.filter(
        (stateKey) => this.previewStateKeyEnabled(stateKey),
      );
      const columns = [];
      if (levelStateKeys.length) {
        columns.push(
          this.renderStateColumn(
            "state-column-levels",
            "Pace levels",
            levelStateKeys,
          ),
        );
      }
      if (DATA.PACE_PERFECT_LEGEND_STATE_KEYS.length) {
        columns.push(
          this.renderStateColumn(
            "state-column-perfects",
            "Perfect states",
            DATA.PACE_PERFECT_LEGEND_STATE_KEYS,
          ),
        );
      }

      this.elements.paceStateStack.hidden = !columns.length;
      this.elements.paceStateStack.replaceChildren(...columns);
    },

    updateStateRailActiveSelection(activeKey) {
      if (!this.elements.paceStateStack) {
        return;
      }

      this.elements.paceStateStack
        .querySelectorAll(".state-chip[data-pace-state-key]")
        .forEach((chip) => {
          chip.classList.toggle(
            "is-active",
            chip.dataset.paceStateKey === activeKey,
          );
        });
    },

    updateStateRailPreviewSelection(activeKey) {
      if (!this.elements.paceStateStack) {
        return;
      }

      this.elements.paceStateStack.classList.toggle(
        "is-previewing-state",
        Boolean(activeKey),
      );
      this.elements.paceStateStack
        .querySelectorAll(".state-chip[data-pace-state-key]")
        .forEach((chip) => {
          chip.classList.toggle(
            "is-previewing",
            chip.dataset.paceStateKey === activeKey,
          );
        });
    },

    stateChipFromEvent(event) {
      const target = event.target instanceof Element ? event.target : null;
      const chip = target?.closest(".state-chip[data-pace-state-key]");
      return chip &&
        chip.dataset.previewable === "true" &&
        this.elements.paceStateStack.contains(chip)
        ? chip
        : null;
    },
  });
})();

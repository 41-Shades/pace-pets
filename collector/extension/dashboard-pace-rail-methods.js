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
    if (state.key === DATA.PACE_STATES.singularity.key) {
      return "A perfect singularity of round zeros, but not actually zero.";
    }
    if (state.key === DATA.PACE_STATES.splat.key) {
      return "An imperfect splat against time.";
    }

    return state.copy;
  }

  Object.assign(Controller.prototype, {
    renderStateChip(stateKey, { showTooltip = true } = {}) {
      const state = this.paceStateForKey(stateKey) || DATA.PACE_STATES.muted;
      const chip = document.createElement("div");
      chip.className = `state-chip ${state.className}`;
      chip.dataset.paceStateKey = state.key;
      if (showTooltip) {
        chip.dataset.tooltip = tooltipForState(state);
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

    renderStateColumn(
      className,
      titleText,
      stateKeys,
      { showChipTooltips = true } = {},
    ) {
      const column = document.createElement("div");
      column.className = `state-column ${className}`;
      const title = document.createElement("h2");
      title.className = "state-column-title";
      title.textContent = titleText;
      column.replaceChildren(
        title,
        ...stateKeys.map((stateKey) =>
          this.renderStateChip(stateKey, { showTooltip: showChipTooltips }),
        ),
      );
      return column;
    },

    renderStateSection(className, titleText, stateKeys) {
      const section = document.createElement("div");
      section.className = `state-column-section ${className}`;
      const title = document.createElement("h2");
      title.className = "state-column-title";
      title.textContent = titleText;
      section.replaceChildren(
        title,
        ...stateKeys.map((stateKey) => this.renderStateChip(stateKey)),
      );
      return section;
    },

    renderStateColumnStack(className, sections) {
      const column = document.createElement("div");
      column.className = `state-column ${className}`;
      column.replaceChildren(
        ...sections.map((section) =>
          this.renderStateSection(
            section.className,
            section.titleText,
            section.stateKeys,
          ),
        ),
      );
      return column;
    },

    renderStateRail() {
      if (!this.elements.paceStateStack) {
        return;
      }

      const columns = [
        this.renderStateColumn(
          "state-column-levels",
          "Pace levels",
          DATA.PACE_LEVEL_LEGEND_STATE_KEYS,
          { showChipTooltips: false },
        ),
      ];
      const rightColumnSections = [];
      if (DATA.PACE_PERFECT_LEGEND_STATE_KEYS.length) {
        rightColumnSections.push({
          className: "state-section-perfects",
          titleText: "Perfect states",
          stateKeys: DATA.PACE_PERFECT_LEGEND_STATE_KEYS,
        });
      }
      if (DATA.PACE_IMPERFECT_LEGEND_STATE_KEYS.length) {
        rightColumnSections.push({
          className: "state-section-imperfects",
          titleText:
            DATA.PACE_IMPERFECT_LEGEND_STATE_KEYS.length === 1
              ? "Imperfect state"
              : "Imperfect states",
          stateKeys: DATA.PACE_IMPERFECT_LEGEND_STATE_KEYS,
        });
      }
      if (rightColumnSections.length) {
        columns.push(
          this.renderStateColumnStack(
            "state-column-perfects",
            rightColumnSections,
          ),
        );
      }

      this.elements.paceStateStack.hidden = !columns.length;
      this.elements.paceStateStack.replaceChildren(...columns);
      const activeState = this.paceStateForClassName(this.currentPaceLevel());
      this.updateStateRailActiveSelection(activeState.key);
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
  });
})();

(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-pace-icon-render-methods.js.",
    );
  }

  function setSvgAttributes(element, attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      element.setAttribute(name, value);
    }
  }

  Object.assign(Controller.prototype, {
    renderPlayfulPaceIcon(container, src, state, useEffects) {
      container.classList.add("is-playful");
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.decoding = "async";
      image.loading = "lazy";
      container.append(image);
      if (useEffects) {
        this.renderPaceIconEffect(container, state);
      }
    },

    renderSvgPaceIcon(container, state, useEffects) {
      container.classList.remove("is-playful");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("role", "img");
      for (const part of state.iconParts) {
        const element = document.createElementNS(
          "http://www.w3.org/2000/svg",
          part.tag,
        );
        setSvgAttributes(element, part.attrs);
        svg.append(element);
      }
      container.append(svg);
      if (useEffects) {
        this.renderPaceIconEffect(container, state);
      }
    },

    renderPerfectZeroApertureIcon(container, src) {
      container.classList.remove("is-playful");
      if (!src) {
        return;
      }

      const image = document.createElement("img");
      image.className = "perfect-zero-cameo";
      image.src = src;
      image.alt = "";
      image.decoding = "async";
      image.loading = "lazy";
      image.setAttribute("aria-hidden", "true");
      container.append(image);
    },
  });
})();

(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-pace-favicon-methods.js.",
    );
  }

  function svgAttributes(attrs) {
    return Object.entries(attrs)
      .map(([name, value]) => `${name}="${String(value)}"`)
      .join(" ");
  }

  function svgMarkupForIconParts(iconParts) {
    return iconParts
      .map((part) => `<${part.tag} ${svgAttributes(part.attrs)} />`)
      .join("");
  }

  Object.assign(Controller.prototype, {
    updateFavicon(level) {
      if (!this.elements.favicon) {
        return;
      }

      const state = this.paceStateForClassName(level);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="${state.favicon.bg}"/>
    <g transform="translate(8 8) scale(2)" fill="none" stroke="${state.favicon.color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
      ${svgMarkupForIconParts(state.favicon.iconParts)}
    </g>
  </svg>`;
      this.elements.favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    },
  });
})();

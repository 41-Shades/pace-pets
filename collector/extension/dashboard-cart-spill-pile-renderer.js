(() => {
  "use strict";

  const RADIANS_PER_DEGREE = Math.PI / 180;

  function pileLayer(state) {
    const host = state.cartSpillHost;
    if (!host?.isConnected) {
      return null;
    }

    if (!state.cartSpillPileLayer) {
      const layer = document.createElement("canvas");
      const pixelRatio = window.devicePixelRatio || 1;
      layer.className = "cart-spill-pile-layer";
      layer.setAttribute("aria-hidden", "true");
      layer.dataset.cartSpillPixelRatio = String(pixelRatio);
      layer.width = Math.max(1, Math.ceil(window.innerWidth * pixelRatio));
      layer.height = Math.max(1, Math.ceil(window.innerHeight * pixelRatio));
      host.append(layer);
      state.cartSpillPileLayer = layer;
    }

    return state.cartSpillPileLayer;
  }

  function pileContext(state) {
    const layer = pileLayer(state);
    if (!layer) {
      return null;
    }

    const context = layer.getContext("2d");
    if (!context) {
      return null;
    }

    const pixelRatio = Number(layer.dataset.cartSpillPixelRatio) || 1;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return context;
  }

  function drawSettledCartSpillItem(state, item) {
    if (!state.isActive || !item.image.naturalWidth) {
      return;
    }

    const context = pileContext(state);
    if (!context) {
      return;
    }

    const halfSizePx = item.sizePx / 2;
    context.save();
    context.translate(Math.round(item.landing.x), Math.round(item.landing.y));
    context.rotate(item.spinDeg * RADIANS_PER_DEGREE);
    context.scale(item.endScale, item.endScale);
    context.drawImage(
      item.image,
      -halfSizePx,
      -halfSizePx,
      item.sizePx,
      item.sizePx,
    );
    context.restore();
  }

  function settleCartSpillItem(state, item) {
    if (!state.isActive || !state.cartSpillHost?.isConnected) {
      return;
    }

    if (item.image.complete && item.image.naturalWidth > 0) {
      drawSettledCartSpillItem(state, item);
      return;
    }

    item.image.addEventListener(
      "load",
      () => drawSettledCartSpillItem(state, item),
      { once: true },
    );
  }

  function clearCartSpillPile(state) {
    state.cartSpillPileLayer?.remove();
    for (const layer of document.querySelectorAll(".cart-spill-pile-layer")) {
      layer.remove();
    }
    state.cartSpillPileLayer = null;
    state.cartSpillHost = null;
    state.cartSpillPileColumns?.clear();
  }

  globalThis.PacePetsDashboardCartSpillPileRenderer = Object.freeze({
    clearCartSpillPile,
    settleCartSpillItem,
  });
})();

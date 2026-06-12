(() => {
  "use strict";

  const App = globalThis.PacePetsDashboardApp;
  const THEME_ASSETS = globalThis.CodexThemeAssets;
  if (!App || !THEME_ASSETS) {
    throw new Error(
      "Pace Pets dashboard app core and theme assets must load before dashboard-reset-exhausted-methods.js.",
    );
  }

  function createResetExhaustedFigure(documentRef) {
    const figure = documentRef.createElement("span");
    figure.className = "reset-exhausted-figure";
    figure.setAttribute("aria-hidden", "true");
    figure.hidden = true;

    const stage = createResetExhaustedTrace(documentRef);
    figure.append(stage);
    return figure;
  }

  function createResetExhaustedTrace(documentRef) {
    const svg = documentRef.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    svg.classList.add("reset-exhausted-trace");
    svg.setAttribute("viewBox", "0 0 360 292");
    svg.setAttribute("focusable", "false");

    const linework = createSvgElement(documentRef, "g");
    linework.classList.add("reset-exhausted-trace-linework");
    linework.append(
      createTracePath(documentRef, "M 286 132 L 258 229"),
      createTracePath(
        documentRef,
        "M 286 132 C 310 178 327 223 331 256 L 354 261",
      ),
      createTracePath(documentRef, "M 258 229 L 159 229 L 7 253"),
      createTracePath(documentRef, "M 258 234 L 42 269 L 22 262"),
      createAnimatedArm(documentRef),
    );

    const head = createSvgElement(documentRef, "circle");
    head.classList.add("reset-exhausted-trace-head");
    head.setAttribute("cx", "278");
    head.setAttribute("cy", "66");
    head.setAttribute("r", "58");

    const face = createSvgElement(documentRef, "g");
    face.classList.add("reset-exhausted-trace-face");
    face.append(
      createTracePath(documentRef, "M 244 48 C 251 49 257 47 263 45"),
      createTracePath(documentRef, "M 240 68 C 249 74 258 73 265 67"),
      createTracePath(documentRef, "M 294 56 C 301 62 307 69 311 78"),
      createTracePath(documentRef, "M 292 82 C 301 90 311 94 320 91"),
      createTracePath(documentRef, "M 263 104 C 268 103 272 106 274 110"),
    );

    svg.append(linework, head, face);
    return svg;
  }

  function createAnimatedArm(documentRef) {
    const path = createTracePath(documentRef, "M 286 132 L 236 202 L 198 224");
    path.classList.add("reset-exhausted-free-arm");

    const animation = createSvgElement(documentRef, "animate");
    animation.setAttribute("attributeName", "d");
    animation.setAttribute("dur", "8.6s");
    animation.setAttribute("repeatCount", "indefinite");
    animation.setAttribute("keyTimes", "0;0.54;0.62;0.72;0.82;0.92;1");
    animation.setAttribute(
      "values",
      [
        "M 286 132 L 236 202 L 198 224",
        "M 286 132 L 236 202 L 198 224",
        "M 286 132 L 235 167 L 183 194",
        "M 286 132 L 233 135 L 177 110",
        "M 286 132 L 235 167 L 183 194",
        "M 286 132 L 236 202 L 198 224",
        "M 286 132 L 236 202 L 198 224",
      ].join(";"),
    );
    path.append(animation);
    return path;
  }

  function createTracePath(documentRef, pathData) {
    const path = createSvgElement(documentRef, "path");
    path.setAttribute("d", pathData);
    return path;
  }

  function createSvgElement(documentRef, tagName) {
    return documentRef.createElementNS("http://www.w3.org/2000/svg", tagName);
  }

  Object.assign(App.prototype, {
    ensureResetExhaustedFigure() {
      if (this.resetExhaustedFigure?.isConnected) {
        return this.resetExhaustedFigure;
      }

      const card = this.elements.resetCountdownCard;
      if (!card) {
        return null;
      }

      this.resetExhaustedFigure = createResetExhaustedFigure(
        card.ownerDocument,
      );
      card.append(this.resetExhaustedFigure);
      return this.resetExhaustedFigure;
    },

    renderResetExhaustedPreview() {
      const card = this.elements.resetCountdownCard;
      const active = this.currentResetExhaustedPreview === true;
      if (!card) {
        return;
      }

      card.classList.toggle("has-reset-exhausted-preview", active);
      if (!active) {
        if (this.resetExhaustedFigure) {
          this.resetExhaustedFigure.hidden = true;
        }
        return;
      }

      const figure = this.ensureResetExhaustedFigure();
      if (figure) {
        figure.hidden = false;
      }
    },
  });
})();

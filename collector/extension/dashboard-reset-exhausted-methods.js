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
      createTracePath(documentRef, "M 286 132 L 260.8 219.3"),
      createTracePath(
        documentRef,
        "M 286 132 C 307.6 173.4 322.9 213.9 326.5 243.6 L 347.2 248.1",
      ),
      createTracePath(documentRef, "M 260.8 219.3 L 171.7 219.3 L 34.9 240.9"),
      createTracePath(documentRef, "M 260.8 223.8 L 66.4 255.3 L 48.4 249"),
      createAnimatedArm(documentRef),
    );

    const head = createSvgElement(documentRef, "circle");
    head.classList.add("reset-exhausted-trace-head");
    head.setAttribute("cx", "278");
    head.setAttribute("cy", "66");
    head.setAttribute("r", "58");

    const face = createFaceExpressions(documentRef);

    svg.append(linework, head, face);
    return svg;
  }

  function createFaceExpressions(documentRef) {
    const face = createSvgElement(documentRef, "g");
    face.classList.add("reset-exhausted-trace-face");
    face.append(
      createFaceState(documentRef, "reset-exhausted-face-sleep", [
        "M 244 48 C 251 49 257 47 263 45",
        "M 294 56 C 301 62 307 69 311 78",
        "M 240 68 C 249 74 258 73 265 67",
        "M 292 82 C 301 90 311 94 320 91",
        "M 263 104 C 268 103 272 106 274 110",
      ]),
      createFaceState(documentRef, "reset-exhausted-face-slits", [
        "M 240 66 C 248 64 256 62 264 60",
        "M 294 75 C 302 80 310 86 318 91",
        "M 262 103 C 267 105 272 107 276 109",
      ]),
    );
    return face;
  }

  function createFaceState(documentRef, className, pathDataList) {
    const group = createSvgElement(documentRef, "g");
    group.classList.add("reset-exhausted-face-state", className);
    group.append(
      ...pathDataList.map((pathData) => createTracePath(documentRef, pathData)),
    );
    return group;
  }

  function createAnimatedArm(documentRef) {
    const path = createTracePath(
      documentRef,
      "M 286 132 L 241 195 L 206.8 214.8",
    );
    path.classList.add("reset-exhausted-free-arm");

    const animation = createSvgElement(documentRef, "animate");
    animation.setAttribute("attributeName", "d");
    animation.setAttribute("dur", "10.9s");
    animation.setAttribute("fill", "freeze");
    animation.setAttribute("repeatCount", "1");
    animation.setAttribute(
      "keyTimes",
      "0;0.426;0.491;0.565;0.796;0.843;0.89;1",
    );
    animation.setAttribute(
      "values",
      [
        "M 286 132 L 241 195 L 206.8 214.8",
        "M 286 132 L 241 195 L 206.8 214.8",
        "M 286 132 L 240.1 163.5 L 193.3 187.8",
        "M 286 132 L 238.3 134.7 L 187.9 112.2",
        "M 286 132 L 238.3 134.7 L 187.9 112.2",
        "M 286 132 L 240.1 163.5 L 193.3 187.8",
        "M 286 132 L 241 195 L 206.8 214.8",
        "M 286 132 L 241 195 L 206.8 214.8",
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

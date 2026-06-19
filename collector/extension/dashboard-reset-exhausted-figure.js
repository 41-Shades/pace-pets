(() => {
  "use strict";

  const ARM_MOTION = globalThis.PacePetsResetExhaustedArmMotion;
  if (!ARM_MOTION) {
    throw new Error(
      "Exhausted man arm motion must load before dashboard-reset-exhausted-figure.js.",
    );
  }

  function createFigure(documentRef, { sequenceDelayMs = 0 } = {}) {
    const figure = documentRef.createElement("span");
    figure.className = "reset-exhausted-figure";
    figure.setAttribute("aria-hidden", "true");
    figure.hidden = true;
    figure.style.setProperty(
      "--reset-exhausted-sequence-delay",
      `${sequenceDelayMs}ms`,
    );

    figure.append(createTrace(documentRef));
    return figure;
  }

  function createMessage(documentRef, { sequenceDelayMs = 0 } = {}) {
    const message = documentRef.createElement("span");
    message.className = "reset-exhausted-message";
    message.setAttribute("aria-hidden", "true");
    message.hidden = true;
    message.style.setProperty(
      "--reset-exhausted-sequence-delay",
      `${sequenceDelayMs}ms`,
    );

    const tired = documentRef.createElement("span");
    tired.className =
      "reset-exhausted-message-stage reset-exhausted-message-tired";
    tired.textContent = "Ti ..";

    const save = documentRef.createElement("span");
    save.className =
      "reset-exhausted-message-stage reset-exhausted-message-save";
    const saveText = documentRef.createElement("span");
    saveText.className = "reset-exhausted-message-save-text";
    saveText.textContent = "Save me";
    save.append(saveText);

    message.append(tired, save);
    return message;
  }

  function createTrace(documentRef) {
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

    svg.append(linework, head, createFaceExpressions(documentRef));
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
    const path = createTracePath(documentRef, ARM_MOTION.REST_PATH);
    path.classList.add("reset-exhausted-free-arm");
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

  globalThis.PacePetsResetExhaustedFigure = Object.freeze({
    createFigure,
    createMessage,
  });
})();

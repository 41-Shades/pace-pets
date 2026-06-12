(() => {
  "use strict";

  const App = globalThis.PacePetsDashboardApp;
  const ARM_MOTION = globalThis.PacePetsResetExhaustedArmMotion;
  const DATA = globalThis.PacePetsDashboardPaceData;
  const THEME_ASSETS = globalThis.CodexThemeAssets;
  if (!App || !ARM_MOTION || !DATA || !THEME_ASSETS) {
    throw new Error(
      "Pace Pets dashboard app core, arm motion, pace data, and theme assets must load before dashboard-reset-exhausted-methods.js.",
    );
  }

  const SPLAT_FALL_FINISH_MS = 1200;
  const SPLAT_EXHAUSTED_POST_FALL_DELAY_RANGE_MS = Object.freeze([
    20_000, 35_000,
  ]);
  const RESET_EXHAUSTED_ENTER_MS = 5000;
  const RESET_EXHAUSTED_SEQUENCE_MS = 17_660;

  function randomIntegerInRange([min, max]) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function createResetExhaustedFigure(
    documentRef,
    { sequenceDelayMs = 0 } = {},
  ) {
    const figure = documentRef.createElement("span");
    figure.className = "reset-exhausted-figure";
    figure.setAttribute("aria-hidden", "true");
    figure.hidden = true;
    figure.style.setProperty(
      "--reset-exhausted-sequence-delay",
      `${sequenceDelayMs}ms`,
    );

    const stage = createResetExhaustedTrace(documentRef);
    figure.append(stage);
    return figure;
  }

  function createResetExhaustedMessage(
    documentRef,
    { sequenceDelayMs = 0 } = {},
  ) {
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
    tired.textContent = "Ti..";

    const save = documentRef.createElement("span");
    save.className =
      "reset-exhausted-message-stage reset-exhausted-message-save";
    save.textContent = "Save me";

    message.append(tired, save);
    return message;
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

  Object.assign(App.prototype, {
    clearResetExhaustedSplatLaunch() {
      window.clearTimeout(this.resetExhaustedSplatLaunchTimer);
      this.resetExhaustedSplatLaunchTimer = null;
    },

    clearResetExhaustedSplatRepeat() {
      window.clearTimeout(this.resetExhaustedSplatRepeatTimer);
      this.resetExhaustedSplatRepeatTimer = null;
    },

    clearResetExhaustedSequenceStart() {
      window.clearTimeout(this.resetExhaustedSequenceStartTimer);
      this.resetExhaustedSequenceStartTimer = null;
      window.cancelAnimationFrame(this.resetExhaustedArmAnimationFrame);
      this.resetExhaustedArmAnimationFrame = null;
    },

    clearResetExhaustedSplatTimers() {
      this.clearResetExhaustedSplatLaunch();
      this.clearResetExhaustedSplatRepeat();
      this.clearResetExhaustedSequenceStart();
    },

    ensureResetExhaustedFigure({ sequenceDelayMs = 0 } = {}) {
      if (
        sequenceDelayMs === 0 &&
        this.resetExhaustedFigure?.isConnected &&
        this.resetExhaustedMessage?.isConnected
      ) {
        return this.resetExhaustedFigure;
      }

      const card = this.elements.resetCountdownCard;
      if (!card) {
        return null;
      }

      this.resetExhaustedFigure = createResetExhaustedFigure(
        card.ownerDocument,
        {
          sequenceDelayMs,
        },
      );
      this.resetExhaustedMessage = createResetExhaustedMessage(
        card.ownerDocument,
        { sequenceDelayMs },
      );
      card.append(this.resetExhaustedFigure, this.resetExhaustedMessage);
      return this.resetExhaustedFigure;
    },

    handlePaceStateChanged({ playSplatFall = false, previousState, state }) {
      if (state.key !== DATA.PACE_STATES.splat.key) {
        this.clearResetExhaustedSplatTimers();
        this.currentResetExhaustedSplatActive = false;
        this.renderResetExhaustedPreview();
        return;
      }

      const alreadyWaiting = this.resetExhaustedSplatLaunchTimer !== null;
      const alreadyActive = this.currentResetExhaustedSplatActive === true;
      const enteredSplat = previousState.key !== state.key;
      if (
        !enteredSplat &&
        !playSplatFall &&
        (alreadyWaiting || alreadyActive)
      ) {
        return;
      }

      this.scheduleResetExhaustedSplatLaunch({ playSplatFall });
    },

    isResetExhaustedSplatCurrent() {
      return this.elements.paceCard.classList.contains(
        DATA.PACE_STATES.splat.className,
      );
    },

    resetResetExhaustedElements() {
      this.clearResetExhaustedSequenceStart();
      this.resetExhaustedFigure?.remove();
      this.resetExhaustedMessage?.remove();
      this.resetExhaustedFigure = null;
      this.resetExhaustedMessage = null;
    },

    resetExhaustedElementsConnected() {
      return (
        this.resetExhaustedFigure?.isConnected === true &&
        this.resetExhaustedMessage?.isConnected === true
      );
    },

    resetExhaustedPreviewActive() {
      return (
        this.currentResetExhaustedPreview === true ||
        this.currentResetExhaustedSplatActive === true
      );
    },

    hideResetExhaustedPreview() {
      this.clearResetExhaustedSequenceStart();
      if (this.resetExhaustedFigure) {
        this.resetExhaustedFigure.hidden = true;
      }
      if (this.resetExhaustedMessage) {
        this.resetExhaustedMessage.hidden = true;
      }
    },

    renderResetExhaustedPreview({
      enter = false,
      restart = false,
      sequenceDelayMs = 0,
    } = {}) {
      const card = this.elements.resetCountdownCard;
      const active = this.resetExhaustedPreviewActive();
      if (!card) {
        return;
      }

      card.classList.toggle("has-reset-exhausted-preview", active);
      card.classList.toggle("is-reset-exhausted-entering", active && enter);
      if (!active) {
        this.hideResetExhaustedPreview();
        return;
      }

      this.showResetExhaustedPreview({ restart, sequenceDelayMs });
    },

    showResetExhaustedPreview({ restart = false, sequenceDelayMs = 0 } = {}) {
      const shouldStartSequence =
        restart || !this.resetExhaustedElementsConnected();
      if (restart) {
        this.resetResetExhaustedElements();
      }
      const figure = this.ensureResetExhaustedFigure({ sequenceDelayMs });
      if (!figure) {
        return;
      }

      figure.hidden = false;
      this.resetExhaustedMessage.hidden = false;
      if (shouldStartSequence) {
        this.startResetExhaustedArmSequence({ sequenceDelayMs });
      }
    },

    scheduleResetExhaustedSplatLaunch({ playSplatFall }) {
      this.clearResetExhaustedSplatTimers();
      this.currentResetExhaustedSplatActive = false;
      this.renderResetExhaustedPreview();

      const delay =
        (playSplatFall ? SPLAT_FALL_FINISH_MS : 0) +
        randomIntegerInRange(SPLAT_EXHAUSTED_POST_FALL_DELAY_RANGE_MS);
      this.resetExhaustedSplatLaunchTimer = window.setTimeout(() => {
        this.resetExhaustedSplatLaunchTimer = null;
        if (!this.isResetExhaustedSplatCurrent()) {
          return;
        }

        this.startResetExhaustedSplatSequence({ enter: true });
      }, delay);
    },

    scheduleResetExhaustedSplatRepeat({ sequenceDelayMs = 0 } = {}) {
      this.clearResetExhaustedSplatRepeat();

      const delay =
        sequenceDelayMs +
        RESET_EXHAUSTED_SEQUENCE_MS +
        randomIntegerInRange(SPLAT_EXHAUSTED_POST_FALL_DELAY_RANGE_MS);
      this.resetExhaustedSplatRepeatTimer = window.setTimeout(() => {
        this.resetExhaustedSplatRepeatTimer = null;
        if (
          this.currentResetExhaustedSplatActive !== true ||
          !this.isResetExhaustedSplatCurrent()
        ) {
          return;
        }

        this.startResetExhaustedSplatSequence();
      }, delay);
    },

    startResetExhaustedSplatSequence({ enter = false } = {}) {
      const sequenceDelayMs = enter ? RESET_EXHAUSTED_ENTER_MS : 0;
      this.currentResetExhaustedSplatActive = true;
      this.renderResetExhaustedPreview({
        enter,
        restart: true,
        sequenceDelayMs,
      });
      if (enter) {
        window.setTimeout(() => {
          this.elements.resetCountdownCard?.classList.remove(
            "is-reset-exhausted-entering",
          );
        }, RESET_EXHAUSTED_ENTER_MS);
      }
      this.scheduleResetExhaustedSplatRepeat({ sequenceDelayMs });
    },

    startResetExhaustedArmAnimation(armPath) {
      this.resetExhaustedArmAnimationFrame = window.requestAnimationFrame(
        (startedAt) => {
          const renderArmFrame = (now) => {
            const progress = Math.min(
              Math.max((now - startedAt) / ARM_MOTION.DURATION_MS, 0),
              1,
            );
            armPath.setAttribute("d", ARM_MOTION.pathAtProgress(progress));
            if (progress < 1) {
              this.resetExhaustedArmAnimationFrame =
                window.requestAnimationFrame(renderArmFrame);
              return;
            }

            this.resetExhaustedArmAnimationFrame = null;
          };

          renderArmFrame(startedAt);
        },
      );
    },

    startResetExhaustedArmSequence({ sequenceDelayMs = 0 } = {}) {
      this.clearResetExhaustedSequenceStart();
      this.resetExhaustedSequenceStartTimer = window.setTimeout(() => {
        this.resetExhaustedSequenceStartTimer = null;
        const armPath = this.resetExhaustedFigure?.querySelector(
          ".reset-exhausted-free-arm",
        );
        if (!armPath) {
          return;
        }

        armPath.setAttribute("d", ARM_MOTION.REST_PATH);
        this.startResetExhaustedArmAnimation(armPath);
      }, sequenceDelayMs);
    },
  });
})();

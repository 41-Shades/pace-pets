(() => {
  "use strict";

  const App = globalThis.PacePetsDashboardApp;
  const ARM_MOTION = globalThis.PacePetsResetExhaustedArmMotion;
  const DATA = globalThis.PacePetsDashboardPaceData;
  const FIGURE = globalThis.PacePetsResetExhaustedFigure;
  if (!App || !ARM_MOTION || !DATA || !FIGURE) {
    throw new Error(
      "Exhausted man dependencies must load before dashboard-reset-exhausted-methods.js.",
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

  Object.assign(App.prototype, {
    clearResetExhaustedSplatLaunch() {
      window.clearTimeout(this.resetExhaustedSplatLaunchTimer);
      this.resetExhaustedSplatLaunchTimer = null;
    },

    clearResetExhaustedSplatRepeat() {
      window.clearTimeout(this.resetExhaustedSplatRepeatTimer);
      this.resetExhaustedSplatRepeatTimer = null;
    },

    clearResetExhaustedPreviewRepeat() {
      window.clearTimeout(this.resetExhaustedPreviewRepeatTimer);
      this.resetExhaustedPreviewRepeatTimer = null;
    },

    clearResetExhaustedSequenceStart() {
      window.clearTimeout(this.resetExhaustedSequenceStartTimer);
      this.resetExhaustedSequenceStartTimer = null;
      window.cancelAnimationFrame(this.resetExhaustedArmAnimationFrame);
      this.resetExhaustedArmAnimationFrame = null;
    },

    clearResetExhaustedSplatTimers({
      preserveActivePreviewSequence = false,
    } = {}) {
      this.clearResetExhaustedSplatLaunch();
      this.clearResetExhaustedSplatRepeat();
      if (!preserveActivePreviewSequence) {
        this.clearResetExhaustedSequenceStart();
      }
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

      this.resetExhaustedFigure = FIGURE.createFigure(card.ownerDocument, {
        sequenceDelayMs,
      });
      this.resetExhaustedMessage = FIGURE.createMessage(card.ownerDocument, {
        sequenceDelayMs,
      });
      card.append(this.resetExhaustedFigure, this.resetExhaustedMessage);
      return this.resetExhaustedFigure;
    },

    handlePaceStateChanged({ playSplatFall = false, previousState, state }) {
      if (state.key !== DATA.PACE_STATES.splat.key) {
        this.clearResetExhaustedSplatTimers({
          preserveActivePreviewSequence:
            this.currentResetExhaustedPreview === true,
        });
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

    shouldStartResetExhaustedSequence({ elementsWereHidden, restart }) {
      return (
        restart || elementsWereHidden || !this.resetExhaustedElementsConnected()
      );
    },

    hideResetExhaustedPreview() {
      this.clearResetExhaustedSequenceStart();
      this.clearResetExhaustedPreviewRepeat();
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
      const active =
        this.resetExhaustedPreviewActive() && this.motionPreferenceEnabled();
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

    syncResetExhaustedPreviewRepeat({ sequenceDelayMs, shouldStartSequence }) {
      if (!this.resetExhaustedPreviewRepeatEligible()) {
        this.clearResetExhaustedPreviewRepeat();
        return;
      }

      if (
        shouldStartSequence ||
        this.resetExhaustedPreviewRepeatTimer === null
      ) {
        this.scheduleResetExhaustedPreviewRepeat({ sequenceDelayMs });
      }
    },

    showResetExhaustedPreview({ restart = false, sequenceDelayMs = 0 } = {}) {
      const elementsWereHidden =
        this.resetExhaustedFigure?.hidden === true ||
        this.resetExhaustedMessage?.hidden === true;
      const shouldStartSequence = this.shouldStartResetExhaustedSequence({
        elementsWereHidden,
        restart,
      });
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
      this.syncResetExhaustedPreviewRepeat({
        sequenceDelayMs,
        shouldStartSequence,
      });
    },

    resetExhaustedPreviewRepeatEligible() {
      return (
        this.currentResetExhaustedPreview === true &&
        !this.isResetExhaustedSplatCurrent()
      );
    },

    scheduleResetExhaustedPreviewRepeat({ sequenceDelayMs = 0 } = {}) {
      this.clearResetExhaustedPreviewRepeat();
      if (
        !this.resetExhaustedPreviewRepeatEligible() ||
        !this.motionPreferenceEnabled()
      ) {
        return;
      }

      const delay =
        sequenceDelayMs +
        RESET_EXHAUSTED_SEQUENCE_MS +
        randomIntegerInRange(SPLAT_EXHAUSTED_POST_FALL_DELAY_RANGE_MS);
      this.resetExhaustedPreviewRepeatTimer = window.setTimeout(() => {
        this.resetExhaustedPreviewRepeatTimer = null;
        if (
          !this.resetExhaustedPreviewRepeatEligible() ||
          !this.motionPreferenceEnabled()
        ) {
          return;
        }

        this.renderResetExhaustedPreview({ restart: true });
      }, delay);
    },

    scheduleResetExhaustedSplatLaunch({ playSplatFall }) {
      this.clearResetExhaustedSplatTimers();
      this.clearResetExhaustedPreviewRepeat();
      this.currentResetExhaustedSplatActive = false;
      this.renderResetExhaustedPreview();
      if (!this.motionPreferenceEnabled()) {
        return;
      }

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
      if (!this.motionPreferenceEnabled()) {
        return;
      }

      this.clearResetExhaustedPreviewRepeat();
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
      if (!this.motionPreferenceEnabled()) {
        armPath.setAttribute("d", ARM_MOTION.REST_PATH);
        return;
      }

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

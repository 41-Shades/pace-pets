(() => {
  "use strict";

  const CHECKERBOARD_REVEAL = globalThis.PacePetsDashboardCheckerboardReveal;
  const CHECKERBOARD_REVEAL_PREVIEW =
    globalThis.PacePetsCheckerboardRevealPreviewControl;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!CHECKERBOARD_REVEAL || !CHECKERBOARD_REVEAL_PREVIEW || !Controller) {
    throw new Error(
      "Checkerboard reveal, preview control, and pace core must load before dashboard-checkerboard-reveal-methods.js.",
    );
  }

  function currentTransparentSquares(controller) {
    return controller.getCurrentCheckerboardRevealWhiteTransparent?.()
      ? CHECKERBOARD_REVEAL.TRANSPARENT_SQUARE_VALUES.white
      : CHECKERBOARD_REVEAL.TRANSPARENT_SQUARE_VALUES.black;
  }

  Object.assign(Controller.prototype, {
    stopCheckerboardRevealPreview() {
      this.checkerboardRevealScene?.stop();
      this.checkerboardRevealScene = null;
    },

    playCheckerboardRevealPreview() {
      if (document.hidden) {
        return false;
      }

      this.stopCheckerboardRevealPreview();
      const scene = CHECKERBOARD_REVEAL.create({
        motionDisabled: this.motionPreferenceEnabled?.() === false,
        transparentSquares: currentTransparentSquares(this),
      });
      this.checkerboardRevealScene = scene;
      scene
        .play()
        .then((completed) => {
          if (this.checkerboardRevealScene === scene) {
            this.checkerboardRevealScene = null;
          }
          return completed;
        })
        .catch((error) => {
          console.warn("Pace Pets checkerboard reveal preview failed:", error);
          if (this.checkerboardRevealScene === scene) {
            this.checkerboardRevealScene = null;
          }
        });
      return true;
    },

    bindCheckerboardRevealPreviewRequests() {
      if (
        this.checkerboardRevealPreviewRequestsBound ||
        !globalThis.chrome?.runtime?.onMessage
      ) {
        return;
      }

      this.checkerboardRevealPreviewRequestsBound = true;
      globalThis.chrome.runtime.onMessage.addListener(
        (message, _sender, sendResponse) => {
          if (!CHECKERBOARD_REVEAL_PREVIEW.isPlayMessage(message)) {
            return false;
          }

          sendResponse?.({ ok: this.playCheckerboardRevealPreview() });
          return false;
        },
      );
    },
  });
})();

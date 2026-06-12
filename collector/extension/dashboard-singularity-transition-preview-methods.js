(() => {
  "use strict";

  const App = globalThis.PacePetsDashboardApp;
  const DATA = globalThis.PacePetsDashboardPaceData;
  const PREVIEW = globalThis.PacePetsSingularityTransitionPreviewControl;
  if (!App || !DATA || !PREVIEW) {
    throw new Error("Singularity transition preview dependencies missing.");
  }

  const ENTRY_EXIT_CLASS = "is-singularity-entry-exit";
  const ENTRY_EXIT_DURATION_MS = 2000;
  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  const SINGULARITY_STATE = DATA.PACE_STATES.singularity;

  function prefersReducedMotion() {
    return window.matchMedia?.(REDUCED_MOTION_QUERY).matches === true;
  }

  Object.assign(App.prototype, {
    clearSingularityTransitionEntryPreview() {
      globalThis.clearTimeout(this.singularityTransitionEntryPreviewTimer);
      this.singularityTransitionEntryPreviewTimer = null;
      document.body.classList.remove(ENTRY_EXIT_CLASS);
    },
    async forceSingularityTransitionPreviewState() {
      const options = await this.readDeveloperOptions();
      const storageItems = this.DEVELOPER_OPTIONS.developerOptionsStorageItems({
        ...options,
        forcedPaceStateKey: SINGULARITY_STATE.key,
      });
      await this.EXTENSION_STORAGE.setLocal(storageItems);
    },
    scheduleSingularityTransitionPreviewState() {
      const delayMs = prefersReducedMotion() ? 0 : ENTRY_EXIT_DURATION_MS;
      this.singularityTransitionEntryPreviewTimer = globalThis.setTimeout(
        async () => {
          this.singularityTransitionEntryPreviewTimer = null;
          try {
            await this.forceSingularityTransitionPreviewState();
          } catch (error) {
            console.warn("Pace Pets Singularity entry preview failed:", error);
            this.clearSingularityTransitionEntryPreview();
          }
        },
        delayMs,
      );
    },
    async previewSingularityTransitionEntry() {
      if (
        this.elements.paceCard.classList.contains(SINGULARITY_STATE.className)
      ) {
        return {
          message: "Choose a prior state before previewing.",
          ok: false,
        };
      }
      if (document.hidden) {
        this.singularityTransitionEntryPreviewPending = true;
        return { ok: true, queued: true };
      }
      this.clearSingularityTransitionEntryPreview();
      document.body.classList.add(ENTRY_EXIT_CLASS);
      this.scheduleSingularityTransitionPreviewState();
      return { ok: true };
    },
    playPendingSingularityTransitionEntryPreview() {
      if (document.hidden || !this.singularityTransitionEntryPreviewPending) {
        return false;
      }
      this.singularityTransitionEntryPreviewPending = false;
      this.previewSingularityTransitionEntry().catch((error) => {
        console.warn("Pace Pets Singularity entry preview failed:", error);
      });
      return true;
    },
    bindSingularityTransitionPreviewRequests() {
      if (
        this.singularityTransitionPreviewRequestsBound ||
        !globalThis.chrome?.runtime?.onMessage
      ) {
        return;
      }
      this.singularityTransitionPreviewRequestsBound = true;
      document.addEventListener("visibilitychange", () => {
        this.playPendingSingularityTransitionEntryPreview();
      });
      globalThis.chrome.runtime.onMessage.addListener(
        (message, _sender, sendResponse) => {
          if (!PREVIEW.isLaunchMessage(message)) {
            return false;
          }
          this.previewSingularityTransitionEntry()
            .then((response) => sendResponse?.(response))
            .catch((error) => {
              sendResponse?.({
                message: error.message || "Could not preview Singularity.",
                ok: false,
              });
            });
          return true;
        },
      );
    },
  });
})();

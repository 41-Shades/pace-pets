(() => {
  "use strict";

  class DashboardStateLoader {
    constructor({ applyState, readState }) {
      this.applyState = applyState;
      this.readState = readState;
      this.loadGeneration = 0;
      this.loadingGeneration = null;
    }

    async load(options) {
      this.invalidate();
      const loadGeneration = this.loadGeneration;
      this.loadingGeneration = loadGeneration;
      try {
        const state = await this.readState(options);
        if (loadGeneration !== this.loadGeneration) {
          return false;
        }

        this.applyState(state);
        return true;
      } catch (error) {
        if (loadGeneration !== this.loadGeneration) {
          return false;
        }
        throw error;
      } finally {
        if (this.loadingGeneration === loadGeneration) {
          this.loadingGeneration = null;
        }
      }
    }

    invalidate() {
      this.loadGeneration += 1;
      this.loadingGeneration = null;
    }

    isLoading() {
      return this.loadingGeneration === this.loadGeneration;
    }
  }

  function createController(options) {
    const loader = new DashboardStateLoader(options);
    return Object.freeze({
      invalidate: loader.invalidate.bind(loader),
      isLoading: loader.isLoading.bind(loader),
      load: loader.load.bind(loader),
    });
  }

  globalThis.PacePetsDashboardStateLoader = Object.freeze({
    createController,
  });
})();

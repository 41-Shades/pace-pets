(function attachCodexExtensionStorage(root) {
  "use strict";

  const LOCAL_AREA = "local";
  const LOCAL_STORAGE_LOCK_NAME = "pace-pets-local-storage";
  const LOCAL_STORAGE_LOCK_REQUIRED_MESSAGE =
    "Web Locks are required for extension storage mutations.";
  let fallbackLocalStorageOperation = Promise.resolve();

  function lastChromeError() {
    const error = chrome.runtime.lastError;
    return error ? new Error(error.message) : null;
  }

  function callbackWithLastError(invoke) {
    return new Promise((resolve, reject) => {
      invoke((result) => {
        const error = lastChromeError();
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      });
    });
  }

  function getLocal(keys) {
    return callbackWithLastError((done) => {
      chrome.storage.local.get(keys, done);
    });
  }

  function setLocal(items) {
    return callbackWithLastError((done) => {
      chrome.storage.local.set(items, done);
    });
  }

  function removeLocal(keys) {
    return callbackWithLastError((done) => {
      chrome.storage.local.remove(keys, done);
    });
  }

  function isLocalArea(areaName) {
    return areaName === LOCAL_AREA;
  }

  function hasChange(changes, key) {
    return Object.hasOwn(changes, key);
  }

  function hasAnyChange(changes, keys) {
    return keys.some((key) => hasChange(changes, key));
  }

  function runFallbackLocalStorageOperation(operation) {
    const result = fallbackLocalStorageOperation.then(operation, operation);
    fallbackLocalStorageOperation = result.catch(() => {});
    return result;
  }

  function runExclusiveLocalStorageOperation(operation) {
    if (typeof operation !== "function") {
      return Promise.reject(
        new TypeError("Local storage operation must be a function."),
      );
    }

    const lockManager = root.navigator?.locks;
    if (typeof lockManager?.request === "function") {
      return lockManager.request(LOCAL_STORAGE_LOCK_NAME, operation);
    }

    if (chrome.runtime?.id) {
      return Promise.reject(new Error(LOCAL_STORAGE_LOCK_REQUIRED_MESSAGE));
    }

    return runFallbackLocalStorageOperation(operation);
  }

  root.CodexExtensionStorage = Object.freeze({
    LOCAL_AREA,
    LOCAL_STORAGE_LOCK_NAME,
    LOCAL_STORAGE_LOCK_REQUIRED_MESSAGE,
    callbackWithLastError,
    getLocal,
    hasAnyChange,
    hasChange,
    isLocalArea,
    removeLocal,
    runExclusiveLocalStorageOperation,
    setLocal,
  });
})(globalThis);

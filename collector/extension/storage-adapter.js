(function attachCodexExtensionStorage(root) {
  "use strict";

  const LOCAL_AREA = "local";

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

  function isLocalArea(areaName) {
    return areaName === LOCAL_AREA;
  }

  function hasChange(changes, key) {
    return Object.hasOwn(changes, key);
  }

  function hasAnyChange(changes, keys) {
    return keys.some((key) => hasChange(changes, key));
  }

  root.CodexExtensionStorage = Object.freeze({
    LOCAL_AREA,
    callbackWithLastError,
    getLocal,
    hasAnyChange,
    hasChange,
    isLocalArea,
    setLocal,
  });
})(globalThis);

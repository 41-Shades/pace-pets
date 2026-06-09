(function attachCodexUsageProviders(root) {
  "use strict";

  const INTEGRATION_CONFIG = root.CodexIntegrationConfig;
  if (!INTEGRATION_CONFIG) {
    throw new Error(
      "Codex integration config must load before usage-providers.js.",
    );
  }
  const USAGE_INTEGRATION_ADAPTERS = root.CodexUsageIntegrationAdapters;
  if (!USAGE_INTEGRATION_ADAPTERS) {
    throw new Error(
      "Codex usage integration adapters must load before usage-providers.js.",
    );
  }

  const CHATGPT_WHAM_PROVIDER_KEY = "chatgptWham";
  const ACCESS_TOKEN_PATHS = Object.freeze([
    Object.freeze(["accessToken"]),
    Object.freeze(["access_token"]),
    Object.freeze(["session", "accessToken"]),
    Object.freeze(["session", "access_token"]),
    Object.freeze(["token"]),
  ]);
  const AUTH_FAILURE_STATUS_CODES = Object.freeze([401, 403]);

  function freezeArray(values) {
    return Object.freeze([...values]);
  }

  function usageProvider(provider) {
    const adapter = USAGE_INTEGRATION_ADAPTERS.adapterForKey(
      provider.adapterKey,
    );
    if (!adapter) {
      throw new Error(`Unknown usage adapter: ${provider.adapterKey}`);
    }

    return Object.freeze({
      ...provider,
      adapter,
      authFailureStatusCodes: freezeArray(provider.authFailureStatusCodes),
      authSessionUrls: freezeArray(provider.authSessionUrls),
      retryWithFreshTokenStatusCodes: freezeArray(
        provider.retryWithFreshTokenStatusCodes,
      ),
      sourceMarkers: provider.sourceMarkers,
    });
  }

  const CHATGPT_WHAM_PROVIDER = usageProvider({
    adapterKey: USAGE_INTEGRATION_ADAPTERS.CHATGPT_WHAM_ADAPTER_KEY,
    authFailureStatusCodes: AUTH_FAILURE_STATUS_CODES,
    authSessionUrls: INTEGRATION_CONFIG.AUTH_SESSION_URLS,
    hostPermission: INTEGRATION_CONFIG.CHATGPT_HOST_PERMISSION,
    key: CHATGPT_WHAM_PROVIDER_KEY,
    origin: INTEGRATION_CONFIG.CHATGPT_ORIGIN,
    retryWithFreshTokenStatusCodes: AUTH_FAILURE_STATUS_CODES,
    sourceMarkers: INTEGRATION_CONFIG.SOURCE_MARKERS,
    usageEndpoint: INTEGRATION_CONFIG.CHATGPT_USAGE_ENDPOINT,
  });
  const PROVIDERS = Object.freeze({
    [CHATGPT_WHAM_PROVIDER.key]: CHATGPT_WHAM_PROVIDER,
  });

  function providerForKey(providerKey) {
    return PROVIDERS[providerKey] || null;
  }

  function valueAtPath(data, path) {
    return path.reduce((value, key) => value?.[key], data);
  }

  function extractAccessToken(data) {
    return (
      ACCESS_TOKEN_PATHS.map((path) => valueAtPath(data, path)).find(Boolean) ||
      null
    );
  }

  async function extractAccessTokenFromSessionResponse(response) {
    if (!response?.ok) {
      return null;
    }

    try {
      return extractAccessToken(await response.json());
    } catch {
      return null;
    }
  }

  function usageHeaders(provider, accessToken, uiLanguage = "en-US") {
    return {
      Accept: "application/json",
      "oai-language": uiLanguage || "en-US",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  }

  function includesStatus(statusCodes, status) {
    return statusCodes.includes(Number(status));
  }

  function shouldRetryUsageResponse(provider, status, accessToken) {
    return (
      includesStatus(provider.retryWithFreshTokenStatusCodes, status) &&
      Boolean(accessToken)
    );
  }

  function isAuthFailureStatus(provider, status) {
    return includesStatus(provider.authFailureStatusCodes, status);
  }

  function usageFailureMessage(provider, status, accessToken) {
    return accessToken
      ? `ChatGPT usage endpoint returned ${status} with session token.`
      : `Could not read ChatGPT session token; usage endpoint returned ${status}.`;
  }

  root.CodexUsageProviders = Object.freeze({
    ACCESS_TOKEN_PATHS,
    CHATGPT_WHAM_PROVIDER,
    CHATGPT_WHAM_PROVIDER_KEY,
    DEFAULT_USAGE_PROVIDER: CHATGPT_WHAM_PROVIDER,
    PROVIDERS,
    extractAccessToken,
    extractAccessTokenFromSessionResponse,
    isAuthFailureStatus,
    providerForKey,
    shouldRetryUsageResponse,
    usageFailureMessage,
    usageHeaders,
  });
})(globalThis);

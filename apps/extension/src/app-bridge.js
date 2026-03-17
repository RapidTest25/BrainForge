const PAGE_SOURCE = 'brainforge-web';
const EXTENSION_SOURCE = 'brainforge-extension';

function getSafeVersion() {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return 'unknown';
  }
}

function isRuntimeAvailable() {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

function safeStorageGet(keys, onSuccess) {
  if (!isRuntimeAvailable()) return;

  try {
    chrome.storage.sync.get(keys, (settings) => {
      if (chrome.runtime.lastError || !isRuntimeAvailable()) {
        return;
      }

      onSuccess(settings || {});
    });
  } catch {
    // Ignore: this can happen when extension context is reloaded.
  }
}

function safeStorageSet(values, onSuccess) {
  if (!isRuntimeAvailable()) return;

  try {
    chrome.storage.sync.set(values, () => {
      if (chrome.runtime.lastError || !isRuntimeAvailable()) {
        return;
      }

      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    });
  } catch {
    // Ignore: this can happen when extension context is reloaded.
  }
}

function isSupportedBrainForgeHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'brainforge.app' ||
    hostname.endsWith('.brainforge.app') ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

if (isSupportedBrainForgeHost(window.location.hostname)) {
  function getConnectionPayload(settings) {
    return {
      installed: true,
      version: getSafeVersion(),
      hasAuthToken: !!settings.authToken,
      hasTeamId: !!settings.teamId,
      userId: settings.user?.id || null,
      email: settings.user?.email || null,
      teamId: settings.teamId || null,
      appUrl: settings.appUrl || null,
      apiUrl: settings.apiUrl || null,
    };
  }

  function postToPage(message) {
    window.postMessage(
      {
        source: EXTENSION_SOURCE,
        target: PAGE_SOURCE,
        ...message,
      },
      '*',
    );
  }

  if (isRuntimeAvailable()) {
    document.documentElement.dataset.brainforgeExtensionInstalled = 'true';
    document.documentElement.dataset.brainforgeExtensionVersion = getSafeVersion();
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    const data = event.data;
    if (!data || data.source !== PAGE_SOURCE || data.target !== EXTENSION_SOURCE) return;

    if (!isRuntimeAvailable()) return;

    if (data.type === 'BRAINFORGE_EXTENSION_PING') {
      safeStorageGet(['authToken', 'teamId', 'user', 'appUrl', 'apiUrl'], (settings) => {
        postToPage({
          type: 'BRAINFORGE_EXTENSION_PONG',
          requestId: data.requestId,
          payload: getConnectionPayload(settings),
        });
      });
    }

    if (data.type === 'BRAINFORGE_EXTENSION_CONNECT') {
      const payload = data.payload || {};
      const nextSettings = {
        ...(payload.authToken ? { authToken: payload.authToken } : {}),
        ...(payload.refreshToken ? { refreshToken: payload.refreshToken } : {}),
        ...(payload.teamId ? { teamId: payload.teamId } : {}),
        ...(payload.user ? { user: payload.user } : {}),
        ...(payload.appUrl ? { appUrl: payload.appUrl } : {}),
        ...(payload.apiUrl ? { apiUrl: payload.apiUrl } : {}),
        syncedAt: new Date().toISOString(),
      };

      safeStorageSet(nextSettings, () => {
        safeStorageGet(['authToken', 'teamId', 'user', 'appUrl', 'apiUrl'], (settings) => {
          postToPage({
            type: 'BRAINFORGE_EXTENSION_CONNECTED',
            requestId: data.requestId,
            payload: getConnectionPayload(settings),
          });
        });
      });
    }
  });
}

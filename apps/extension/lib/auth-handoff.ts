export const extensionMessageType = "human-layer-extension-token";

export type ExtensionTokenMessage = {
  type: typeof extensionMessageType;
  token: string;
  expiresAt: string;
};

export type TokenStorage = {
  setToken(token: string, expiresAt: string): Promise<void>;
};

export function attachAuthHandoffListener(params: {
  appOrigin: string;
  storage: TokenStorage;
  onTokenStored?(): void;
}) {
  const handler = async (event: MessageEvent<ExtensionTokenMessage>) => {
    if (event.origin !== params.appOrigin) return;
    if (event.data?.type !== extensionMessageType) return;

    await params.storage.setToken(event.data.token, event.data.expiresAt);
    params.onTokenStored?.();
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

export function createChromeTokenStorage(): TokenStorage {
  return {
    async setToken(token, expiresAt) {
      await chrome.storage.local.set({
        authToken: token,
        authTokenExpiresAt: expiresAt
      });
    }
  };
}

export async function getStoredAuthToken(): Promise<string | null> {
  const payload = await chrome.storage.local.get(["authToken", "authTokenExpiresAt"]);
  if (!payload.authToken || !payload.authTokenExpiresAt) return null;

  if (Date.now() >= new Date(payload.authTokenExpiresAt).getTime()) {
    await chrome.storage.local.remove(["authToken", "authTokenExpiresAt"]);
    return null;
  }

  return payload.authToken as string;
}

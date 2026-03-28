export const apiProxyMessageType = "human-layer-api-proxy";

export type ApiProxyRequest = {
  type: typeof apiProxyMessageType;
  appUrl: string;
  path: string;
  method?: "GET" | "POST";
  authToken?: string | null;
  body?: Record<string, unknown>;
};

export type ApiProxyResponse<T = unknown> = {
  ok: boolean;
  status: number;
  json: T | { error?: string; requestId?: string } | null;
  error?: string;
};

export function buildApiUrl(appUrl: string, path: string): string {
  return new URL(path, appUrl).toString();
}

export async function sendApiProxyRequest<T>(
  request: Omit<ApiProxyRequest, "type">
): Promise<ApiProxyResponse<T>> {
  const response = (await chrome.runtime.sendMessage({
    ...request,
    type: apiProxyMessageType
  })) as ApiProxyResponse<T> | undefined;

  if (!response) {
    return {
      ok: false,
      status: 0,
      json: null,
      error: "extension proxy did not respond"
    };
  }

  return response;
}

export async function parseJsonResponse(response: Response): Promise<unknown | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

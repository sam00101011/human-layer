import { apiProxyMessageType, buildApiUrl, parseJsonResponse, type ApiProxyRequest } from "../lib/api";

async function handleApiProxyRequest(message: ApiProxyRequest) {
  const headers = new Headers();

  if (message.authToken) {
    headers.set("authorization", `Bearer ${message.authToken}`);
  }

  if (message.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(buildApiUrl(message.appUrl, message.path), {
    method: message.method ?? "GET",
    headers,
    body: message.body === undefined ? undefined : JSON.stringify(message.body)
  });

  return {
    ok: response.ok,
    status: response.status,
    json: await parseJsonResponse(response)
  };
}

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== apiProxyMessageType) {
      return undefined;
    }

    void handleApiProxyRequest(message as ApiProxyRequest)
      .then(sendResponse)
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          status: 0,
          json: null,
          error: error instanceof Error ? error.message : "proxy request failed"
        });
      });

    return true;
  });

  console.info("Human Layer background ready");
});

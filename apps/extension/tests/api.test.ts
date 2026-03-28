import { describe, expect, it, vi } from "vitest";

import { buildApiUrl, sendApiProxyRequest } from "../lib/api";

describe("extension api proxy", () => {
  it("builds absolute API URLs safely", () => {
    expect(buildApiUrl("http://127.0.0.1:3000", "/api/pages/lookup?url=a")).toBe(
      "http://127.0.0.1:3000/api/pages/lookup?url=a"
    );
  });

  it("sends proxy requests through the background worker", async () => {
    const sendMessage = vi.fn(async () => ({ ok: true, status: 200, json: { supported: true } }));
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage
      }
    });

    const response = await sendApiProxyRequest({
      appUrl: "http://127.0.0.1:3000",
      path: "/api/pages/lookup?url=test",
      authToken: "token"
    });

    expect(sendMessage).toHaveBeenCalledWith({
      type: "human-layer-api-proxy",
      appUrl: "http://127.0.0.1:3000",
      path: "/api/pages/lookup?url=test",
      authToken: "token"
    });
    expect(response.ok).toBe(true);
    expect(response.json).toEqual({ supported: true });

    vi.unstubAllGlobals();
  });
});

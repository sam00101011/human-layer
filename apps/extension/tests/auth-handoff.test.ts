import { describe, expect, it, vi } from "vitest";

import { attachAuthHandoffListener, extensionMessageType } from "../lib/auth-handoff";

describe("attachAuthHandoffListener", () => {
  it("stores a token received from the web app", async () => {
    const setToken = vi.fn(async () => undefined);
    const cleanup = attachAuthHandoffListener({
      appOrigin: "http://127.0.0.1:3000",
      storage: { setToken }
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://127.0.0.1:3000",
        data: {
          type: extensionMessageType,
          token: "signed-token",
          expiresAt: "2026-03-28T00:00:00.000Z"
        }
      })
    );

    await Promise.resolve();

    expect(setToken).toHaveBeenCalledWith("signed-token", "2026-03-28T00:00:00.000Z");
    cleanup();
  });
});

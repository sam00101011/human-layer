import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createWorldIdRequestConfig: vi.fn(),
  getWorldIdClientConfig: vi.fn()
}));

vi.mock("../../../../lib/world-id", async () => {
  const actual = await vi.importActual<typeof import("../../../../lib/world-id")>(
    "../../../../lib/world-id"
  );

  return {
    ...actual,
    createWorldIdRequestConfig: mocks.createWorldIdRequestConfig,
    getWorldIdClientConfig: mocks.getWorldIdClientConfig
  };
});

import { GET } from "./route";

describe("GET /api/auth/world-id/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects request-context lookups outside remote mode", async () => {
    mocks.getWorldIdClientConfig.mockReturnValue({
      mode: "mock"
    });

    const response = await GET();

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "World ID request context is only available in remote mode"
    });
  });

  it("returns the signed request config in remote mode", async () => {
    mocks.getWorldIdClientConfig.mockReturnValue({
      mode: "remote"
    });
    mocks.createWorldIdRequestConfig.mockReturnValue({
      appId: "app_live_human_layer",
      action: "human-layer-v1",
      signal: "human-layer-v1",
      environment: "production",
      allowLegacyProofs: true,
      rpContext: {
        rp_id: "rp_live_human_layer",
        nonce: "0x1234",
        created_at: 1,
        expires_at: 2,
        signature: "0xabcd"
      }
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      appId: "app_live_human_layer",
      action: "human-layer-v1",
      signal: "human-layer-v1",
      environment: "production",
      allowLegacyProofs: true,
      rpContext: {
        rp_id: "rp_live_human_layer",
        nonce: "0x1234",
        created_at: 1,
        expires_at: 2,
        signature: "0xabcd"
      }
    });
  });
});

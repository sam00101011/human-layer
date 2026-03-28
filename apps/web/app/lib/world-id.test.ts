import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  WorldIdVerificationError,
  createWorldIdRequestConfig,
  getWorldIdClientConfig,
  verifyWorldIdSubmission
} from "./world-id";

describe("world id config", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it("defaults to mock mode with human layer app settings", () => {
    delete process.env.WORLD_ID_MODE;
    delete process.env.NEXT_PUBLIC_WORLD_ID_APP_ID;
    delete process.env.WORLD_ID_APP_ID;

    expect(getWorldIdClientConfig()).toEqual({
      mode: "mock",
      appId: "app_staging_human_layer",
      action: "human-layer-v1",
      signal: "human-layer-v1",
      environment: "staging"
    });
  });

  it("creates deterministic mock nullifiers from the same mock human key", async () => {
    process.env.WORLD_ID_MODE = "mock";

    const first = await verifyWorldIdSubmission({
      mockHumanKey: "same-human"
    });
    const second = await verifyWorldIdSubmission({
      mockHumanKey: "same-human"
    });

    expect(first.nullifierHash).toBe(second.nullifierHash);
    expect(first.verificationLevel).toBe("orb");
  });

  it("rejects missing mock human keys", async () => {
    process.env.WORLD_ID_MODE = "mock";

    await expect(verifyWorldIdSubmission({})).rejects.toBeInstanceOf(WorldIdVerificationError);
  });

  it("rejects a placeholder verify URL in remote mode", async () => {
    process.env.WORLD_ID_MODE = "remote";
    process.env.WORLD_ID_APP_ID = "app_live_human_layer";
    process.env.WORLD_ID_ACTION = "human-layer-v1";
    process.env.WORLD_ID_SIGNAL = "human-layer-v1";
    process.env.WORLD_ID_VERIFY_URL = "<fill-from-world-id-dashboard>";

    await expect(
      verifyWorldIdSubmission({
        proof: "proof",
        merkleRoot: "root",
        nullifierHash: "nullifier"
      })
    ).rejects.toMatchObject({
      name: "WorldIdVerificationError",
      message: "WORLD_ID_VERIFY_URL is not configured",
      status: 500
    });
  });

  it("creates a signed remote request context when live env vars are configured", () => {
    process.env.WORLD_ID_MODE = "remote";
    process.env.WORLD_ID_APP_ID = "app_live_human_layer";
    process.env.WORLD_ID_ACTION = "human-layer-v1";
    process.env.WORLD_ID_SIGNAL = "human-layer-v1";
    process.env.WORLD_ID_RP_ID = "rp_live_human_layer";
    process.env.WORLD_ID_RP_PRIVATE_KEY =
      "59c6995e998f97a5a0044976f6c9f7f6f8286f9ac2f1a9b0b1f4cb0c5b4c3b2a";

    const requestConfig = createWorldIdRequestConfig(300);

    expect(requestConfig.appId).toBe("app_live_human_layer");
    expect(requestConfig.allowLegacyProofs).toBe(true);
    expect(requestConfig.rpContext.rp_id).toBe("rp_live_human_layer");
    expect(requestConfig.rpContext.signature).toMatch(/^0x/);
    expect(requestConfig.rpContext.nonce).toMatch(/^0x/);
    expect(requestConfig.environment).toBe("production");
  });

  it("verifies signed request results against the RP verify endpoint", async () => {
    process.env.WORLD_ID_MODE = "remote";
    process.env.WORLD_ID_APP_ID = "app_live_human_layer";
    process.env.WORLD_ID_ACTION = "human-layer-v1";
    process.env.WORLD_ID_SIGNAL = "human-layer-v1";
    process.env.WORLD_ID_RP_ID = "rp_live_human_layer";
    process.env.WORLD_ID_VERIFY_URL = "https://developer.world.org/api/v2/verify/app_live_human_layer";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await verifyWorldIdSubmission({
      result: {
        protocol_version: "3.0",
        nonce: "nonce-1",
        action: "human-layer-v1",
        responses: [
          {
            identifier: "proof_of_human",
            proof: "proof-1",
            merkle_root: "root-1",
            nullifier: "nullifier-1",
            signal_hash: "signal-hash-1"
          }
        ],
        environment: "production"
      },
      verificationLevel: "orb"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://developer.world.org/api/v4/verify/rp_live_human_layer");
    expect(JSON.parse(String(init?.body))).toEqual({
      protocol_version: "3.0",
      nonce: "nonce-1",
      action: "human-layer-v1",
      responses: [
        {
          identifier: "proof_of_human",
          proof: "proof-1",
          merkle_root: "root-1",
          nullifier: "nullifier-1",
          signal_hash: "signal-hash-1"
        }
      ],
      environment: "production"
    });
    expect(result).toEqual({
      nullifierHash: "nullifier-1",
      verificationLevel: "orb",
      signal: "human-layer-v1"
    });
  });

  it("sends signal_hash to the legacy verification endpoint", async () => {
    process.env.WORLD_ID_MODE = "remote";
    process.env.WORLD_ID_APP_ID = "app_live_human_layer";
    process.env.WORLD_ID_ACTION = "human-layer-v1";
    process.env.WORLD_ID_SIGNAL = "human-layer-v1";
    process.env.WORLD_ID_VERIFY_URL = "https://developer.world.org/api/v2/verify/app_live_human_layer";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    global.fetch = fetchMock as typeof fetch;

    await verifyWorldIdSubmission({
      proof: "proof-1",
      merkleRoot: "root-1",
      nullifierHash: "nullifier-1",
      signalHash: "signal-hash-1",
      verificationLevel: "orb"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init?.body))).toEqual({
      action: "human-layer-v1",
      proof: "proof-1",
      merkle_root: "root-1",
      nullifier_hash: "nullifier-1",
      signal_hash: "signal-hash-1",
      verification_level: "orb"
    });
  });
});

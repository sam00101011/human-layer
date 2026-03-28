import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  WorldIdVerificationError,
  createWorldIdRequestConfig,
  getWorldIdClientConfig,
  verifyWorldIdSubmission
} from "./world-id";

describe("world id config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
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
});

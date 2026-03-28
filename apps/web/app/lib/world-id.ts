import { createHash } from "node:crypto";
import type { RpContext } from "@worldcoin/idkit";
import { signRequest } from "@worldcoin/idkit/signing";

export type WorldIdMode = "mock" | "remote";

export type WorldIdClientConfig = {
  mode: WorldIdMode;
  appId: string;
  action: string;
  signal: string;
  environment: "production" | "staging";
};

export type WorldIdRequestConfig = {
  appId: string;
  action: string;
  signal: string;
  environment: "production" | "staging";
  allowLegacyProofs: boolean;
  rpContext: RpContext;
};

export type WorldIdVerificationInput = {
  mockHumanKey?: string;
  proof?: string;
  merkleRoot?: string;
  nullifierHash?: string;
  verificationLevel?: "orb" | "device";
  signal?: string | null;
};

export type VerifiedWorldIdResult = {
  nullifierHash: string;
  verificationLevel: "orb" | "device";
  signal: string | null;
};

export class WorldIdVerificationError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "WorldIdVerificationError";
  }
}

function getConfiguredVerifyUrl(): string {
  const verifyUrl = process.env.WORLD_ID_VERIFY_URL?.trim();

  if (!verifyUrl || verifyUrl === "<fill-from-world-id-dashboard>") {
    throw new WorldIdVerificationError("WORLD_ID_VERIFY_URL is not configured", 500);
  }

  try {
    return new URL(verifyUrl).toString();
  } catch {
    throw new WorldIdVerificationError("WORLD_ID_VERIFY_URL is invalid", 500);
  }
}

function inferEnvironment(appId: string): "production" | "staging" {
  return appId.includes("staging") ? "staging" : "production";
}

export function getWorldIdClientConfig(): WorldIdClientConfig {
  const appId =
    process.env.NEXT_PUBLIC_WORLD_ID_APP_ID ??
    process.env.WORLD_ID_APP_ID ??
    "app_staging_human_layer";

  return {
    mode: process.env.WORLD_ID_MODE === "remote" ? "remote" : "mock",
    appId,
    action: process.env.NEXT_PUBLIC_WORLD_ID_ACTION ?? process.env.WORLD_ID_ACTION ?? "human-layer-v1",
    signal: process.env.NEXT_PUBLIC_WORLD_ID_SIGNAL ?? process.env.WORLD_ID_SIGNAL ?? "human-layer-v1",
    environment:
      process.env.WORLD_ID_ENVIRONMENT === "production" ||
      process.env.WORLD_ID_ENVIRONMENT === "staging"
        ? process.env.WORLD_ID_ENVIRONMENT
        : inferEnvironment(appId)
  };
}

function hashMockHumanKey(mockHumanKey: string): string {
  return createHash("sha256").update(`human-layer-mock:${mockHumanKey.trim()}`).digest("hex");
}

export function createWorldIdRequestConfig(ttlSeconds = 300): WorldIdRequestConfig {
  const config = getWorldIdClientConfig();

  if (config.mode !== "remote") {
    throw new WorldIdVerificationError("World ID request config is only available in remote mode");
  }

  const rpId = process.env.WORLD_ID_RP_ID;
  const signingKey = process.env.WORLD_ID_RP_PRIVATE_KEY;

  if (!rpId || !signingKey) {
    throw new WorldIdVerificationError(
      "WORLD_ID_RP_ID and WORLD_ID_RP_PRIVATE_KEY are required for the live IDKit widget",
      500
    );
  }

  const signature = signRequest(config.action, signingKey, ttlSeconds);

  return {
    appId: config.appId,
    action: config.action,
    signal: config.signal,
    environment: config.environment,
    allowLegacyProofs: true,
    rpContext: {
      rp_id: rpId,
      nonce: signature.nonce,
      created_at: signature.createdAt,
      expires_at: signature.expiresAt,
      signature: signature.sig
    }
  };
}

export async function verifyWorldIdSubmission(
  input: WorldIdVerificationInput
): Promise<VerifiedWorldIdResult> {
  const config = getWorldIdClientConfig();
  const verificationLevel = input.verificationLevel === "device" ? "device" : "orb";
  const signal = input.signal ?? config.signal;

  if (config.mode === "mock") {
    if (!input.mockHumanKey?.trim()) {
      throw new WorldIdVerificationError("mock human key is required");
    }

    return {
      nullifierHash: hashMockHumanKey(input.mockHumanKey),
      verificationLevel,
      signal
    };
  }

  if (!input.nullifierHash || !input.proof || !input.merkleRoot) {
    throw new WorldIdVerificationError("missing World ID proof payload");
  }

  const verifyUrl = getConfiguredVerifyUrl();

  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      app_id: config.appId,
      action: config.action,
      signal,
      proof: input.proof,
      merkle_root: input.merkleRoot,
      nullifier_hash: input.nullifierHash,
      verification_level: verificationLevel
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; detail?: string | null }
    | null;

  if (!response.ok || payload?.success === false) {
    throw new WorldIdVerificationError(payload?.detail ?? "World ID verification failed");
  }

  return {
    nullifierHash: input.nullifierHash,
    verificationLevel,
    signal
  };
}

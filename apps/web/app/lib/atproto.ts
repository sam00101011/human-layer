import type { AtprotoIdentityStatus } from "@human-layer/core";
import type { AtprotoAccountSnapshot } from "@human-layer/db";

type ProvisionManagedAtprotoIdentityResult = {
  did: string;
  handle: string;
  status: Extract<AtprotoIdentityStatus, "provisioned" | "live">;
  pdsUrl: string;
  publicPostingEnabled?: boolean;
  metadata?: Record<string, unknown>;
};

type ProvisionManagedAtprotoIdentityParams = {
  profileId: string;
  profileHandle: string;
  reservedHandle: string;
  reservedDid: string;
  currentStatus: AtprotoIdentityStatus;
};

function getManagedPdsUrl() {
  return process.env.ATPROTO_MANAGED_PDS_URL ?? "https://humanlayer.social";
}

async function provisionViaWebhook(
  params: ProvisionManagedAtprotoIdentityParams
): Promise<ProvisionManagedAtprotoIdentityResult | null> {
  const webhookUrl = process.env.ATPROTO_PROVISIONING_WEBHOOK_URL;
  if (!webhookUrl) {
    return null;
  }

  const token = process.env.ATPROTO_PROVISIONING_WEBHOOK_TOKEN;
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(params),
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "AT Protocol provisioning failed");
  }

  return (await response.json()) as ProvisionManagedAtprotoIdentityResult;
}

export async function provisionManagedAtprotoIdentity(
  params: ProvisionManagedAtprotoIdentityParams
): Promise<ProvisionManagedAtprotoIdentityResult> {
  const webhookResult = await provisionViaWebhook(params);
  if (webhookResult) {
    return webhookResult;
  }

  return {
    did: params.reservedDid,
    handle: params.reservedHandle,
    status: "provisioned",
    pdsUrl: getManagedPdsUrl(),
    publicPostingEnabled: false,
    metadata: {
      domain: "humanlayer.social",
      provisioningMode: "local_managed_service",
      previousStatus: params.currentStatus
    }
  };
}

export function canProvisionAtprotoIdentity(identity: AtprotoAccountSnapshot | null): boolean {
  if (!identity) return false;
  return identity.status === "reserved" || identity.status === "errored";
}

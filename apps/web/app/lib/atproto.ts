import { createHmac } from "node:crypto";

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

type DescribeServerResponse = {
  did: string;
  availableUserDomains: string[];
  inviteCodeRequired?: boolean;
  phoneVerificationRequired?: boolean;
};

type CreateAccountResponse = {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
  didDoc?: unknown;
};

type CreateSessionResponse = {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
  didDoc?: unknown;
  active?: boolean;
  status?: "takendown" | "suspended" | "deactivated";
};

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

function getManagedPdsUrl() {
  return normalizeBaseUrl(process.env.ATPROTO_MANAGED_PDS_URL ?? "https://humanlayer.social");
}

function getDirectProvisioningSecret() {
  return process.env.ATPROTO_ACCOUNT_PASSWORD_SECRET ?? null;
}

function isDirectPdsProvisioningEnabled() {
  return Boolean(process.env.ATPROTO_MANAGED_PDS_URL && getDirectProvisioningSecret());
}

function deriveManagedAccountPassword(profileId: string) {
  const secret = getDirectProvisioningSecret();
  if (!secret) {
    throw new Error("AT Protocol direct provisioning is missing ATPROTO_ACCOUNT_PASSWORD_SECRET.");
  }

  const digest = createHmac("sha256", secret)
    .update(`human-layer-atproto:${profileId}`)
    .digest("base64url");

  return `hl_${digest.slice(0, 44)}A9!`;
}

function buildManagedAccountEmail(profileHandle: string, profileId: string) {
  const domain = process.env.ATPROTO_MANAGED_EMAIL_DOMAIN?.trim();
  if (!domain) return null;

  const localPart = `${profileHandle.replace(/[^a-z0-9._+-]/gi, "_")}+${profileId.slice(0, 8)}`;
  return `${localPart}@${domain}`;
}

function supportsHandleDomain(handle: string, availableUserDomains: string[]) {
  return availableUserDomains.some((domain) => handle === domain || handle.endsWith(`.${domain}`));
}

async function readJsonSafely(response: Response) {
  return (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
}

function buildAtprotoErrorMessage(fallback: string, payload: Record<string, unknown> | null) {
  const error = typeof payload?.error === "string" ? payload.error : null;
  const message = typeof payload?.message === "string" ? payload.message : null;
  return [error, message].filter(Boolean).join(": ") || fallback;
}

async function describeManagedPds(): Promise<DescribeServerResponse> {
  const response = await fetch(`${getManagedPdsUrl()}/xrpc/com.atproto.server.describeServer`, {
    headers: {
      accept: "application/json"
    },
    cache: "no-store"
  }).catch(() => null);

  if (!response) {
    throw new Error("Could not reach the configured AT Protocol PDS.");
  }

  const payload = await readJsonSafely(response);
  if (!response.ok || !payload) {
    throw new Error(buildAtprotoErrorMessage("Could not describe the AT Protocol PDS.", payload));
  }

  return payload as unknown as DescribeServerResponse;
}

async function createManagedPdsAccount(params: {
  reservedHandle: string;
  profileId: string;
  profileHandle: string;
}): Promise<CreateAccountResponse | CreateSessionResponse> {
  const password = deriveManagedAccountPassword(params.profileId);
  const email = buildManagedAccountEmail(params.profileHandle, params.profileId);
  const inviteCode = process.env.ATPROTO_PDS_INVITE_CODE?.trim() || undefined;

  const createResponse = await fetch(`${getManagedPdsUrl()}/xrpc/com.atproto.server.createAccount`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({
      handle: params.reservedHandle,
      password,
      ...(email ? { email } : {}),
      ...(inviteCode ? { inviteCode } : {})
    }),
    cache: "no-store"
  }).catch(() => null);

  if (!createResponse) {
    throw new Error("Could not reach the AT Protocol account creation endpoint.");
  }

  const createPayload = await readJsonSafely(createResponse);
  if (createResponse.ok && createPayload) {
    return createPayload as unknown as CreateAccountResponse;
  }

  if (createPayload?.error !== "HandleNotAvailable") {
    throw new Error(
      buildAtprotoErrorMessage("AT Protocol account creation failed.", createPayload)
    );
  }

  const sessionResponse = await fetch(`${getManagedPdsUrl()}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({
      identifier: params.reservedHandle,
      password
    }),
    cache: "no-store"
  }).catch(() => null);

  if (!sessionResponse) {
    throw new Error("The AT Protocol account already exists, but Human Layer could not recover the managed session.");
  }

  const sessionPayload = await readJsonSafely(sessionResponse);
  if (!sessionResponse.ok || !sessionPayload) {
    throw new Error(
      buildAtprotoErrorMessage("The AT Protocol account already exists, but the managed session could not be restored.", sessionPayload)
    );
  }

  return sessionPayload as unknown as CreateSessionResponse;
}

async function provisionViaManagedPds(
  params: ProvisionManagedAtprotoIdentityParams
): Promise<ProvisionManagedAtprotoIdentityResult> {
  const server = await describeManagedPds();

  if (!supportsHandleDomain(params.reservedHandle, server.availableUserDomains)) {
    throw new Error(
      `The configured AT Protocol PDS does not support ${params.reservedHandle}. Available domains: ${server.availableUserDomains.join(", ")}.`
    );
  }

  if (server.inviteCodeRequired && !process.env.ATPROTO_PDS_INVITE_CODE?.trim()) {
    throw new Error("The configured AT Protocol PDS requires an invite code. Set ATPROTO_PDS_INVITE_CODE first.");
  }

  const account = await createManagedPdsAccount({
    reservedHandle: params.reservedHandle,
    profileId: params.profileId,
    profileHandle: params.profileHandle
  });

  if ("active" in account && account.active === false) {
    throw new Error(
      `The managed AT Protocol account exists, but it is not active${account.status ? ` (${account.status})` : ""}.`
    );
  }

  return {
    did: account.did,
    handle: account.handle,
    status: "provisioned",
    pdsUrl: getManagedPdsUrl(),
    publicPostingEnabled: false,
    metadata: {
      domain: params.reservedHandle.split(".").slice(1).join("."),
      provisioningMode: "direct_pds",
      previousStatus: params.currentStatus,
      serverDid: server.did,
      availableUserDomains: server.availableUserDomains,
      reusedExistingAccount: "active" in account
    }
  };
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

  if (isDirectPdsProvisioningEnabled()) {
    return provisionViaManagedPds(params);
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

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  createSessionForProfile,
  getOrCreateDevProfile,
  getProfileById,
  getSessionProfileByRawToken
} from "@human-layer/db";
import type { NextRequest } from "next/server";

import { extensionMessageType } from "./auth-shared";

const sessionCookieName = "hl_session";

export type AuthenticatedProfile = {
  id: string;
  handle: string;
};

export type ApiViewer = {
  profileId: string;
  handle: string;
};

export function getSessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: false,
    maxAge: 60 * 60 * 24 * 7
  };
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getRequiredSecret(name: "SESSION_SECRET" | "EXTENSION_TOKEN_SECRET"): string {
  return process.env[name] ?? `missing-${name.toLowerCase()}`;
}

export async function issueDevSession() {
  const profile = await getOrCreateDevProfile();
  const rawToken = await createSessionForProfile(profile.id);

  return {
    profile,
    rawToken
  };
}

export async function getSessionProfileFromRequest(request: NextRequest) {
  const rawToken = request.cookies.get(sessionCookieName)?.value;
  if (!rawToken) return null;
  return getSessionProfileByRawToken(rawToken);
}

type ExtensionTokenPayload = {
  profileId: string;
  handle: string;
  expiresAt: string;
};

export function verifySignedExtensionToken(rawToken: string): ExtensionTokenPayload | null {
  const [encodedPayload, signature] = rawToken.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload, getRequiredSecret("EXTENSION_TOKEN_SECRET"));
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  let payload: ExtensionTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as ExtensionTokenPayload;
  } catch {
    return null;
  }

  if (!payload.profileId || !payload.handle || !payload.expiresAt) {
    return null;
  }

  if (Date.now() >= new Date(payload.expiresAt).getTime()) {
    return null;
  }

  return payload;
}

export async function getAuthenticatedProfileFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (bearerToken) {
    const payload = verifySignedExtensionToken(bearerToken);
    if (!payload) return null;

    const profile = await getProfileById(payload.profileId);
    if (!profile || profile.handle !== payload.handle) return null;

    return profile;
  }

  return getSessionProfileFromRequest(request);
}

export function toViewer(profile: AuthenticatedProfile | null | undefined): ApiViewer | null {
  if (!profile) return null;

  return {
    profileId: profile.id,
    handle: profile.handle
  };
}

export function getSessionCookieName(): string {
  return sessionCookieName;
}

export function createSignedExtensionToken(params: {
  profileId: string;
  handle: string;
  ttlSeconds?: number;
}) {
  const expiresAt = new Date(Date.now() + 1000 * (params.ttlSeconds ?? 600)).toISOString();
  const payload = {
    profileId: params.profileId,
    handle: params.handle,
    expiresAt
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, getRequiredSecret("EXTENSION_TOKEN_SECRET"));

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt
  };
}

export { extensionMessageType };

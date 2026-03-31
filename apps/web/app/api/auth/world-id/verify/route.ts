import { INTEREST_TAGS, MAX_PROFILE_INTERESTS, type InterestTag } from "@human-layer/core";
import type { IDKitResult } from "@worldcoin/idkit";
import {
  HandleTakenError,
  createSessionForProfile,
  ensureManagedAtprotoIdentityForProfile,
  upsertVerifiedProfile
} from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import {
  createSignedWorldIdFinalizeToken,
  getSessionCookieName,
  getSessionCookieOptions
} from "../../../../lib/auth";
import { captureAnalyticsEvent } from "../../../../lib/analytics";
import {
  WorldIdVerificationError,
  verifyWorldIdSubmission
} from "../../../../lib/world-id";
import { captureSentryOperationalEvent } from "../../../../lib/sentry";

const handlePattern = /^[a-z0-9_]{3,24}$/;

type VerifyBody = {
  handle?: string;
  interestTags?: string[];
  handoff?: boolean;
  returnUrl?: string;
  mockHumanKey?: string;
  worldIdResult?: IDKitResult | null;
  proof?: string;
  merkleRoot?: string;
  nullifierHash?: string;
  signalHash?: string | null;
  verificationLevel?: "orb" | "device";
  signal?: string | null;
};

function serializeVerifyError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }

  return {
    message: String(error)
  };
}

function normalizeInterestTags(value: unknown): InterestTag[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(value)]
    .filter((tag): tag is InterestTag => typeof tag === "string" && INTEREST_TAGS.includes(tag as InterestTag))
    .slice(0, MAX_PROFILE_INTERESTS);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as VerifyBody | null;
  const handle = body?.handle?.trim().toLowerCase();
  const interestTags = normalizeInterestTags(body?.interestTags);

  if (!handle || !handlePattern.test(handle)) {
    return NextResponse.json(
      {
        error: "handle must be 3-24 characters using lowercase letters, numbers, or underscores"
      },
      { status: 400 }
    );
  }

  if (interestTags.length === 0) {
    return NextResponse.json(
      { error: "choose at least one interest tag" },
      { status: 400 }
    );
  }

  try {
    const verification = await verifyWorldIdSubmission({
      mockHumanKey: body?.mockHumanKey,
      result: body?.worldIdResult,
      proof: body?.proof,
      merkleRoot: body?.merkleRoot,
      nullifierHash: body?.nullifierHash,
      signalHash: body?.signalHash,
      verificationLevel: body?.verificationLevel,
      signal: body?.signal
    });

    const { created, profile } = await upsertVerifiedProfile({
      nullifierHash: verification.nullifierHash,
      handle,
      interestTags,
      verificationLevel: verification.verificationLevel,
      signal: verification.signal
    });
    const atproto = await ensureManagedAtprotoIdentityForProfile({
      profileId: profile.id,
      handle: profile.handle
    });

    const rawToken = await createSessionForProfile(profile.id);
    const redirectTo = body?.handoff
      ? `/auth/extension-handoff?returnUrl=${encodeURIComponent(body.returnUrl ?? "")}`
      : `/install-extension?source=verify&next=${encodeURIComponent(
          `/profiles/${profile.handle}`
        )}`;
    const finalizeToken = createSignedWorldIdFinalizeToken({
      profileId: profile.id,
      redirectTo
    });
    const finalizeUrl = `/api/auth/world-id/finalize?token=${encodeURIComponent(finalizeToken)}`;

    const response = NextResponse.json({
      ok: true,
      created,
      redirectTo,
      finalizeUrl,
      profile: {
        id: profile.id,
        handle: profile.handle,
        interestTags: profile.interestTags,
        verifiedHuman: true,
        atproto
      }
    });

    void captureAnalyticsEvent({
      event: "verify_succeeded",
      distinctId: profile.id,
      properties: {
        created,
        source: body?.handoff ? "extension_handoff" : "web_app",
        verificationLevel: verification.verificationLevel,
        interestTagCount: interestTags.length
      }
    });

    response.cookies.set(getSessionCookieName(), rawToken, getSessionCookieOptions());
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    const requestId = crypto.randomUUID();
    const extra = {
      route: request.nextUrl.pathname,
      method: request.method,
      requestId,
      handle,
      handoff: body?.handoff ?? false,
      verificationLevel: body?.verificationLevel ?? null,
      protocolVersion: body?.worldIdResult?.protocol_version ?? null,
      hasProof: Boolean(body?.proof),
      hasMerkleRoot: Boolean(body?.merkleRoot),
      hasNullifierHash: Boolean(body?.nullifierHash),
      hasSignalHash: Boolean(body?.signalHash),
      hasWorldIdResult: Boolean(body?.worldIdResult),
      error: serializeVerifyError(error)
    };

    await captureSentryOperationalEvent({
      event: "world_id_verify_failed",
      extra
    });

    console.error(
      JSON.stringify({
        event: "world_id_verify_failed",
        ...extra
      })
    );

    if (error instanceof HandleTakenError) {
      return NextResponse.json({ error: error.message, requestId }, { status: 409 });
    }

    if (error instanceof WorldIdVerificationError) {
      return NextResponse.json({ error: error.message, requestId }, { status: error.status });
    }

    return NextResponse.json({ error: "verification failed", requestId }, { status: 500 });
  }
}

import { INTEREST_TAGS, MAX_PROFILE_INTERESTS, type InterestTag } from "@human-layer/core";
import {
  HandleTakenError,
  createSessionForProfile,
  upsertVerifiedProfile
} from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import {
  getSessionCookieName,
  getSessionCookieOptions
} from "../../../../lib/auth";
import {
  WorldIdVerificationError,
  verifyWorldIdSubmission
} from "../../../../lib/world-id";

const handlePattern = /^[a-z0-9_]{3,24}$/;

type VerifyBody = {
  handle?: string;
  interestTags?: string[];
  handoff?: boolean;
  returnUrl?: string;
  mockHumanKey?: string;
  proof?: string;
  merkleRoot?: string;
  nullifierHash?: string;
  signalHash?: string | null;
  verificationLevel?: "orb" | "device";
  signal?: string | null;
};

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

    const rawToken = await createSessionForProfile(profile.id);
    const redirectTo = body?.handoff
      ? `/auth/extension-handoff?returnUrl=${encodeURIComponent(body.returnUrl ?? "")}`
      : `/profiles/${encodeURIComponent(profile.handle)}`;

    const response = NextResponse.json({
      ok: true,
      created,
      redirectTo,
      profile: {
        id: profile.id,
        handle: profile.handle,
        interestTags: profile.interestTags,
        verifiedHuman: true
      }
    });

    response.cookies.set(getSessionCookieName(), rawToken, getSessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof HandleTakenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof WorldIdVerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "verification failed" }, { status: 500 });
  }
}

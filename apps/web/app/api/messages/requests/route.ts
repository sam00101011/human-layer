import { createProfileMessageRequest } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../lib/auth";
import { assertProfileCanParticipate } from "../../../lib/safety";

function toErrorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    throw error;
  }

  if (error.message === "account restricted") {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error.message === "profile not found") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error.message === "cannot message yourself" || error.message === "verified humans only") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (
    error.message === "recipient unavailable" ||
    error.message === "messaging unavailable between these profiles" ||
    error.message === "link your XMTP inbox first" ||
    error.message === "recipient has not linked XMTP yet" ||
    error.message === "message channel already open" ||
    error.message === "this person has already sent you a request"
  ) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  throw error;
}

export async function POST(request: NextRequest) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const restriction = await assertProfileCanParticipate(viewer.id);
  if (restriction) {
    return NextResponse.json({ error: restriction }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        recipientProfileId?: string;
        pageId?: string | null;
      }
    | null;

  const recipientProfileId = body?.recipientProfileId?.trim();
  if (!recipientProfileId) {
    return NextResponse.json({ error: "recipientProfileId is required" }, { status: 400 });
  }

  try {
    const requestRecord = await createProfileMessageRequest({
      senderProfileId: viewer.id,
      recipientProfileId,
      pageId: body?.pageId ?? null
    });

    return NextResponse.json({
      ok: true,
      request: requestRecord
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

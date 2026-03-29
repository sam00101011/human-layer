import { linkXmtpBindingToProfile } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../lib/auth";
import { assertProfileCanParticipate } from "../../../lib/safety";

export async function POST(request: NextRequest) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const restriction = await assertProfileCanParticipate(viewer.id);
  if (restriction) {
    return NextResponse.json({ error: restriction }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { inboxId?: string } | null;
  const inboxId = body?.inboxId?.trim();

  if (!inboxId || inboxId.length < 6) {
    return NextResponse.json({ error: "valid inboxId is required" }, { status: 400 });
  }

  try {
    const binding = await linkXmtpBindingToProfile({
      profileId: viewer.id,
      inboxId
    });

    return NextResponse.json({
      ok: true,
      binding
    });
  } catch (error) {
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) {
      return NextResponse.json({ error: "inbox id already linked to another profile" }, { status: 409 });
    }

    throw error;
  }
}

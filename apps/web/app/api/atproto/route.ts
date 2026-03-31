import {
  getAtprotoAccountSnapshot,
  updateAtprotoAccountSettings
} from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../lib/auth";
import { assertProfileCanParticipate } from "../../lib/safety";

export async function GET(request: NextRequest) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const restriction = await assertProfileCanParticipate(viewer.id);
  if (restriction) {
    return NextResponse.json({ error: restriction }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    identity: await getAtprotoAccountSnapshot(viewer.id)
  });
}

export async function PATCH(request: NextRequest) {
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
        publicPostingEnabled?: boolean;
      }
    | null;

  try {
    const identity = await updateAtprotoAccountSettings({
      profileId: viewer.id,
      publicPostingEnabled: Boolean(body?.publicPostingEnabled)
    });

    return NextResponse.json({
      ok: true,
      identity
    });
  } catch (error) {
    if (error instanceof Error && error.message === "atproto account not linked") {
      return NextResponse.json({ error: "finish identity setup first" }, { status: 409 });
    }

    throw error;
  }
}

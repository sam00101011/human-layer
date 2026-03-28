import { followProfile, getProfileById } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../../lib/auth";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ profileId: string }> }
) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const { profileId } = await context.params;
  if (profileId === viewer.id) {
    return NextResponse.json({ error: "cannot follow yourself" }, { status: 400 });
  }

  const targetProfile = await getProfileById(profileId);
  if (!targetProfile) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  await followProfile({
    followerProfileId: viewer.id,
    followeeProfileId: profileId
  });

  return NextResponse.json({ ok: true });
}

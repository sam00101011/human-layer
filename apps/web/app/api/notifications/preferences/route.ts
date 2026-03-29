import { updateNotificationPreferences } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../lib/auth";

export async function POST(request: NextRequest) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        bookmarkedPageComments?: boolean;
        followedProfileTakes?: boolean;
        followedTopicTakes?: boolean;
      }
    | null;

  if (
    typeof body?.bookmarkedPageComments !== "boolean" ||
    typeof body?.followedProfileTakes !== "boolean" ||
    typeof body?.followedTopicTakes !== "boolean"
  ) {
    return NextResponse.json(
      { error: "bookmarkedPageComments, followedProfileTakes, and followedTopicTakes are required" },
      { status: 400 }
    );
  }

  const preferences = await updateNotificationPreferences({
    profileId: viewer.id,
    bookmarkedPageComments: body.bookmarkedPageComments,
    followedProfileTakes: body.followedProfileTakes,
    followedTopicTakes: body.followedTopicTakes
  });

  return NextResponse.json({
    ok: true,
    preferences
  });
}

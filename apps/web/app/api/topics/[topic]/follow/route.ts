import { INTEREST_TAGS, type InterestTag } from "@human-layer/core";
import { followTopicForProfile } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../../lib/auth";

function isInterestTag(value: string): value is InterestTag {
  return INTEREST_TAGS.includes(value as InterestTag);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ topic: string }> }
) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const { topic } = await context.params;
  if (!isInterestTag(topic)) {
    return NextResponse.json({ error: "topic not found" }, { status: 404 });
  }

  await followTopicForProfile({
    profileId: viewer.id,
    topic
  });

  return NextResponse.json({ ok: true });
}

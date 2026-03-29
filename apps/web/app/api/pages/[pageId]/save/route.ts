import { findPageById, savePageForProfile } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../../lib/auth";
import { captureAnalyticsEvent } from "../../../../lib/analytics";
import { assertProfileCanParticipate } from "../../../../lib/safety";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ pageId: string }> }
) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const restriction = await assertProfileCanParticipate(viewer.id);
  if (restriction) {
    return NextResponse.json({ error: restriction }, { status: 403 });
  }

  const { pageId } = await context.params;
  const page = await findPageById(pageId);
  if (!page) {
    return NextResponse.json({ error: "page not found" }, { status: 404 });
  }

  await savePageForProfile({
    pageId,
    profileId: viewer.id
  });

  void captureAnalyticsEvent({
    event: "page_saved",
    distinctId: viewer.id,
    properties: {
      pageId,
      pageKind: page.pageKind,
      host: page.host
    }
  });

  return NextResponse.json({ ok: true });
}

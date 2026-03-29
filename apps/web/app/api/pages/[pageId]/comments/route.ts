import { createCommentForPage, findPageById, getPageThreadSnapshot } from "@human-layer/db";
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

  const body = (await request.json().catch(() => null)) as { body?: string } | null;
  const commentBody = body?.body?.trim();
  if (!commentBody) {
    return NextResponse.json({ error: "comment body is required" }, { status: 400 });
  }

  await createCommentForPage({
    pageId,
    profileId: viewer.id,
    body: commentBody
  });

  void captureAnalyticsEvent({
    event: "comment_posted",
    distinctId: viewer.id,
    properties: {
      pageId,
      pageKind: page.pageKind,
      host: page.host,
      bodyLength: commentBody.length
    }
  });

  return NextResponse.json({
    ok: true,
    thread: await getPageThreadSnapshot(pageId, viewer.id)
  });
}

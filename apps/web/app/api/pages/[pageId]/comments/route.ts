import { createCommentForPage, findPageById, getPageThreadSnapshot } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../../lib/auth";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ pageId: string }> }
) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
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

  return NextResponse.json({
    ok: true,
    thread: await getPageThreadSnapshot(pageId)
  });
}

import { findCommentById, markCommentHelpful } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../../lib/auth";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const { commentId } = await context.params;
  const comment = await findCommentById(commentId);

  if (!comment) {
    return NextResponse.json({ error: "comment not found" }, { status: 404 });
  }

  if (comment.hidden) {
    return NextResponse.json({ error: "cannot vote on a hidden comment" }, { status: 400 });
  }

  if (comment.profileId === viewer.id) {
    return NextResponse.json({ error: "cannot vote on your own comment" }, { status: 400 });
  }

  const result = await markCommentHelpful({
    commentId,
    profileId: viewer.id
  });

  return NextResponse.json({
    ok: true,
    created: result.created,
    helpfulCount: result.helpfulCount
  });
}

import { createCommentReport, findCommentById } from "@human-layer/db";
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

  if (comment.profileId === viewer.id) {
    return NextResponse.json({ error: "cannot report your own comment" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { reasonCode?: string; details?: string }
    | null;

  await createCommentReport({
    commentId,
    reporterProfileId: viewer.id,
    reasonCode: body?.reasonCode?.trim() || "needs_review",
    details: body?.details?.trim() || null
  });

  return NextResponse.json({ ok: true });
}

import { createCommentReport, findCommentById } from "@human-layer/db";
import { isCommentReportReasonCode } from "@human-layer/core";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../../lib/auth";
import { assertProfileCanParticipate } from "../../../../lib/safety";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const restriction = await assertProfileCanParticipate(viewer.id);
  if (restriction) {
    return NextResponse.json({ error: restriction }, { status: 403 });
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
  const reasonCode = body?.reasonCode?.trim() || "other";
  if (!isCommentReportReasonCode(reasonCode)) {
    return NextResponse.json({ error: "invalid report reason" }, { status: 400 });
  }

  await createCommentReport({
    commentId,
    reporterProfileId: viewer.id,
    reasonCode,
    details: body?.details?.trim() || null
  });

  return NextResponse.json({ ok: true });
}

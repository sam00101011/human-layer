import { findCommentById, reviewCommentReports } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest, isAdminProfile } from "../../../../../lib/auth";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  if (!isAdminProfile(viewer)) {
    return NextResponse.json({ error: "admin access required" }, { status: 403 });
  }

  const { commentId } = await context.params;
  const comment = await findCommentById(commentId);
  if (!comment) {
    return NextResponse.json({ error: "comment not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: "hide" | "dismiss" | "restore"; reasonCode?: string | null }
    | null;
  const action = body?.action;

  if (action !== "hide" && action !== "dismiss" && action !== "restore") {
    return NextResponse.json({ error: "invalid moderation action" }, { status: 400 });
  }

  await reviewCommentReports({
    commentId,
    adminProfileId: viewer.id,
    action,
    reasonCode: body?.reasonCode ?? null
  });

  return NextResponse.json({ ok: true });
}

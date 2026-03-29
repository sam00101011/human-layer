import { VERDICTS, type Verdict } from "@human-layer/core";
import { findPageById, getPageThreadSnapshot, upsertVerdictForPage } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../../lib/auth";
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

  const body = (await request.json().catch(() => null)) as { verdict?: string } | null;
  if (!body?.verdict || !VERDICTS.includes(body.verdict as Verdict)) {
    return NextResponse.json({ error: "invalid verdict" }, { status: 400 });
  }

  await upsertVerdictForPage({
    pageId,
    profileId: viewer.id,
    verdict: body.verdict as Verdict
  });

  return NextResponse.json({
    ok: true,
    thread: await getPageThreadSnapshot(pageId, viewer.id)
  });
}

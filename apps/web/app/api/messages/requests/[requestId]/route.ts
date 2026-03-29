import { respondToMessageRequest } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../../lib/auth";
import { assertProfileCanParticipate } from "../../../../lib/safety";

function toErrorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    throw error;
  }

  if (error.message === "account restricted" || error.message === "not allowed") {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error.message === "message request not found") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  throw error;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const restriction = await assertProfileCanParticipate(viewer.id);
  if (restriction) {
    return NextResponse.json({ error: restriction }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (body?.action !== "accept" && body?.action !== "ignore") {
    return NextResponse.json({ error: "valid action is required" }, { status: 400 });
  }

  try {
    const { requestId } = await context.params;
    await respondToMessageRequest({
      profileId: viewer.id,
      requestId,
      action: body.action
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

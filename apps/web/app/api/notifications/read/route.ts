import { markAllNotificationsRead, markNotificationsRead } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../lib/auth";

type ReadBody = {
  markAll?: boolean;
  commentIds?: string[];
};

export async function POST(request: NextRequest) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ReadBody | null;

  const count =
    Array.isArray(body?.commentIds) && body?.commentIds.length > 0
      ? await markNotificationsRead({
          profileId: viewer.id,
          commentIds: body.commentIds.filter((value): value is string => typeof value === "string")
        })
      : await markAllNotificationsRead(viewer.id);

  return NextResponse.json({
    ok: true,
    count
  });
}

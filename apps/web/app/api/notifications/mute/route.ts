import { mutePageForProfile, muteProfileForProfile } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../lib/auth";

export async function POST(request: NextRequest) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { pageId?: string; mutedProfileId?: string }
    | null;

  const pageId = body?.pageId?.trim();
  const mutedProfileId = body?.mutedProfileId?.trim();

  if (!pageId && !mutedProfileId) {
    return NextResponse.json(
      { error: "pageId or mutedProfileId is required" },
      { status: 400 }
    );
  }

  if (mutedProfileId && mutedProfileId === viewer.id) {
    return NextResponse.json({ error: "cannot mute yourself" }, { status: 400 });
  }

  if (pageId) {
    await mutePageForProfile({
      pageId,
      profileId: viewer.id
    });
  }

  if (mutedProfileId) {
    await muteProfileForProfile({
      mutedProfileId,
      profileId: viewer.id
    });
  }

  return NextResponse.json({ ok: true });
}

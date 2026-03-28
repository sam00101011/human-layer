import { NextRequest, NextResponse } from "next/server";

import { createSignedExtensionToken, getSessionProfileFromRequest } from "../../../lib/auth";

export async function POST(request: NextRequest) {
  const profile = await getSessionProfileFromRequest(request);

  if (!profile) {
    return NextResponse.json({ error: "missing session" }, { status: 401 });
  }

  const token = createSignedExtensionToken({
    profileId: profile.id,
    handle: profile.handle
  });

  return NextResponse.json(token);
}

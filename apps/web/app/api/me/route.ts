import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest, toViewer } from "../../lib/auth";

export async function GET(request: NextRequest) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  return NextResponse.json({ viewer: toViewer(viewer) });
}

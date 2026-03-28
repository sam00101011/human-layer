import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, getSessionCookieOptions, issueDevSession } from "../../../lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    handoff?: boolean;
    returnUrl?: string;
  };

  const { rawToken } = await issueDevSession();
  const response = NextResponse.json({
    ok: true,
    redirectTo: body.handoff
      ? `/auth/extension-handoff?returnUrl=${encodeURIComponent(body.returnUrl ?? "")}`
      : "/"
  });

  response.cookies.set(getSessionCookieName(), rawToken, getSessionCookieOptions());

  return response;
}

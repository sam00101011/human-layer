import { createSessionForProfile } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import {
  getSessionCookieName,
  getSessionCookieOptions,
  verifySignedWorldIdFinalizeToken
} from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const payload = token ? verifySignedWorldIdFinalizeToken(token) : null;

  if (!payload) {
    const errorUrl = new URL("/verify", request.url);
    errorUrl.searchParams.set("error", "session-finalize");
    return NextResponse.redirect(errorUrl, { status: 302 });
  }

  const rawToken = await createSessionForProfile(payload.profileId);
  const redirectUrl = new URL(payload.redirectTo, request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 302 });
  response.cookies.set(getSessionCookieName(), rawToken, getSessionCookieOptions());
  response.headers.set("cache-control", "no-store");
  return response;
}

import { hasProfileSavedPage } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest, toViewer } from "../../../lib/auth";
import { lookupPageByUrl } from "../../../lib/page-lookup";
import { captureSentryOperationalEvent } from "../../../lib/sentry";

function serializeLookupError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }

  return {
    message: String(error)
  };
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const lookup = await lookupPageByUrl(rawUrl);
    const viewer = await getAuthenticatedProfileFromRequest(request);

    return NextResponse.json({
      ...lookup,
      savedByViewer:
        viewer && lookup.page ? await hasProfileSavedPage({ pageId: lookup.page.id, profileId: viewer.id }) : false,
      viewer: toViewer(viewer)
    });
  } catch (error) {
    const requestId = crypto.randomUUID();
    const extra = {
      route: request.nextUrl.pathname,
      method: request.method,
      requestId,
      rawUrl,
      error: serializeLookupError(error)
    };

    await captureSentryOperationalEvent({
      event: "lookup_route_failed",
      extra
    });

    console.error(
      JSON.stringify({
        event: "lookup_route_failed",
        ...extra
      })
    );

    return NextResponse.json(
      {
        error: "lookup failed",
        requestId
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest, toViewer } from "../../../lib/auth";
import { lookupPageByUrl } from "../../../lib/page-lookup";

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
      viewer: toViewer(viewer)
    });
  } catch (error) {
    const requestId = crypto.randomUUID();

    console.error(
      JSON.stringify({
        event: "lookup_route_failed",
        route: request.nextUrl.pathname,
        method: request.method,
        requestId,
        rawUrl,
        error: serializeLookupError(error)
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

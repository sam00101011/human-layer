import { NextRequest, NextResponse } from "next/server";

import {
  captureAnalyticsEvent,
  isAnalyticsEventName
} from "../../lib/analytics";

type AnalyticsBody = {
  event?: string;
  distinctId?: string;
  properties?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as AnalyticsBody | null;

  if (!isAnalyticsEventName(body?.event)) {
    return NextResponse.json({ error: "invalid analytics event" }, { status: 400 });
  }

  if (!body?.distinctId || typeof body.distinctId !== "string") {
    return NextResponse.json({ error: "distinctId is required" }, { status: 400 });
  }

  await captureAnalyticsEvent({
    event: body.event,
    distinctId: body.distinctId,
    properties: body.properties
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}

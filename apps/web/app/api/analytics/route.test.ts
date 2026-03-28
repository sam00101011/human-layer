import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const analyticsMocks = vi.hoisted(() => ({
  captureAnalyticsEvent: vi.fn()
}));

vi.mock("../../lib/analytics", async () => {
  const actual = await vi.importActual<typeof import("../../lib/analytics")>(
    "../../lib/analytics"
  );

  return {
    ...actual,
    captureAnalyticsEvent: analyticsMocks.captureAnalyticsEvent
  };
});

import { POST } from "./route";

describe("POST /api/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unknown events", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/analytics", {
        method: "POST",
        body: JSON.stringify({
          event: "unknown_event",
          distinctId: "anon-1"
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid analytics event"
    });
  });

  it("captures allowed events", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/analytics", {
        method: "POST",
        body: JSON.stringify({
          event: "overlay_opened",
          distinctId: "anon-1",
          properties: {
            source: "extension"
          }
        })
      })
    );

    expect(analyticsMocks.captureAnalyticsEvent).toHaveBeenCalledWith({
      event: "overlay_opened",
      distinctId: "anon-1",
      properties: {
        source: "extension"
      }
    });
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});

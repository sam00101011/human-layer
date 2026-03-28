import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findPageById: vi.fn(),
  getPageThreadSnapshot: vi.fn(),
  upsertVerdictForPage: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  findPageById: mocks.findPageById,
  getPageThreadSnapshot: mocks.getPageThreadSnapshot,
  upsertVerdictForPage: mocks.upsertVerdictForPage
}));

vi.mock("../../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

import { POST } from "./route";

describe("POST /api/pages/[pageId]/verdict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(new NextRequest("http://localhost/api/pages/page-1/verdict"), {
      params: Promise.resolve({ pageId: "page-1" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("rejects invalid verdict values", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.findPageById.mockResolvedValue({
      id: "page-1"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/pages/page-1/verdict", {
        method: "POST",
        body: JSON.stringify({
          verdict: "wrong"
        })
      }),
      {
        params: Promise.resolve({ pageId: "page-1" })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid verdict"
    });
  });

  it("writes the verdict for authenticated viewers", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.findPageById.mockResolvedValue({
      id: "page-1"
    });
    mocks.getPageThreadSnapshot.mockResolvedValue({
      verdictCounts: {
        useful: 0,
        misleading: 1,
        outdated: 0,
        scam: 0
      },
      topHumanTake: null,
      recentComments: []
    });

    const response = await POST(
      new NextRequest("http://localhost/api/pages/page-1/verdict", {
        method: "POST",
        body: JSON.stringify({
          verdict: "misleading"
        })
      }),
      {
        params: Promise.resolve({ pageId: "page-1" })
      }
    );

    expect(mocks.upsertVerdictForPage).toHaveBeenCalledWith({
      pageId: "page-1",
      profileId: "profile-1",
      verdict: "misleading"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      thread: {
        verdictCounts: {
          useful: 0,
          misleading: 1,
          outdated: 0,
          scam: 0
        },
        topHumanTake: null,
        recentComments: []
      }
    });
  });
});

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCommentForPage: vi.fn(),
  findPageById: vi.fn(),
  getPageThreadSnapshot: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  createCommentForPage: mocks.createCommentForPage,
  findPageById: mocks.findPageById,
  getPageThreadSnapshot: mocks.getPageThreadSnapshot
}));

vi.mock("../../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

import { POST } from "./route";

describe("POST /api/pages/[pageId]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(new NextRequest("http://localhost/api/pages/page-1/comments"), {
      params: Promise.resolve({ pageId: "page-1" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("requires a non-empty comment body", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.findPageById.mockResolvedValue({
      id: "page-1"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/pages/page-1/comments", {
        method: "POST",
        body: JSON.stringify({
          body: "   "
        })
      }),
      {
        params: Promise.resolve({ pageId: "page-1" })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "comment body is required"
    });
  });

  it("creates a comment for authenticated viewers", async () => {
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
        misleading: 0,
        outdated: 0,
        scam: 0
      },
      topHumanTake: {
        commentId: "comment-1",
        profileId: "profile-1",
        profileHandle: "demo_builder",
        body: "Phase 0 verified path.",
        helpfulCount: 0,
        createdAt: "2026-03-28T00:00:00.000Z"
      },
      recentComments: [
        {
          commentId: "comment-1",
          profileId: "profile-1",
          profileHandle: "demo_builder",
          body: "Phase 0 verified path.",
          helpfulCount: 0,
          createdAt: "2026-03-28T00:00:00.000Z"
        }
      ]
    });

    const response = await POST(
      new NextRequest("http://localhost/api/pages/page-1/comments", {
        method: "POST",
        body: JSON.stringify({
          body: " Phase 0 verified path. "
        })
      }),
      {
        params: Promise.resolve({ pageId: "page-1" })
      }
    );

    expect(mocks.createCommentForPage).toHaveBeenCalledWith({
      pageId: "page-1",
      profileId: "profile-1",
      body: "Phase 0 verified path."
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      thread: {
        verdictCounts: {
          useful: 0,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: {
          commentId: "comment-1",
          profileId: "profile-1",
          profileHandle: "demo_builder",
          body: "Phase 0 verified path.",
          helpfulCount: 0,
          createdAt: "2026-03-28T00:00:00.000Z"
        },
        recentComments: [
          {
            commentId: "comment-1",
            profileId: "profile-1",
            profileHandle: "demo_builder",
            body: "Phase 0 verified path.",
            helpfulCount: 0,
            createdAt: "2026-03-28T00:00:00.000Z"
          }
        ]
      }
    });
  });
});

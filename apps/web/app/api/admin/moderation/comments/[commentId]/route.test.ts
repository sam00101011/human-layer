import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCommentById: vi.fn(),
  reviewCommentReports: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn(),
  isAdminProfile: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  findCommentById: mocks.findCommentById,
  reviewCommentReports: mocks.reviewCommentReports
}));

vi.mock("../../../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest,
  isAdminProfile: mocks.isAdminProfile
}));

import { POST } from "./route";

describe("POST /api/admin/moderation/comments/[commentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/moderation/comments/comment-1"),
      {
        params: Promise.resolve({ commentId: "comment-1" })
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("rejects non-admin viewers", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.isAdminProfile.mockReturnValue(false);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/moderation/comments/comment-1"),
      {
        params: Promise.resolve({ commentId: "comment-1" })
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "admin access required"
    });
  });

  it("returns 404 when the comment does not exist", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.isAdminProfile.mockReturnValue(true);
    mocks.findCommentById.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/moderation/comments/comment-1"),
      {
        params: Promise.resolve({ commentId: "comment-1" })
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "comment not found"
    });
  });

  it("rejects invalid moderation actions", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.isAdminProfile.mockReturnValue(true);
    mocks.findCommentById.mockResolvedValue({
      id: "comment-1",
      pageId: "page-1",
      profileId: "profile-2",
      body: "Flagged comment",
      hidden: false,
      reasonCode: null
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/moderation/comments/comment-1", {
        method: "POST",
        body: JSON.stringify({
          action: "ban"
        })
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid moderation action"
    });
  });

  it("forwards moderation actions for admin reviewers", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "admin-1",
      handle: "demo_builder"
    });
    mocks.isAdminProfile.mockReturnValue(true);
    mocks.findCommentById.mockResolvedValue({
      id: "comment-1",
      pageId: "page-1",
      profileId: "profile-2",
      body: "Flagged comment",
      hidden: false,
      reasonCode: null
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/moderation/comments/comment-1", {
        method: "POST",
        body: JSON.stringify({
          action: "hide",
          reasonCode: "reported_abuse"
        })
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" })
      }
    );

    expect(mocks.reviewCommentReports).toHaveBeenCalledWith({
      commentId: "comment-1",
      adminProfileId: "admin-1",
      action: "hide",
      reasonCode: "reported_abuse"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true
    });
  });
});

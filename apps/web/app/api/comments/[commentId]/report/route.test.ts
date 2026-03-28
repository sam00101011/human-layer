import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCommentReport: vi.fn(),
  findCommentById: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  createCommentReport: mocks.createCommentReport,
  findCommentById: mocks.findCommentById
}));

vi.mock("../../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

import { POST } from "./route";

describe("POST /api/comments/[commentId]/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(new NextRequest("http://localhost/api/comments/comment-1/report"), {
      params: Promise.resolve({ commentId: "comment-1" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("returns 404 when the comment does not exist", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.findCommentById.mockResolvedValue(null);

    const response = await POST(new NextRequest("http://localhost/api/comments/comment-1/report"), {
      params: Promise.resolve({ commentId: "comment-1" })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "comment not found"
    });
  });

  it("rejects self-reports", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.findCommentById.mockResolvedValue({
      id: "comment-1",
      pageId: "page-1",
      profileId: "profile-1",
      body: "Own comment",
      hidden: false,
      reasonCode: null
    });

    const response = await POST(new NextRequest("http://localhost/api/comments/comment-1/report"), {
      params: Promise.resolve({ commentId: "comment-1" })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "cannot report your own comment"
    });
  });

  it("creates a report for another viewer's comment", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-2",
      handle: "demo_reader"
    });
    mocks.findCommentById.mockResolvedValue({
      id: "comment-1",
      pageId: "page-1",
      profileId: "profile-1",
      body: "Needs review",
      hidden: false,
      reasonCode: null
    });

    const response = await POST(
      new NextRequest("http://localhost/api/comments/comment-1/report", {
        method: "POST",
        body: JSON.stringify({
          reasonCode: " abuse ",
          details: " hostile tone "
        })
      }),
      {
        params: Promise.resolve({ commentId: "comment-1" })
      }
    );

    expect(mocks.createCommentReport).toHaveBeenCalledWith({
      commentId: "comment-1",
      reporterProfileId: "profile-2",
      reasonCode: "abuse",
      details: "hostile tone"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true
    });
  });
});

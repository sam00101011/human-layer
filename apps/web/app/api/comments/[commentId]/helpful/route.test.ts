import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCommentById: vi.fn(),
  markCommentHelpful: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn(),
  assertProfileCanParticipate: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  findCommentById: mocks.findCommentById,
  markCommentHelpful: mocks.markCommentHelpful
}));

vi.mock("../../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

vi.mock("../../../../lib/safety", () => ({
  assertProfileCanParticipate: mocks.assertProfileCanParticipate
}));

import { POST } from "./route";

describe("POST /api/comments/[commentId]/helpful", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertProfileCanParticipate.mockResolvedValue(null);
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/comments/comment-1/helpful", { method: "POST" }),
      { params: Promise.resolve({ commentId: "comment-1" }) }
    );

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

    const response = await POST(
      new NextRequest("http://localhost/api/comments/comment-1/helpful", { method: "POST" }),
      { params: Promise.resolve({ commentId: "comment-1" }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "comment not found"
    });
  });

  it("rejects self-votes", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.findCommentById.mockResolvedValue({
      id: "comment-1",
      pageId: "page-1",
      profileId: "profile-1",
      body: "hello",
      hidden: false,
      reasonCode: null
    });

    const response = await POST(
      new NextRequest("http://localhost/api/comments/comment-1/helpful", { method: "POST" }),
      { params: Promise.resolve({ commentId: "comment-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "cannot vote on your own comment"
    });
  });

  it("records a helpful vote", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.findCommentById.mockResolvedValue({
      id: "comment-1",
      pageId: "page-1",
      profileId: "profile-2",
      body: "hello",
      hidden: false,
      reasonCode: null
    });
    mocks.markCommentHelpful.mockResolvedValue({
      created: true,
      helpfulCount: 3
    });

    const response = await POST(
      new NextRequest("http://localhost/api/comments/comment-1/helpful", { method: "POST" }),
      { params: Promise.resolve({ commentId: "comment-1" }) }
    );

    expect(mocks.markCommentHelpful).toHaveBeenCalledWith({
      commentId: "comment-1",
      profileId: "profile-1"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      created: true,
      helpfulCount: 3
    });
  });

  it("rejects blocked viewers", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.assertProfileCanParticipate.mockResolvedValue("account restricted");

    const response = await POST(
      new NextRequest("http://localhost/api/comments/comment-1/helpful", { method: "POST" }),
      { params: Promise.resolve({ commentId: "comment-1" }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "account restricted"
    });
  });
});

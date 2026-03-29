import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  followTopicForProfile: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  followTopicForProfile: mocks.followTopicForProfile
}));

vi.mock("../../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

import { POST } from "./route";

describe("POST /api/topics/[topic]/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(new NextRequest("http://localhost/api/topics/ai/follow"), {
      params: Promise.resolve({ topic: "ai" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("rejects unknown topics", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await POST(new NextRequest("http://localhost/api/topics/unknown/follow"), {
      params: Promise.resolve({ topic: "unknown" })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "topic not found"
    });
  });

  it("follows a topic for authenticated viewers", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await POST(new NextRequest("http://localhost/api/topics/ai/follow"), {
      params: Promise.resolve({ topic: "ai" })
    });

    expect(mocks.followTopicForProfile).toHaveBeenCalledWith({
      profileId: "profile-1",
      topic: "ai"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true
    });
  });
});

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  followProfile: vi.fn(),
  getProfileById: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  followProfile: mocks.followProfile,
  getProfileById: mocks.getProfileById
}));

vi.mock("../../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

import { POST } from "./route";

describe("POST /api/profiles/[profileId]/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(new NextRequest("http://localhost/api/profiles/profile-2/follow"), {
      params: Promise.resolve({ profileId: "profile-2" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("rejects self-follow attempts", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await POST(new NextRequest("http://localhost/api/profiles/profile-1/follow"), {
      params: Promise.resolve({ profileId: "profile-1" })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "cannot follow yourself"
    });
  });

  it("follows another profile for authenticated viewers", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.getProfileById.mockResolvedValue({
      id: "profile-2",
      handle: "demo_researcher"
    });

    const response = await POST(new NextRequest("http://localhost/api/profiles/profile-2/follow"), {
      params: Promise.resolve({ profileId: "profile-2" })
    });

    expect(mocks.followProfile).toHaveBeenCalledWith({
      followerProfileId: "profile-1",
      followeeProfileId: "profile-2"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true
    });
  });
});

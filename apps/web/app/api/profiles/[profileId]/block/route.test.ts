import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  blockProfileForProfile: vi.fn(),
  getProfileById: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  blockProfileForProfile: mocks.blockProfileForProfile,
  getProfileById: mocks.getProfileById
}));

vi.mock("../../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

import { POST } from "./route";

describe("POST /api/profiles/[profileId]/block", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(new NextRequest("http://localhost/api/profiles/profile-2/block"), {
      params: Promise.resolve({ profileId: "profile-2" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("rejects self-block attempts", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await POST(new NextRequest("http://localhost/api/profiles/profile-1/block"), {
      params: Promise.resolve({ profileId: "profile-1" })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "cannot block yourself"
    });
  });

  it("blocks another profile", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.getProfileById.mockResolvedValue({
      id: "profile-2",
      handle: "demo_reader",
      blockedAt: null,
      blockedReasonCode: null
    });

    const response = await POST(new NextRequest("http://localhost/api/profiles/profile-2/block"), {
      params: Promise.resolve({ profileId: "profile-2" })
    });

    expect(mocks.blockProfileForProfile).toHaveBeenCalledWith({
      profileId: "profile-1",
      blockedProfileId: "profile-2"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true
    });
  });
});

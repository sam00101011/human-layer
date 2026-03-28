import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedProfileFromRequest: vi.fn(),
  mutePageForProfile: vi.fn(),
  muteProfileForProfile: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  mutePageForProfile: mocks.mutePageForProfile,
  muteProfileForProfile: mocks.muteProfileForProfile
}));

vi.mock("../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

import { POST } from "./route";

describe("POST /api/notifications/mute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/notifications/mute", {
        method: "POST",
        body: JSON.stringify({ pageId: "page-1" })
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("mutes a page", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/notifications/mute", {
        method: "POST",
        body: JSON.stringify({ pageId: "page-1" })
      })
    );

    expect(mocks.mutePageForProfile).toHaveBeenCalledWith({
      pageId: "page-1",
      profileId: "profile-1"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("mutes another profile", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/notifications/mute", {
        method: "POST",
        body: JSON.stringify({ mutedProfileId: "profile-2" })
      })
    );

    expect(mocks.muteProfileForProfile).toHaveBeenCalledWith({
      mutedProfileId: "profile-2",
      profileId: "profile-1"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});

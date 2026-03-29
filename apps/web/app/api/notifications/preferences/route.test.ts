import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedProfileFromRequest: vi.fn(),
  updateNotificationPreferences: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  updateNotificationPreferences: mocks.updateNotificationPreferences
}));

vi.mock("../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

import { POST } from "./route";

describe("POST /api/notifications/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/notifications/preferences", {
        method: "POST",
        body: JSON.stringify({
          bookmarkedPageComments: true,
          followedProfileTakes: true,
          followedTopicTakes: true
        })
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("updates preferences for authenticated viewers", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.updateNotificationPreferences.mockResolvedValue({
      bookmarkedPageComments: false,
      followedProfileTakes: true,
      followedTopicTakes: true
    });

    const response = await POST(
      new NextRequest("http://localhost/api/notifications/preferences", {
        method: "POST",
        body: JSON.stringify({
          bookmarkedPageComments: false,
          followedProfileTakes: true,
          followedTopicTakes: true
        })
      })
    );

    expect(mocks.updateNotificationPreferences).toHaveBeenCalledWith({
      profileId: "profile-1",
      bookmarkedPageComments: false,
      followedProfileTakes: true,
      followedTopicTakes: true
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      preferences: {
        bookmarkedPageComments: false,
        followedProfileTakes: true,
        followedTopicTakes: true
      }
    });
  });
});

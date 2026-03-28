import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedProfileFromRequest: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationsRead: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  markAllNotificationsRead: mocks.markAllNotificationsRead,
  markNotificationsRead: mocks.markNotificationsRead
}));

vi.mock("../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

import { POST } from "./route";

describe("POST /api/notifications/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/notifications/read", {
        method: "POST",
        body: JSON.stringify({ markAll: true })
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("marks all notifications as read by default", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.markAllNotificationsRead.mockResolvedValue(4);

    const response = await POST(
      new NextRequest("http://localhost/api/notifications/read", {
        method: "POST",
        body: JSON.stringify({ markAll: true })
      })
    );

    expect(mocks.markAllNotificationsRead).toHaveBeenCalledWith("profile-1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      count: 4
    });
  });

  it("marks specific notification comment ids as read", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.markNotificationsRead.mockResolvedValue(2);

    const response = await POST(
      new NextRequest("http://localhost/api/notifications/read", {
        method: "POST",
        body: JSON.stringify({ commentIds: ["comment-1", "comment-2"] })
      })
    );

    expect(mocks.markNotificationsRead).toHaveBeenCalledWith({
      profileId: "profile-1",
      commentIds: ["comment-1", "comment-2"]
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      count: 2
    });
  });
});

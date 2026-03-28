import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findPageById: vi.fn(),
  savePageForProfile: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  findPageById: mocks.findPageById,
  savePageForProfile: mocks.savePageForProfile
}));

vi.mock("../../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

import { POST } from "./route";

describe("POST /api/pages/[pageId]/save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(new NextRequest("http://localhost/api/pages/page-1/save"), {
      params: Promise.resolve({ pageId: "page-1" })
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("saves the page for authenticated viewers", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.findPageById.mockResolvedValue({
      id: "page-1"
    });

    const response = await POST(new NextRequest("http://localhost/api/pages/page-1/save"), {
      params: Promise.resolve({ pageId: "page-1" })
    });

    expect(mocks.savePageForProfile).toHaveBeenCalledWith({
      pageId: "page-1",
      profileId: "profile-1"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true
    });
  });
});

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedProfileFromRequest: vi.fn()
}));

vi.mock("../../lib/auth", async () => {
  const actual = await vi.importActual<typeof import("../../lib/auth")>("../../lib/auth");

  return {
    ...actual,
    getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
  };
});

import { GET } from "./route";

describe("GET /api/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a mapped viewer payload for authenticated requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await GET(new NextRequest("http://localhost/api/me"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      viewer: {
        profileId: "profile-1",
        handle: "demo_builder"
      }
    });
  });

  it("returns a null viewer when the request is anonymous", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/me"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      viewer: null
    });
  });
});

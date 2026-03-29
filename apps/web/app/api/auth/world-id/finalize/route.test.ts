import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSessionForProfile: vi.fn()
}));

vi.mock("@human-layer/db", async () => {
  const actual = await vi.importActual<typeof import("@human-layer/db")>("@human-layer/db");

  return {
    ...actual,
    createSessionForProfile: mocks.createSessionForProfile
  };
});

import { createSignedWorldIdFinalizeToken } from "../../../../lib/auth";
import { GET } from "./route";

describe("GET /api/auth/world-id/finalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects back to verify when the token is missing or invalid", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/auth/world-id/finalize", {
        method: "GET"
      })
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "http://localhost/verify?error=session-finalize"
    );
  });

  it("creates a fresh session in a top-level browser redirect", async () => {
    mocks.createSessionForProfile.mockResolvedValue("session-token");
    const token = createSignedWorldIdFinalizeToken({
      profileId: "profile-1",
      redirectTo: "/install-extension?source=verify"
    });

    const response = await GET(
      new NextRequest(
        `http://localhost/api/auth/world-id/finalize?token=${encodeURIComponent(token)}`,
        {
          method: "GET"
        }
      )
    );

    expect(mocks.createSessionForProfile).toHaveBeenCalledWith("profile-1");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "http://localhost/install-extension?source=verify"
    );
    expect(response.headers.get("set-cookie")).toContain("hl_session=session-token");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSessionForProfile: vi.fn(),
  upsertVerifiedProfile: vi.fn(),
  verifyWorldIdSubmission: vi.fn()
}));

vi.mock("@human-layer/db", async () => {
  const actual = await vi.importActual<typeof import("@human-layer/db")>("@human-layer/db");

  return {
    ...actual,
    createSessionForProfile: mocks.createSessionForProfile,
    upsertVerifiedProfile: mocks.upsertVerifiedProfile
  };
});

vi.mock("../../../../lib/world-id", async () => {
  const actual = await vi.importActual<typeof import("../../../../lib/world-id")>(
    "../../../../lib/world-id"
  );

  return {
    ...actual,
    verifyWorldIdSubmission: mocks.verifyWorldIdSubmission
  };
});

import { POST } from "./route";
import { HandleTakenError } from "@human-layer/db";

describe("POST /api/auth/world-id/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates the handle format", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/auth/world-id/verify", {
        method: "POST",
        body: JSON.stringify({
          handle: "Bad Handle",
          interestTags: ["devtools"],
          mockHumanKey: "same-human"
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "handle must be 3-24 characters using lowercase letters, numbers, or underscores"
    });
  });

  it("requires at least one interest tag", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/auth/world-id/verify", {
        method: "POST",
        body: JSON.stringify({
          handle: "signal_builder",
          interestTags: [],
          mockHumanKey: "same-human"
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "choose at least one interest tag"
    });
  });

  it("returns a conflict when the handle is already taken", async () => {
    mocks.verifyWorldIdSubmission.mockResolvedValue({
      nullifierHash: "nullifier-1",
      verificationLevel: "orb",
      signal: "human-layer-v1"
    });
    mocks.upsertVerifiedProfile.mockRejectedValue(new HandleTakenError("taken_handle"));

    const response = await POST(
      new NextRequest("http://localhost/api/auth/world-id/verify", {
        method: "POST",
        body: JSON.stringify({
          handle: "taken_handle",
          interestTags: ["devtools"],
          mockHumanKey: "same-human"
        })
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "handle taken_handle is already taken",
      requestId: expect.any(String)
    });
  });

  it("creates a verified profile, issues a session cookie, and redirects to extension handoff", async () => {
    mocks.verifyWorldIdSubmission.mockResolvedValue({
      nullifierHash: "nullifier-1",
      verificationLevel: "orb",
      signal: "human-layer-v1"
    });
    mocks.upsertVerifiedProfile.mockResolvedValue({
      created: true,
      profile: {
        id: "profile-1",
        handle: "signal_builder",
        interestTags: ["devtools", "research"],
        nullifierHash: "nullifier-1",
        createdAt: "2026-03-28T00:00:00.000Z"
      }
    });
    mocks.createSessionForProfile.mockResolvedValue("session-token");

    const response = await POST(
      new NextRequest("http://localhost/api/auth/world-id/verify", {
        method: "POST",
        body: JSON.stringify({
          handle: "signal_builder",
          interestTags: ["devtools", "research"],
          mockHumanKey: "same-human",
          handoff: true,
          returnUrl: "https://github.com/vercel/next.js"
        })
      })
    );

    expect(mocks.upsertVerifiedProfile).toHaveBeenCalledWith({
      nullifierHash: "nullifier-1",
      handle: "signal_builder",
      interestTags: ["devtools", "research"],
      verificationLevel: "orb",
      signal: "human-layer-v1"
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("hl_session=session-token");
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      created: true,
      redirectTo:
        "/auth/extension-handoff?returnUrl=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js",
      finalizeUrl: expect.stringMatching(
        /^\/api\/auth\/world-id\/finalize\?token=/
      ),
      profile: {
        id: "profile-1",
        handle: "signal_builder",
        interestTags: ["devtools", "research"],
        verifiedHuman: true
      }
    });
  });
});

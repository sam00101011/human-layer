import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAtprotoAccountSnapshot: vi.fn(),
  updateAtprotoAccountSettings: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn(),
  assertProfileCanParticipate: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  getAtprotoAccountSnapshot: mocks.getAtprotoAccountSnapshot,
  updateAtprotoAccountSettings: mocks.updateAtprotoAccountSettings
}));

vi.mock("../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

vi.mock("../../lib/safety", () => ({
  assertProfileCanParticipate: mocks.assertProfileCanParticipate
}));

import { GET, PATCH } from "./route";

describe("AT Protocol route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertProfileCanParticipate.mockResolvedValue(null);
    mocks.getAtprotoAccountSnapshot.mockResolvedValue({
      profileId: "profile-1",
      profileHandle: "signal_builder",
      handle: "signal_builder.humanlayer.social",
      did: "did:web:humanlayer.social:profiles:profile-1",
      status: "reserved",
      pdsUrl: "https://humanlayer.social",
      accountType: "managed",
      publicPostingEnabled: false,
      metadata: {},
      createdAt: "2026-03-31T00:00:00.000Z",
      updatedAt: "2026-03-31T00:00:00.000Z"
    });
    mocks.updateAtprotoAccountSettings.mockResolvedValue({
      profileId: "profile-1",
      profileHandle: "signal_builder",
      handle: "signal_builder.humanlayer.social",
      did: "did:web:humanlayer.social:profiles:profile-1",
      status: "provisioned",
      pdsUrl: "https://humanlayer.social",
      accountType: "managed",
      publicPostingEnabled: true,
      metadata: {},
      createdAt: "2026-03-31T00:00:00.000Z",
      updatedAt: "2026-03-31T00:00:00.000Z"
    });
  });

  it("rejects anonymous reads", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/atproto"));

    expect(response.status).toBe(401);
  });

  it("returns an identity snapshot for authenticated viewers", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "signal_builder"
    });

    const response = await GET(new NextRequest("http://localhost/api/atproto"));

    expect(mocks.getAtprotoAccountSnapshot).toHaveBeenCalledWith("profile-1");
    expect(response.status).toBe(200);
  });

  it("updates AT Protocol settings", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "signal_builder"
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/atproto", {
        method: "PATCH",
        body: JSON.stringify({
          publicPostingEnabled: true
        })
      })
    );

    expect(mocks.updateAtprotoAccountSettings).toHaveBeenCalledWith({
      profileId: "profile-1",
      publicPostingEnabled: true
    });
    expect(response.status).toBe(200);
  });
});

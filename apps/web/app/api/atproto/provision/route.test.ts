import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureManagedAtprotoIdentityForProfile: vi.fn(),
  finalizeManagedAtprotoIdentityForProfile: vi.fn(),
  getAtprotoAccountSnapshot: vi.fn(),
  provisionManagedAtprotoIdentity: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn(),
  assertProfileCanParticipate: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  ensureManagedAtprotoIdentityForProfile: mocks.ensureManagedAtprotoIdentityForProfile,
  finalizeManagedAtprotoIdentityForProfile: mocks.finalizeManagedAtprotoIdentityForProfile,
  getAtprotoAccountSnapshot: mocks.getAtprotoAccountSnapshot
}));

vi.mock("../../../lib/atproto", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/atproto")>("../../../lib/atproto");

  return {
    ...actual,
    provisionManagedAtprotoIdentity: mocks.provisionManagedAtprotoIdentity
  };
});

vi.mock("../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

vi.mock("../../../lib/safety", () => ({
  assertProfileCanParticipate: mocks.assertProfileCanParticipate
}));

import { POST } from "./route";

describe("AT Protocol provision route", () => {
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
    mocks.provisionManagedAtprotoIdentity.mockResolvedValue({
      did: "did:web:humanlayer.social:profiles:profile-1",
      handle: "signal_builder.humanlayer.social",
      status: "provisioned",
      pdsUrl: "https://humanlayer.social",
      publicPostingEnabled: false,
      metadata: {
        provisioningMode: "local_managed_service"
      }
    });
    mocks.finalizeManagedAtprotoIdentityForProfile.mockResolvedValue({
      profileId: "profile-1",
      profileHandle: "signal_builder",
      handle: "signal_builder.humanlayer.social",
      did: "did:web:humanlayer.social:profiles:profile-1",
      status: "provisioned",
      pdsUrl: "https://humanlayer.social",
      accountType: "managed",
      publicPostingEnabled: false,
      metadata: {
        provisioningMode: "local_managed_service"
      },
      createdAt: "2026-03-31T00:00:00.000Z",
      updatedAt: "2026-03-31T00:00:00.000Z"
    });
  });

  it("rejects anonymous provisioning", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(new NextRequest("http://localhost/api/atproto/provision", { method: "POST" }));

    expect(response.status).toBe(401);
  });

  it("provisions a reserved identity", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "signal_builder"
    });

    const response = await POST(new NextRequest("http://localhost/api/atproto/provision", { method: "POST" }));

    expect(mocks.provisionManagedAtprotoIdentity).toHaveBeenCalledWith({
      profileId: "profile-1",
      profileHandle: "signal_builder",
      reservedHandle: "signal_builder.humanlayer.social",
      reservedDid: "did:web:humanlayer.social:profiles:profile-1",
      currentStatus: "reserved"
    });
    expect(mocks.finalizeManagedAtprotoIdentityForProfile).toHaveBeenCalledWith({
      profileId: "profile-1",
      handle: "signal_builder.humanlayer.social",
      did: "did:web:humanlayer.social:profiles:profile-1",
      status: "provisioned",
      pdsUrl: "https://humanlayer.social",
      publicPostingEnabled: false,
      metadata: {
        provisioningMode: "local_managed_service"
      }
    });
    expect(response.status).toBe(200);
  });
});

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureManagedWalletForProfile: vi.fn(),
  updateManagedWalletSettings: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn(),
  assertProfileCanParticipate: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  MANAGED_WALLET_PROVIDERS: ["exa", "perplexity", "opus_46"],
  ensureManagedWalletForProfile: mocks.ensureManagedWalletForProfile,
  updateManagedWalletSettings: mocks.updateManagedWalletSettings
}));

vi.mock("../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

vi.mock("../../lib/safety", () => ({
  assertProfileCanParticipate: mocks.assertProfileCanParticipate
}));

import { GET, PATCH } from "./route";

describe("wallet route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertProfileCanParticipate.mockResolvedValue(null);
    mocks.ensureManagedWalletForProfile.mockResolvedValue({
      walletId: "wallet-1"
    });
    mocks.updateManagedWalletSettings.mockResolvedValue({
      walletId: "wallet-1"
    });
  });

  it("rejects anonymous wallet reads", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/wallet"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("returns a wallet snapshot for authenticated viewers", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await GET(new NextRequest("http://localhost/api/wallet"));

    expect(mocks.ensureManagedWalletForProfile).toHaveBeenCalledWith({
      profileId: "profile-1",
      handle: "demo_builder"
    });
    expect(response.status).toBe(200);
  });

  it("updates wallet settings", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/wallet", {
        method: "PATCH",
        body: JSON.stringify({
          spendingEnabled: false,
          dailySpendLimitUsdCents: 2500,
          defaultProvider: "perplexity",
          enabledProviders: ["perplexity", "exa"]
        })
      })
    );

    expect(mocks.updateManagedWalletSettings).toHaveBeenCalledWith({
      profileId: "profile-1",
      spendingEnabled: false,
      dailySpendLimitUsdCents: 2500,
      defaultProvider: "perplexity",
      enabledProviders: ["perplexity", "exa"]
    });
    expect(response.status).toBe(200);
  });
});

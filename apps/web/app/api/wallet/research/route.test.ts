import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureManagedWalletForProfile: vi.fn(),
  findPageById: vi.fn(),
  getPageThreadSnapshot: vi.fn(),
  recordWalletResearchPayment: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn(),
  assertProfileCanParticipate: vi.fn(),
  getWalletResearchProvider: vi.fn(),
  isWalletResearchProviderConfigured: vi.fn(),
  runWalletResearch: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  ensureManagedWalletForProfile: mocks.ensureManagedWalletForProfile,
  findPageById: mocks.findPageById,
  getPageThreadSnapshot: mocks.getPageThreadSnapshot,
  recordWalletResearchPayment: mocks.recordWalletResearchPayment
}));

vi.mock("../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

vi.mock("../../../lib/safety", () => ({
  assertProfileCanParticipate: mocks.assertProfileCanParticipate
}));

vi.mock("../../../lib/wallet-tools", () => ({
  getWalletResearchProvider: mocks.getWalletResearchProvider,
  isWalletResearchProviderConfigured: mocks.isWalletResearchProviderConfigured,
  runWalletResearch: mocks.runWalletResearch
}));

import { POST } from "./route";

describe("wallet research route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertProfileCanParticipate.mockResolvedValue(null);
    mocks.findPageById.mockResolvedValue({
      id: "page-1",
      title: "Next.js",
      host: "github.com",
      pageKind: "github_repo"
    });
    mocks.ensureManagedWalletForProfile.mockResolvedValue({
      spendingEnabled: true,
      availableCreditUsdCents: 2500,
      remainingDailyBudgetUsdCents: 1000,
      enabledProviders: ["exa", "perplexity"],
      defaultProvider: "exa"
    });
    mocks.getWalletResearchProvider.mockReturnValue({
      id: "exa",
      label: "Exa research",
      priceUsdCents: 15
    });
    mocks.isWalletResearchProviderConfigured.mockReturnValue(true);
    mocks.getPageThreadSnapshot.mockResolvedValue({
      verdictCounts: {
        useful: 1,
        misleading: 0,
        outdated: 0,
        scam: 0
      },
      recentComments: [],
      topHumanTake: null
    });
    mocks.runWalletResearch.mockResolvedValue({
      chargedUsdCents: 15,
      providerConfigured: true,
      result: {
        providerId: "exa",
        providerLabel: "Exa research",
        priceUsdCents: 15,
        mode: "live",
        query: "Research this page",
        summary: "Summary",
        whyItMatters: "Why it matters",
        bullets: ["A", "B"],
        citations: []
      }
    });
    mocks.recordWalletResearchPayment.mockResolvedValue({
      eventId: "event-1",
      remainingCreditUsdCents: 2485,
      remainingDailyBudgetUsdCents: 985
    });
  });

  it("rejects anonymous requests", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/wallet/research", {
        method: "POST",
        body: JSON.stringify({ pageId: "page-1" })
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication required"
    });
  });

  it("requires a page id", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/wallet/research", {
        method: "POST",
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "pageId is required"
    });
  });

  it("runs research and records a payment event", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/wallet/research", {
        method: "POST",
        body: JSON.stringify({ pageId: "page-1", provider: "exa" })
      })
    );

    expect(mocks.recordWalletResearchPayment).toHaveBeenCalledWith({
      profileId: "profile-1",
      pageId: "page-1",
      provider: "exa",
      amountUsdCents: 15,
      description: "Exa research: Next.js",
      status: "live",
      metadata: {
        query: "Research this page",
        pageHost: "github.com",
        pageKind: "github_repo",
        providerConfigured: true
      }
    });
    expect(response.status).toBe(200);
  });

  it("falls back to a free preview when no provider key is configured", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.isWalletResearchProviderConfigured.mockReturnValue(false);
    mocks.runWalletResearch.mockResolvedValue({
      chargedUsdCents: 0,
      providerConfigured: false,
      result: {
        providerId: "exa",
        providerLabel: "Exa research",
        priceUsdCents: 15,
        mode: "preview",
        query: "Preview this page",
        summary: "Summary",
        whyItMatters: "Why it matters",
        bullets: ["A", "B"],
        citations: []
      }
    });

    const response = await POST(
      new NextRequest("http://localhost/api/wallet/research", {
        method: "POST",
        body: JSON.stringify({ pageId: "page-1", provider: "exa" })
      })
    );

    expect(mocks.recordWalletResearchPayment).toHaveBeenCalledWith({
      profileId: "profile-1",
      pageId: "page-1",
      provider: "exa",
      amountUsdCents: 0,
      description: "Exa research: Next.js",
      status: "preview",
      metadata: {
        query: "Preview this page",
        pageHost: "github.com",
        pageKind: "github_repo",
        providerConfigured: false
      }
    });
    expect(response.status).toBe(200);
  });
});

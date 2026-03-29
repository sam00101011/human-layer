import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getManagedWalletSnapshot: vi.fn(),
  findPageById: vi.fn(),
  recordWalletResearchPayment: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn(),
  assertProfileCanParticipate: vi.fn(),
  getWalletResearchProvider: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  getManagedWalletSnapshot: mocks.getManagedWalletSnapshot,
  findPageById: mocks.findPageById,
  recordWalletResearchPayment: mocks.recordWalletResearchPayment
}));

vi.mock("../../../lib/auth", () => ({
  getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
}));

vi.mock("../../../lib/safety", () => ({
  assertProfileCanParticipate: mocks.assertProfileCanParticipate
}));

vi.mock("../../../lib/wallet-tools", () => ({
  getWalletResearchProvider: mocks.getWalletResearchProvider
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
    mocks.getManagedWalletSnapshot.mockResolvedValue({
      spendingEnabled: true,
      remainingDailyBudgetUsdCents: 1000,
      enabledProviders: ["exa", "perplexity"],
      defaultProvider: "exa"
    });
    mocks.getWalletResearchProvider.mockReturnValue({
      id: "exa",
      label: "Exa research",
      priceUsdCents: 15
    });
    mocks.recordWalletResearchPayment.mockResolvedValue({
      eventId: "event-1",
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
        body: JSON.stringify({
          pageId: "page-1",
          provider: "exa",
          amountUsdCents: 15,
          paymentRail: "wallet_signed_x402",
          paymentResponseHeader: "payment-receipt",
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
        })
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
        paymentRail: "wallet_signed_x402",
        paymentResponseHeader: "payment-receipt"
      }
    });
    expect(response.status).toBe(200);
  });

  it("records a free preview without spend", async () => {
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });

    const response = await POST(
      new NextRequest("http://localhost/api/wallet/research", {
        method: "POST",
        body: JSON.stringify({
          pageId: "page-1",
          provider: "exa",
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
        })
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
        paymentRail: "preview",
        paymentResponseHeader: null
      }
    });
    expect(response.status).toBe(200);
  });
});

import {
  findPageById,
  getManagedWalletSnapshot,
  recordWalletResearchPayment,
  type ManagedWalletProviderId
} from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getWalletResearchProvider, type WalletResearchResult } from "../../../lib/wallet-tools";
import { getAuthenticatedProfileFromRequest } from "../../../lib/auth";
import { assertProfileCanParticipate } from "../../../lib/safety";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const restriction = await assertProfileCanParticipate(viewer.id);
  if (restriction) {
    return NextResponse.json({ error: restriction }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        pageId?: string;
        provider?: string;
        amountUsdCents?: number;
        paymentRail?: string;
        paymentResponseHeader?: string | null;
        result?: WalletResearchResult | null;
      }
    | null;

  if (!body?.pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  const page = await findPageById(body.pageId);
  if (!page) {
    return NextResponse.json({ error: "page not found" }, { status: 404 });
  }

  const wallet = await getManagedWalletSnapshot(viewer.id);
  if (!wallet) {
    return NextResponse.json({ error: "connect a wallet first" }, { status: 409 });
  }

  const providerId: ManagedWalletProviderId =
    body.provider && wallet.enabledProviders.includes(body.provider as ManagedWalletProviderId)
      ? (body.provider as ManagedWalletProviderId)
      : wallet.defaultProvider;
  const provider = getWalletResearchProvider(providerId);
  const amountUsdCents = Math.max(
    0,
    typeof body.amountUsdCents === "number"
      ? Math.round(body.amountUsdCents)
      : body.result?.mode === "live"
        ? provider.priceUsdCents
        : 0
  );

  if (!wallet.enabledProviders.includes(provider.id)) {
    return NextResponse.json({ error: "provider disabled for this wallet" }, { status: 409 });
  }

  if (amountUsdCents > 0 && !wallet.spendingEnabled) {
    return NextResponse.json({ error: "wallet spending is disabled" }, { status: 409 });
  }

  if (amountUsdCents > 0 && wallet.remainingDailyBudgetUsdCents < amountUsdCents) {
    return NextResponse.json({ error: "daily wallet cap reached" }, { status: 409 });
  }

  if (!body.result) {
    return NextResponse.json({ error: "result is required" }, { status: 400 });
  }

  if (body.result.providerId !== provider.id) {
    return NextResponse.json({ error: "provider mismatch" }, { status: 400 });
  }

  const payment = await recordWalletResearchPayment({
    profileId: viewer.id,
    pageId: page.id,
    provider: provider.id,
    amountUsdCents,
    description: provider.label + ": " + page.title,
    status: body.result.mode,
    metadata: {
      query: body.result.query,
      pageHost: page.host,
      pageKind: page.pageKind,
      paymentRail: body.paymentRail ?? (amountUsdCents > 0 ? "wallet_signed_x402" : "preview"),
      paymentResponseHeader: body.paymentResponseHeader ?? null
    }
  });

  return NextResponse.json({
    ok: true,
    payment,
    result: body.result
  });
}

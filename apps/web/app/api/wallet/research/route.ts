import {
  ensureManagedWalletForProfile,
  findPageById,
  getPageThreadSnapshot,
  recordWalletResearchPayment
} from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { buildWalletResearchPreview, getWalletResearchProvider } from "../../../lib/wallet-tools";
import { getAuthenticatedProfileFromRequest } from "../../../lib/auth";
import { assertProfileCanParticipate } from "../../../lib/safety";

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
        provider?: "exa" | "perplexity" | "opus_46";
      }
    | null;

  if (!body?.pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  const page = await findPageById(body.pageId);
  if (!page) {
    return NextResponse.json({ error: "page not found" }, { status: 404 });
  }

  const wallet = await ensureManagedWalletForProfile({
    profileId: viewer.id,
    handle: viewer.handle
  });

  if (!wallet.spendingEnabled) {
    return NextResponse.json({ error: "wallet spending is disabled" }, { status: 409 });
  }

  const providerId =
    body.provider && wallet.enabledProviders.includes(body.provider)
      ? body.provider
      : wallet.defaultProvider;
  const provider = getWalletResearchProvider(providerId);

  if (!wallet.enabledProviders.includes(provider.id)) {
    return NextResponse.json({ error: "provider disabled for this wallet" }, { status: 409 });
  }

  if (wallet.availableCreditUsdCents < provider.priceUsdCents) {
    return NextResponse.json({ error: "not enough wallet credit" }, { status: 409 });
  }

  if (wallet.remainingDailyBudgetUsdCents < provider.priceUsdCents) {
    return NextResponse.json({ error: "daily wallet cap reached" }, { status: 409 });
  }

  const thread = await getPageThreadSnapshot(page.id, viewer.id);
  const result = buildWalletResearchPreview({
    page,
    thread,
    providerId: provider.id
  });
  const payment = await recordWalletResearchPayment({
    profileId: viewer.id,
    pageId: page.id,
    provider: provider.id,
    amountUsdCents: provider.priceUsdCents,
    description: provider.label + ": " + page.title,
    status: result.mode,
    metadata: {
      query: result.query,
      pageHost: page.host,
      pageKind: page.pageKind
    }
  });

  return NextResponse.json({
    ok: true,
    payment,
    result
  });
}

import {
  ensureManagedWalletForProfile,
  findPageById,
  getPageThreadSnapshot,
  recordWalletResearchPayment,
  type ManagedWalletProviderId
} from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import {
  getWalletResearchProvider,
  isWalletResearchProviderConfigured,
  runWalletResearch
} from "../../../lib/wallet-tools";
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

  const providerId: ManagedWalletProviderId =
    body.provider && wallet.enabledProviders.includes(body.provider as ManagedWalletProviderId)
      ? (body.provider as ManagedWalletProviderId)
      : wallet.defaultProvider;
  const provider = getWalletResearchProvider(providerId);
  const configured = isWalletResearchProviderConfigured(provider.id);

  if (!wallet.enabledProviders.includes(provider.id)) {
    return NextResponse.json({ error: "provider disabled for this wallet" }, { status: 409 });
  }

  if (configured && wallet.availableCreditUsdCents < provider.priceUsdCents) {
    return NextResponse.json({ error: "not enough wallet credit" }, { status: 409 });
  }

  if (configured && wallet.remainingDailyBudgetUsdCents < provider.priceUsdCents) {
    return NextResponse.json({ error: "daily wallet cap reached" }, { status: 409 });
  }

  const thread = await getPageThreadSnapshot(page.id, viewer.id);
  const execution = await runWalletResearch({
    page,
    thread,
    providerId: provider.id
  });
  const payment = await recordWalletResearchPayment({
    profileId: viewer.id,
    pageId: page.id,
    provider: provider.id,
    amountUsdCents: execution.chargedUsdCents,
    description: provider.label + ": " + page.title,
    status: execution.result.mode,
    metadata: {
      query: execution.result.query,
      pageHost: page.host,
      pageKind: page.pageKind,
      providerConfigured: execution.providerConfigured
    }
  });

  return NextResponse.json({
    ok: true,
    payment,
    result: execution.result
  });
}

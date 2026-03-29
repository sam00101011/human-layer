import {
  MANAGED_WALLET_PROVIDERS,
  ensureManagedWalletForProfile,
  updateManagedWalletSettings
} from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../lib/auth";
import { assertProfileCanParticipate } from "../../lib/safety";

function sanitizeProviders(input: unknown): Array<(typeof MANAGED_WALLET_PROVIDERS)[number]> {
  if (!Array.isArray(input)) {
    return ["exa"];
  }

  const values = input
    .filter((value): value is (typeof MANAGED_WALLET_PROVIDERS)[number] => {
      return typeof value === "string" && MANAGED_WALLET_PROVIDERS.includes(value as never);
    })
    .filter((value, index, array) => array.indexOf(value) === index);

  return values.length > 0 ? values : ["exa"];
}

export async function GET(request: NextRequest) {
  const viewer = await getAuthenticatedProfileFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const restriction = await assertProfileCanParticipate(viewer.id);
  if (restriction) {
    return NextResponse.json({ error: restriction }, { status: 403 });
  }

  const wallet = await ensureManagedWalletForProfile({
    profileId: viewer.id,
    handle: viewer.handle
  });

  return NextResponse.json({
    ok: true,
    wallet
  });
}

export async function PATCH(request: NextRequest) {
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
        spendingEnabled?: boolean;
        dailySpendLimitUsdCents?: number;
        defaultProvider?: string;
        enabledProviders?: string[];
      }
    | null;

  const enabledProviders = sanitizeProviders(body?.enabledProviders);
  const defaultProvider = MANAGED_WALLET_PROVIDERS.includes(body?.defaultProvider as never)
    ? (body?.defaultProvider as (typeof MANAGED_WALLET_PROVIDERS)[number])
    : enabledProviders[0];

  const wallet = await updateManagedWalletSettings({
    profileId: viewer.id,
    spendingEnabled: body?.spendingEnabled ?? true,
    dailySpendLimitUsdCents: Math.max(
      100,
      typeof body?.dailySpendLimitUsdCents === "number" ? body.dailySpendLimitUsdCents : 1000
    ),
    defaultProvider,
    enabledProviders
  });

  return NextResponse.json({
    ok: true,
    wallet
  });
}

import { linkManagedWalletToProfile } from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedProfileFromRequest } from "../../../lib/auth";
import { assertProfileCanParticipate } from "../../../lib/safety";

const walletAddressPattern = /^0x[a-f0-9]{40}$/;

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
        walletAddress?: string;
        walletProvider?: string;
        walletType?: string;
        network?: string;
        delegatedSession?: Record<string, unknown>;
      }
    | null;

  const walletAddress = body?.walletAddress?.trim().toLowerCase();
  if (!walletAddress || !walletAddressPattern.test(walletAddress)) {
    return NextResponse.json({ error: "valid walletAddress is required" }, { status: 400 });
  }

  try {
    const wallet = await linkManagedWalletToProfile({
      profileId: viewer.id,
      handle: viewer.handle,
      walletAddress,
      walletProvider: body?.walletProvider ?? "coinbase_smart_wallet",
      walletType: body?.walletType ?? "passkey_smart_wallet",
      network: body?.network ?? "base",
      delegatedSession: body?.delegatedSession ?? {}
    });

    return NextResponse.json({
      ok: true,
      wallet
    });
  } catch (error) {
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) {
      return NextResponse.json({ error: "wallet already linked to another profile" }, { status: 409 });
    }

    throw error;
  }
}

import {
  ensureManagedAtprotoIdentityForProfile,
  finalizeManagedAtprotoIdentityForProfile,
  getAtprotoAccountSnapshot
} from "@human-layer/db";
import { NextRequest, NextResponse } from "next/server";

import {
  canProvisionAtprotoIdentity,
  provisionManagedAtprotoIdentity
} from "../../../lib/atproto";
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

  const reservedIdentity =
    (await getAtprotoAccountSnapshot(viewer.id)) ??
    (() => null)();

  const identity =
    reservedIdentity ??
    (await (async () => {
      const reserved = await ensureManagedAtprotoIdentityForProfile({
        profileId: viewer.id,
        handle: viewer.handle
      });

      return {
        profileId: viewer.id,
        profileHandle: viewer.handle,
        handle: reserved.handle,
        did: reserved.did,
        status: reserved.status,
        pdsUrl: "https://humanlayer.social",
        accountType: "managed",
        publicPostingEnabled: false,
        metadata: {
          domain: "humanlayer.social",
          provisioningMode: "reserved_identity"
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    })());

  if (!canProvisionAtprotoIdentity(identity)) {
    return NextResponse.json({
      ok: true,
      identity
    });
  }

  const provisioned = await provisionManagedAtprotoIdentity({
    profileId: identity.profileId,
    profileHandle: identity.profileHandle,
    reservedHandle: identity.handle,
    reservedDid: identity.did,
    currentStatus: identity.status
  });

  const snapshot = await finalizeManagedAtprotoIdentityForProfile({
    profileId: identity.profileId,
    handle: provisioned.handle,
    did: provisioned.did,
    status: provisioned.status,
    pdsUrl: provisioned.pdsUrl,
    publicPostingEnabled: provisioned.publicPostingEnabled ?? identity.publicPostingEnabled,
    metadata: provisioned.metadata ?? identity.metadata
  });

  return NextResponse.json({
    ok: true,
    identity: snapshot
  });
}

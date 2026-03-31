import { afterEach, describe, expect, it, vi } from "vitest";

import { provisionManagedAtprotoIdentity } from "./atproto";

const originalFetch = global.fetch;

describe("AT Protocol provisioning", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    delete process.env.ATPROTO_MANAGED_PDS_URL;
    delete process.env.ATPROTO_ACCOUNT_PASSWORD_SECRET;
    delete process.env.ATPROTO_PDS_INVITE_CODE;
    delete process.env.ATPROTO_MANAGED_EMAIL_DOMAIN;
  });

  it("falls back to the local managed service when direct PDS provisioning is not configured", async () => {
    const result = await provisionManagedAtprotoIdentity({
      profileId: "profile-1",
      profileHandle: "signal_builder",
      reservedHandle: "signal_builder.humanlayer.social",
      reservedDid: "did:web:humanlayer.social:profiles:profile-1",
      currentStatus: "reserved"
    });

    expect(result.status).toBe("provisioned");
    expect(result.did).toBe("did:web:humanlayer.social:profiles:profile-1");
    expect(result.metadata?.provisioningMode).toBe("local_managed_service");
  });

  it("creates a real managed account against a configured PDS", async () => {
    process.env.ATPROTO_MANAGED_PDS_URL = "https://pds.humanlayer.test";
    process.env.ATPROTO_ACCOUNT_PASSWORD_SECRET = "super-secret";
    process.env.ATPROTO_MANAGED_EMAIL_DOMAIN = "humanlayer.test";

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            did: "did:web:pds.humanlayer.test",
            availableUserDomains: ["humanlayer.social"],
            inviteCodeRequired: false
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessJwt: "access",
            refreshJwt: "refresh",
            handle: "signal_builder.humanlayer.social",
            did: "did:plc:abc123"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );

    global.fetch = fetchMock as typeof fetch;

    const result = await provisionManagedAtprotoIdentity({
      profileId: "profile-1",
      profileHandle: "signal_builder",
      reservedHandle: "signal_builder.humanlayer.social",
      reservedDid: "did:web:humanlayer.social:profiles:profile-1",
      currentStatus: "reserved"
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://pds.humanlayer.test/xrpc/com.atproto.server.describeServer",
      expect.objectContaining({
        headers: { accept: "application/json" }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://pds.humanlayer.test/xrpc/com.atproto.server.createAccount",
      expect.objectContaining({
        method: "POST"
      })
    );
    expect(result.did).toBe("did:plc:abc123");
    expect(result.handle).toBe("signal_builder.humanlayer.social");
    expect(result.metadata?.provisioningMode).toBe("direct_pds");
  });

  it("reuses the managed account if the handle already exists", async () => {
    process.env.ATPROTO_MANAGED_PDS_URL = "https://pds.humanlayer.test";
    process.env.ATPROTO_ACCOUNT_PASSWORD_SECRET = "super-secret";

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            did: "did:web:pds.humanlayer.test",
            availableUserDomains: ["humanlayer.social"],
            inviteCodeRequired: false
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "HandleNotAvailable",
            message: "handle already exists"
          }),
          { status: 400, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessJwt: "access",
            refreshJwt: "refresh",
            handle: "signal_builder.humanlayer.social",
            did: "did:plc:abc123",
            active: true
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );

    global.fetch = fetchMock as typeof fetch;

    const result = await provisionManagedAtprotoIdentity({
      profileId: "profile-1",
      profileHandle: "signal_builder",
      reservedHandle: "signal_builder.humanlayer.social",
      reservedDid: "did:web:humanlayer.social:profiles:profile-1",
      currentStatus: "reserved"
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.did).toBe("did:plc:abc123");
    expect(result.metadata?.reusedExistingAccount).toBe(true);
  });
});

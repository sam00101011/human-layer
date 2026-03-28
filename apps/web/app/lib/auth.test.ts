import { beforeEach, describe, expect, it } from "vitest";

import { createSignedExtensionToken, toViewer, verifySignedExtensionToken } from "./auth";

describe("verifySignedExtensionToken", () => {
  beforeEach(() => {
    process.env.EXTENSION_TOKEN_SECRET = "test-secret";
  });

  it("accepts a valid token", () => {
    const token = createSignedExtensionToken({
      profileId: "profile-1",
      handle: "demo_builder",
      ttlSeconds: 60
    });

    expect(verifySignedExtensionToken(token.token)).toEqual({
      profileId: "profile-1",
      handle: "demo_builder",
      expiresAt: token.expiresAt
    });
  });

  it("rejects a tampered token", () => {
    const token = createSignedExtensionToken({
      profileId: "profile-1",
      handle: "demo_builder",
      ttlSeconds: 60
    });

    const [payload] = token.token.split(".");
    expect(verifySignedExtensionToken(`${payload}.tampered`)).toBeNull();
  });
});

describe("toViewer", () => {
  it("maps an authenticated profile into the extension-safe viewer shape", () => {
    expect(
      toViewer({
        id: "profile-1",
        handle: "demo_builder"
      })
    ).toEqual({
      profileId: "profile-1",
      handle: "demo_builder"
    });
  });

  it("returns null when there is no authenticated profile", () => {
    expect(toViewer(null)).toBeNull();
  });
});

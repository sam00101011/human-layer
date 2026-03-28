import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lookupPageByUrl: vi.fn(),
  hasProfileSavedPage: vi.fn(),
  getAuthenticatedProfileFromRequest: vi.fn()
}));

vi.mock("../../../lib/page-lookup", () => ({
  lookupPageByUrl: mocks.lookupPageByUrl
}));

vi.mock("@human-layer/db", () => ({
  hasProfileSavedPage: mocks.hasProfileSavedPage
}));

vi.mock("../../../lib/auth", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/auth")>("../../../lib/auth");

  return {
    ...actual,
    getAuthenticatedProfileFromRequest: mocks.getAuthenticatedProfileFromRequest
  };
});

import { GET } from "./route";

describe("GET /api/pages/lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasProfileSavedPage.mockResolvedValue(false);
  });

  it("returns 400 when the url parameter is missing", async () => {
    const response = await GET(new NextRequest("http://localhost/api/pages/lookup"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "url is required"
    });
  });

  it("returns the lookup payload with a mapped viewer", async () => {
    mocks.lookupPageByUrl.mockResolvedValue({
      supported: true,
      state: "active",
      page: {
        id: "page-1",
        pageKind: "github_repo",
        canonicalUrl: "https://github.com/vercel/next.js",
        canonicalKey: "https://github.com/vercel/next.js",
        host: "github.com",
        title: "vercel/next.js"
      },
      thread: {
        verdictCounts: {
          useful: 1,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: null,
        recentComments: []
      }
    });
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue({
      id: "profile-1",
      handle: "demo_builder"
    });
    mocks.hasProfileSavedPage.mockResolvedValue(true);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/pages/lookup?url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js"
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      supported: true,
      state: "active",
      page: {
        id: "page-1",
        pageKind: "github_repo",
        canonicalUrl: "https://github.com/vercel/next.js",
        canonicalKey: "https://github.com/vercel/next.js",
        host: "github.com",
        title: "vercel/next.js"
      },
      thread: {
        verdictCounts: {
          useful: 1,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: null,
        recentComments: []
      },
      savedByViewer: true,
      viewer: {
        profileId: "profile-1",
        handle: "demo_builder"
      }
    });
  });

  it("logs a request id and returns 500 when the lookup fails", async () => {
    mocks.lookupPageByUrl.mockRejectedValue(new Error("database offline"));
    mocks.getAuthenticatedProfileFromRequest.mockResolvedValue(null);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const randomUuid = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("request-123");

    const response = await GET(
      new NextRequest(
        "http://localhost/api/pages/lookup?url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js"
      )
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "lookup failed",
      requestId: "request-123"
    });
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('"requestId":"request-123"'));
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('"rawUrl":"https://github.com/vercel/next.js"')
    );

    consoleError.mockRestore();
    randomUuid.mockRestore();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProfileSnapshotByHandle: vi.fn()
}));

vi.mock("@human-layer/db", () => ({
  getProfileSnapshotByHandle: mocks.getProfileSnapshotByHandle
}));

import { GET } from "./route";

describe("GET /api/profiles/by-handle/[handle]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the profile does not exist", async () => {
    mocks.getProfileSnapshotByHandle.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/profiles/by-handle/missing"), {
      params: Promise.resolve({ handle: "missing" })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "profile not found"
    });
  });

  it("returns the profile snapshot when present", async () => {
    mocks.getProfileSnapshotByHandle.mockResolvedValue({
      id: "profile-1",
      handle: "signal_builder",
      verifiedHuman: true,
      interestTags: ["devtools", "research"],
      counts: {
        comments: 2,
        saves: 1,
        followers: 3,
        following: 4
      },
      recentComments: [],
      savedPages: [],
      createdAt: "2026-03-28T00:00:00.000Z"
    });

    const response = await GET(
      new Request("http://localhost/api/profiles/by-handle/signal_builder"),
      {
        params: Promise.resolve({ handle: "signal_builder" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: {
        id: "profile-1",
        handle: "signal_builder",
        verifiedHuman: true,
        interestTags: ["devtools", "research"],
        counts: {
          comments: 2,
          saves: 1,
          followers: 3,
          following: 4
        },
        recentComments: [],
        savedPages: [],
        createdAt: "2026-03-28T00:00:00.000Z"
      }
    });
  });
});

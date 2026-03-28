import { describe, expect, it } from "vitest";

import { pickTopHumanTake } from "../src/top-human-take";

describe("pickTopHumanTake", () => {
  it("returns null when there are no comments", () => {
    expect(pickTopHumanTake([])).toBeNull();
  });

  it("picks the highest-helpful verified-human comment", () => {
    const take = pickTopHumanTake([
      {
        commentId: "one",
        profileId: "profile-one",
        profileHandle: "builder",
        body: "Strong walkthrough.",
        helpfulCount: 2,
        createdAt: "2026-03-28T00:00:00.000Z"
      },
      {
        commentId: "two",
        profileId: "profile-two",
        profileHandle: "researcher",
        body: "Useful for the routing examples.",
        helpfulCount: 5,
        createdAt: "2026-03-27T23:00:00.000Z"
      }
    ]);

    expect(take?.commentId).toBe("two");
  });

  it("breaks helpful-count ties by recency", () => {
    const take = pickTopHumanTake([
      {
        commentId: "older",
        profileId: "profile-older",
        profileHandle: "alpha",
        body: "Older comment",
        helpfulCount: 3,
        createdAt: "2026-03-27T10:00:00.000Z"
      },
      {
        commentId: "newer",
        profileId: "profile-newer",
        profileHandle: "beta",
        body: "Newer comment",
        helpfulCount: 3,
        createdAt: "2026-03-28T10:00:00.000Z"
      }
    ]);

    expect(take?.commentId).toBe("newer");
  });
});

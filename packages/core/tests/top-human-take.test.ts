import { describe, expect, it } from "vitest";

import { explainHumanTakeRecommendation, pickTopHumanTake, sortHumanTakes } from "../src/top-human-take";

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

  it("uses contributor reputation to break close ties", () => {
    const ordered = sortHumanTakes([
      {
        commentId: "steady",
        profileId: "profile-steady",
        profileHandle: "steady",
        body: "Steady contributor comment",
        helpfulCount: 1,
        createdAt: "2026-03-28T00:00:00.000Z",
        reputation: {
          level: "steady_contributor",
          label: "Steady contributor",
          description: "",
          evidence: []
        }
      },
      {
        commentId: "fresh",
        profileId: "profile-fresh",
        profileHandle: "fresh",
        body: "Fresh comment",
        helpfulCount: 1,
        createdAt: "2026-03-28T00:00:00.000Z"
      }
    ]);

    expect(ordered[0]?.commentId).toBe("steady");
  });

  it("explains why a take was recommended", () => {
    const reasons = explainHumanTakeRecommendation(
      {
        commentId: "top",
        profileId: "profile-top",
        profileHandle: "top",
        body: "Top comment",
        helpfulCount: 4,
        createdAt: new Date().toISOString(),
        reputation: {
          level: "consistently_useful",
          label: "Consistently useful",
          description: "",
          evidence: []
        }
      },
      [
        {
          commentId: "top",
          profileId: "profile-top",
          profileHandle: "top",
          body: "Top comment",
          helpfulCount: 4,
          createdAt: new Date().toISOString(),
          reputation: {
            level: "consistently_useful",
            label: "Consistently useful",
            description: "",
            evidence: []
          }
        },
        {
          commentId: "other",
          profileId: "profile-other",
          profileHandle: "other",
          body: "Other comment",
          helpfulCount: 1,
          createdAt: "2026-03-20T00:00:00.000Z"
        }
      ]
    );

    expect(reasons).toContain("Most helpful so far");
    expect(reasons).toContain("Consistently useful contributor");
  });
});

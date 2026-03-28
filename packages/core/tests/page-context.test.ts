import { describe, expect, it } from "vitest";

import { buildPageContextSummary, inferPageInterestTags } from "../src/page-context";

describe("inferPageInterestTags", () => {
  it("infers oss and devtools tags for repository pages", () => {
    const tags = inferPageInterestTags({
      page: {
        pageKind: "github_repo",
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
        topHumanTake: {
          commentId: "c1",
          profileId: "p1",
          profileHandle: "demo_builder",
          body: "Useful OSS repo with strong docs and devtools ergonomics.",
          helpfulCount: 4,
          createdAt: "2026-03-28T00:00:00.000Z"
        },
        recentComments: []
      }
    });

    expect(tags).toContain("oss");
    expect(tags).toContain("devtools");
  });

  it("infers ai and research tags for model pages", () => {
    const tags = inferPageInterestTags({
      page: {
        pageKind: "model_page",
        host: "huggingface.co",
        title: "Reasoning model benchmark"
      },
      thread: {
        verdictCounts: {
          useful: 0,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: {
          commentId: "c1",
          profileId: "p1",
          profileHandle: "demo_researcher",
          body: "Interesting AI research benchmark with useful evaluation notes.",
          helpfulCount: 2,
          createdAt: "2026-03-28T00:00:00.000Z"
        },
        recentComments: []
      }
    });

    expect(tags).toContain("ai");
    expect(tags).toContain("research");
  });
});

describe("buildPageContextSummary", () => {
  it("builds a useful-leaning summary when useful verdicts dominate", () => {
    const summary = buildPageContextSummary({
      page: {
        pageKind: "github_repo",
        host: "github.com",
        title: "vercel/next.js"
      },
      thread: {
        verdictCounts: {
          useful: 2,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: {
          commentId: "c1",
          profileId: "p1",
          profileHandle: "demo_builder",
          body: "Strong starting point for evaluating architecture quickly.",
          helpfulCount: 4,
          createdAt: "2026-03-28T00:00:00.000Z"
        },
        recentComments: [
          {
            commentId: "c1",
            profileId: "p1",
            profileHandle: "demo_builder",
            body: "Strong starting point for evaluating architecture quickly.",
            helpfulCount: 4,
            createdAt: "2026-03-28T00:00:00.000Z"
          }
        ]
      }
    });

    expect(summary.dominantVerdict).toBe("useful");
    expect(summary.summary).toContain("verified humans");
    expect(summary.whyItMatters[0]).toContain("builders");
  });
});

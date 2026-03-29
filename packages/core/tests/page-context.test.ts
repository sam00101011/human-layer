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

  it("adds site-specific guidance for high-value support surfaces", () => {
    const chromeStore = buildPageContextSummary({
      page: {
        pageKind: "chrome_web_store_item",
        host: "chromewebstore.google.com",
        title: "Human Layer"
      },
      thread: {
        verdictCounts: {
          useful: 0,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: null,
        recentComments: []
      }
    });

    const stackOverflow = buildPageContextSummary({
      page: {
        pageKind: "qa_question",
        host: "stackoverflow.com",
        title: "How do I ship this?"
      },
      thread: {
        verdictCounts: {
          useful: 0,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: null,
        recentComments: []
      }
    });

    const githubRelease = buildPageContextSummary({
      page: {
        pageKind: "github_release",
        host: "github.com",
        title: "vercel/next.js release v16.0.0"
      },
      thread: {
        verdictCounts: {
          useful: 0,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: null,
        recentComments: []
      }
    });

    const huggingFace = buildPageContextSummary({
      page: {
        pageKind: "hugging_face_model",
        host: "huggingface.co",
        title: "Reasoning model"
      },
      thread: {
        verdictCounts: {
          useful: 0,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: null,
        recentComments: []
      }
    });

    const spotifyEpisode = buildPageContextSummary({
      page: {
        pageKind: "spotify_episode",
        host: "open.spotify.com",
        title: "Spotify episode"
      },
      thread: {
        verdictCounts: {
          useful: 0,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: null,
        recentComments: []
      }
    });

    expect(chromeStore.surfaceLens?.label).toBe("Install signal");
    expect(stackOverflow.surfaceLens?.label).toBe("Freshness signal");
    expect(githubRelease.surfaceLens?.label).toBe("Upgrade signal");
    expect(huggingFace.surfaceLens?.label).toBe("Deployment signal");
    expect(spotifyEpisode.surfaceLens?.label).toBe("Listen-worth signal");
    expect(chromeStore.surfaceLens?.explanation).toContain("worth installing");
  });
});

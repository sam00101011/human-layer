import { describe, expect, it } from "vitest";

import type { ThreadSnapshot } from "@human-layer/core";

import { lookupPageByUrl, type PageLookupStore } from "./page-lookup";

function createStore(overrides?: Partial<PageLookupStore>): PageLookupStore {
  return {
    async findPageByCanonicalKey(canonicalKey) {
      if (canonicalKey === "https://react.dev/reference/react/useTransition") {
        return {
          id: "external-page",
          pageKind: "hn_linked_url",
          canonicalUrl: canonicalKey,
          canonicalKey,
          host: "react.dev",
          title: "react.dev/reference/react/useTransition"
        };
      }

      return null;
    },
    async upsertPage(candidate) {
      return {
        id: "direct-page",
        pageKind: candidate.pageKind,
        canonicalUrl: candidate.canonicalUrl,
        canonicalKey: candidate.canonicalKey,
        host: candidate.host,
        title: candidate.title
      };
    },
    async getThreadSnapshot(pageId): Promise<ThreadSnapshot> {
      if (pageId === "external-page") {
        return {
          verdictCounts: {
            useful: 1,
            misleading: 0,
            outdated: 0,
            scam: 0
          },
          topHumanTake: {
            commentId: "c1",
            profileId: "profile-1",
            profileHandle: "demo_builder",
            body: "Useful walkthrough.",
            helpfulCount: 2,
            createdAt: "2026-03-28T00:00:00.000Z"
          },
          recentComments: [
            {
              commentId: "c1",
              profileId: "profile-1",
              profileHandle: "demo_builder",
              body: "Useful walkthrough.",
              helpfulCount: 2,
              createdAt: "2026-03-28T00:00:00.000Z"
            }
          ]
        };
      }

      return {
        verdictCounts: {
          useful: 0,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: null,
        recentComments: []
      };
    },
    ...overrides
  };
}

describe("lookupPageByUrl", () => {
  it("returns unsupported for unsupported page types", async () => {
    const response = await lookupPageByUrl(
      "https://github.com/vercel/next.js/discussions",
      createStore()
    );

    expect(response).toEqual({
      supported: false,
      state: "unsupported",
      page: null,
      thread: null
    });
  });

  it("returns empty for supported pages with no activity", async () => {
    const response = await lookupPageByUrl("https://github.com/vercel/next.js", createStore());

    expect(response.supported).toBe(true);
    expect(response.state).toBe("empty");
    expect(response.page?.pageKind).toBe("github_repo");
    expect(response.thread?.topHumanTake).toBeNull();
  });

  it("returns active for seeded external pages", async () => {
    const response = await lookupPageByUrl(
      "https://react.dev/reference/react/useTransition",
      createStore()
    );

    expect(response.supported).toBe(true);
    expect(response.state).toBe("active");
    expect(response.page?.pageKind).toBe("hn_linked_url");
    expect(response.thread?.topHumanTake?.commentId).toBe("c1");
  });

  it("returns empty for newly supported direct pages", async () => {
    const response = await lookupPageByUrl(
      "https://www.producthunt.com/products/raycast",
      createStore()
    );

    expect(response.supported).toBe(true);
    expect(response.state).toBe("empty");
    expect(response.page?.pageKind).toBe("product_hunt_product");
  });

  it("returns empty for newly supported knowledge pages", async () => {
    const response = await lookupPageByUrl(
      "https://stackoverflow.com/questions/12345678/how-to-ship-it",
      createStore()
    );

    expect(response.supported).toBe(true);
    expect(response.state).toBe("empty");
    expect(response.page?.pageKind).toBe("qa_question");
  });
});

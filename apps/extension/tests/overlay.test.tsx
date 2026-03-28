import { fireEvent, render, screen, within } from "@testing-library/react";
import type { NormalizedPageCandidate, PageLookupResponse } from "@human-layer/core";
import { describe, expect, it, vi } from "vitest";

import { OverlayView } from "../components/OverlayView";

const baseProps = {
  draftComment: "",
  followedProfileIds: [],
  isSaved: false,
  isSubmitting: false,
  lookup: null,
  onDraftCommentChange: vi.fn(),
  onFollow: vi.fn(),
  onOpenFeedback: vi.fn(),
  onOpenPage: vi.fn(),
  onOpenProfile: vi.fn(),
  onRetry: vi.fn(),
  onSave: vi.fn(),
  onSubmitTake: vi.fn(),
  onVerify: vi.fn(),
  onVerdictSelect: vi.fn(),
  selectedVerdict: null,
  statusMessage: null,
  surfaceState: "ready" as const,
  target: {
    pageKind: "github_repo",
    canonicalUrl: "https://github.com/vercel/next.js",
    canonicalKey: "https://github.com/vercel/next.js",
    host: "github.com",
    title: "vercel/next.js",
    requiresExistingPage: false
  } satisfies NormalizedPageCandidate,
  verdictOptions: ["useful", "misleading", "outdated", "scam"] as const
};

function renderOverlay(lookup: PageLookupResponse | null, overrides?: Partial<typeof baseProps>) {
  return render(<OverlayView {...baseProps} lookup={lookup} {...overrides} />);
}

describe("OverlayView", () => {
  it("renders the loading shell on supported pages", () => {
    renderOverlay(null, { surfaceState: "loading" });

    expect(screen.getByText("Checking verified takes for this page.")).toBeTruthy();
    expect(screen.getByText("vercel/next.js")).toBeTruthy();
  });

  it("renders a retry shell when lookup fails", () => {
    const onRetry = vi.fn();
    const onOpenFeedback = vi.fn();
    renderOverlay(null, { onRetry, onOpenFeedback, surfaceState: "error" });

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Feedback" }));

    expect(screen.getByText("Human Layer is having trouble loading right now.")).toBeTruthy();
    expect(onRetry).toHaveBeenCalled();
    expect(onOpenFeedback).toHaveBeenCalled();
  });

  it("renders the unsupported state", () => {
    const onOpenFeedback = vi.fn();
    const view = renderOverlay(
      { supported: false, state: "unsupported", page: null, thread: null },
      { onOpenFeedback }
    );
    const scope = within(view.container);

    expect(screen.getByText("This page is outside the Phase 0 supported surface list.")).toBeTruthy();
    fireEvent.click(scope.getByRole("button", { name: "Feedback" }));
    expect(onOpenFeedback).toHaveBeenCalled();
  });

  it("renders the empty zero-state", () => {
    renderOverlay({
      supported: true,
      state: "empty",
      page: {
        id: "1",
        pageKind: "github_repo",
        canonicalUrl: "https://github.com/vercel/next.js",
        canonicalKey: "https://github.com/vercel/next.js",
        host: "github.com",
        title: "vercel/next.js"
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
      },
      viewer: null
    });

    expect(screen.getByText("Verify to write")).toBeTruthy();
  });

  it("renders the active state with the top human take", () => {
    renderOverlay({
      supported: true,
      state: "active",
      page: {
        id: "1",
        pageKind: "hn_item",
        canonicalUrl: "https://news.ycombinator.com/item?id=40843880",
        canonicalKey: "https://news.ycombinator.com/item?id=40843880",
        host: "news.ycombinator.com",
        title: "HN item 40843880"
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
          profileId: "profile-1",
          profileHandle: "demo_builder",
          body: "Worth the read.",
          helpfulCount: 4,
          createdAt: "2026-03-28T00:00:00.000Z"
        },
        recentComments: [
          {
            commentId: "c1",
            profileId: "profile-1",
            profileHandle: "demo_builder",
            body: "Worth the read.",
            helpfulCount: 4,
            createdAt: "2026-03-28T00:00:00.000Z"
          }
        ]
      },
      viewer: {
        profileId: "viewer-1",
        handle: "viewer"
      }
    });

    expect(screen.getAllByText("Worth the read.")).toHaveLength(2);
    expect(screen.getByText("Verdicts")).toBeTruthy();
    expect(screen.getByText("Post take")).toBeTruthy();
  });

  it("opens the page and profile links from the overlay", () => {
    const onOpenPage = vi.fn();
    const onOpenProfile = vi.fn();

    const view = renderOverlay(
      {
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
          topHumanTake: {
            commentId: "c1",
            profileId: "profile-1",
            profileHandle: "demo_builder",
            body: "Worth the read.",
            helpfulCount: 4,
            createdAt: "2026-03-28T00:00:00.000Z"
          },
          recentComments: [
            {
              commentId: "c2",
              profileId: "profile-2",
              profileHandle: "demo_researcher",
              body: "Helpful context.",
              helpfulCount: 1,
              createdAt: "2026-03-28T00:00:00.000Z"
            }
          ]
        },
        viewer: {
          profileId: "viewer-1",
          handle: "viewer"
        }
      },
      {
        onOpenPage,
        onOpenProfile
      }
    );
    const scope = within(view.container);

    fireEvent.click(scope.getByRole("button", { name: "Human Layer" }));
    fireEvent.click(scope.getByRole("button", { name: "@viewer" }));
    fireEvent.click(scope.getByRole("button", { name: "@demo_builder" }));
    fireEvent.click(scope.getByRole("button", { name: "@demo_researcher" }));

    expect(onOpenPage).toHaveBeenCalledWith("page-1");
    expect(onOpenProfile).toHaveBeenCalledWith("viewer");
    expect(onOpenProfile).toHaveBeenCalledWith("demo_builder");
    expect(onOpenProfile).toHaveBeenCalledWith("demo_researcher");
  });
});

import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import type { NormalizedPageCandidate, PageLookupResponse } from "@human-layer/core";
import { describe, expect, it, vi } from "vitest";

import { OverlayView } from "../components/OverlayView";

const baseProps = {
  bookmarks: [],
  blockedProfileIds: [],
  draftComment: "",
  draftTimestamp: "",
  followedProfileIds: [],
  followedTopics: [],
  helpfulCommentIds: [],
  helpfulCountsByCommentId: {},
  helpfulSubmittingCommentIds: [],
  isCurrentPageMuted: false,
  isSaved: false,
  isSubmitting: false,
  lookup: null,
  mutedProfileIds: [],
  notificationPreferences: null,
  onBlockProfile: vi.fn(),
  onDraftCommentChange: vi.fn(),
  onDraftTimestampChange: vi.fn(),
  onFollow: vi.fn(),
  onFollowTopic: vi.fn(),
  onHelpful: vi.fn(),
  onMuteProfile: vi.fn(),
  onOpenBookmarks: vi.fn(),
  onOpenFeedback: vi.fn(),
  onOpenNotifications: vi.fn(),
  onOpenPage: vi.fn(),
  onOpenProfile: vi.fn(),
  onOpenTopic: vi.fn(),
  onMuteCurrentPage: vi.fn(),
  onReportComment: vi.fn(),
  onRetry: vi.fn(),
  onUpdateNotificationPreferences: vi.fn(),
  reportedCommentIds: [],
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
  unreadNotificationCount: 0,
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
    const view = renderOverlay({
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

    expect(screen.getByText("Worth the read.")).toBeTruthy();
   expect(screen.getByText("Verdicts")).toBeTruthy();
    expect(screen.getByText("Recommended verified takes")).toBeTruthy();
    expect(screen.getByText("Most helpful so far")).toBeTruthy();
   expect(screen.getByText("Post take")).toBeTruthy();
  });

  it("shows the optional highlight moment input on media pages", () => {
    const onDraftTimestampChange = vi.fn();

    renderOverlay(
      {
        supported: true,
        state: "active",
        page: {
          id: "1",
          pageKind: "youtube_video",
          canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          canonicalKey: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          host: "www.youtube.com",
          title: "Video"
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
        viewer: {
          profileId: "viewer-1",
          handle: "viewer"
        }
      },
      { onDraftTimestampChange }
    );

    fireEvent.change(screen.getByPlaceholderText("1:23"), {
      target: { value: "2:34" }
    });

    expect(onDraftTimestampChange).toHaveBeenCalledWith("2:34");
  });

  it("renders trust-bookmark social proof and timestamped highlights", () => {
    renderOverlay({
      supported: true,
      state: "active",
      page: {
        id: "episode-1",
        pageKind: "spotify_episode",
        canonicalUrl: "https://open.spotify.com/episode/abcde",
        canonicalKey: "https://open.spotify.com/episode/abcde",
        host: "open.spotify.com",
        title: "Episode"
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
          body: "Start at the product teardown.",
          helpfulCount: 4,
          mediaTimestampSeconds: 83,
          createdAt: "2026-03-28T00:00:00.000Z"
        },
        recentComments: [
          {
            commentId: "c1",
            profileId: "profile-1",
            profileHandle: "demo_builder",
            body: "Start at the product teardown.",
            helpfulCount: 4,
            mediaTimestampSeconds: 83,
            createdAt: "2026-03-28T00:00:00.000Z"
          }
        ]
      },
      socialProof: {
        followedBookmarkCount: 2,
        followedBookmarkHandles: ["friend_one", "friend_two"]
      },
      viewer: {
        profileId: "viewer-1",
        handle: "viewer"
      }
    });

    expect(screen.getByText("People you trust bookmarked this")).toBeTruthy();
    expect(screen.getAllByText("Highlight 1:23").length).toBeGreaterThan(0);
  });

  it("lets people mark a take as helpful directly from the overlay", () => {
    const onHelpful = vi.fn();

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
          recentComments: []
        },
        viewer: {
          profileId: "viewer-1",
          handle: "viewer"
        }
      },
      { onHelpful }
    );

    fireEvent.click(within(view.container).getByRole("button", { name: "Helpful 4" }));

    expect(onHelpful).toHaveBeenCalledWith("c1");
  });

  it("labels the save action as a bookmark", () => {
    const lookup = {
      supported: true,
      state: "active",
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
          useful: 1,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: null,
        recentComments: []
      },
      viewer: {
        profileId: "viewer-1",
        handle: "viewer"
      }
    } satisfies PageLookupResponse;

    const unsavedView = renderOverlay(lookup);
    expect(within(unsavedView.container).getByRole("button", { name: "Bookmark" })).toBeTruthy();
    unsavedView.unmount();

    const savedView = renderOverlay(lookup, { isSaved: true });
    expect(within(savedView.container).getByRole("button", { name: "Bookmarked" })).toBeTruthy();
  });

  it("shows topic follow actions and recent bookmarks for signed-in viewers", () => {
    const onFollowTopic = vi.fn();
    const onOpenPage = vi.fn();

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
            useful: 2,
            misleading: 0,
            outdated: 0,
            scam: 0
          },
          topHumanTake: {
            commentId: "c1",
            profileId: "profile-1",
            profileHandle: "demo_builder",
            body: "Useful open source framework docs.",
            helpfulCount: 2,
            createdAt: "2026-03-28T00:00:00.000Z"
          },
          recentComments: []
        },
        viewer: {
          profileId: "viewer-1",
          handle: "viewer"
        }
      },
      {
        bookmarks: [
          {
            id: "bookmark-1",
            pageKind: "docs_page",
            canonicalUrl: "https://react.dev/reference/react/useTransition",
            canonicalKey: "https://react.dev/reference/react/useTransition",
            host: "react.dev",
            title: "useTransition",
            savedAt: "2026-03-28T00:00:00.000Z"
          }
        ],
        followedTopics: ["oss"],
        notificationPreferences: {
          bookmarkedPageComments: true,
          followedProfileTakes: true,
          followedTopicTakes: false
        },
        onFollowTopic,
        onOpenPage,
        unreadNotificationCount: 3
      }
    );

    expect(within(view.container).getByText("Follow topics from this page")).toBeTruthy();
    expect(within(view.container).getByRole("button", { name: "Notifications • 3" })).toBeTruthy();
    expect(within(view.container).getByRole("button", { name: "Following" })).toBeTruthy();
    fireEvent.click(within(view.container).getByRole("button", { name: "Follow", exact: true }));
    expect(onFollowTopic).toHaveBeenCalled();
    fireEvent.click(within(view.container).getByRole("button", { name: /useTransition/ }));
    expect(onOpenPage).toHaveBeenCalledWith("bookmark-1");
  });

  it("lets people toggle notification controls and mute the current page", () => {
    const onUpdateNotificationPreferences = vi.fn();
    const onMuteCurrentPage = vi.fn();

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
          topHumanTake: null,
          recentComments: []
        },
        viewer: {
          profileId: "viewer-1",
          handle: "viewer"
        }
      },
      {
        notificationPreferences: {
          bookmarkedPageComments: true,
          followedProfileTakes: false,
          followedTopicTakes: true
        },
        onMuteCurrentPage,
        onUpdateNotificationPreferences
      }
    );

    const buttons = within(view.container).getAllByRole("button", { name: "On" });
    fireEvent.click(buttons[0]!);
    expect(onUpdateNotificationPreferences).toHaveBeenCalledWith({
      bookmarkedPageComments: false,
      followedProfileTakes: false,
      followedTopicTakes: true
    });

    fireEvent.click(within(view.container).getByRole("button", { name: "Mute this page" }));
    expect(onMuteCurrentPage).toHaveBeenCalled();
  });

  it("shows report categories in the overlay and forwards the selected reason", () => {
    const onReportComment = vi.fn();

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
          recentComments: []
        },
        viewer: {
          profileId: "viewer-1",
          handle: "viewer"
        }
      },
      { onReportComment }
    );

    fireEvent.click(within(view.container).getByRole("button", { name: "Report" }));
    fireEvent.click(within(view.container).getByRole("button", { name: /Scam or fraud/ }));

    expect(onReportComment).toHaveBeenCalledWith("c1", "scam");
  });

  it("lets people mute and block another author directly from the overlay", () => {
    const onMuteProfile = vi.fn();
    const onBlockProfile = vi.fn();

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
          recentComments: []
        },
        viewer: {
          profileId: "viewer-1",
          handle: "viewer"
        }
      },
      { onBlockProfile, onMuteProfile }
    );

    fireEvent.click(within(view.container).getByRole("button", { name: "Mute @demo_builder" }));
    fireEvent.click(within(view.container).getByRole("button", { name: "Block @demo_builder" }));

    expect(onMuteProfile).toHaveBeenCalledWith("profile-1", "demo_builder");
    expect(onBlockProfile).toHaveBeenCalledWith("profile-1", "demo_builder");
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

  it("stops keyboard events from bubbling out of the composer", () => {
    const view = renderOverlay({
      supported: true,
      state: "active",
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
          useful: 1,
          misleading: 0,
          outdated: 0,
          scam: 0
        },
        topHumanTake: null,
        recentComments: []
      },
      viewer: {
        profileId: "viewer-1",
        handle: "viewer"
      }
    });

    const textArea = within(view.container).getByPlaceholderText("Add a short page-level comment");
    const event = createEvent.keyDown(textArea, { key: "a" });
    const stopPropagation = vi.fn();
    event.stopPropagation = stopPropagation;

    fireEvent(textArea, event);

    expect(stopPropagation).toHaveBeenCalled();
  });
});

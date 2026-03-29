import Link from "next/link";
import {
  getFollowedProfileActivity,
  getFollowedTopicsForProfile,
  getNotificationPreferencesForProfile,
  getNotificationsForProfile,
  getUnreadNotificationCount
} from "@human-layer/db";
import { getInterestTagLabel, type ContributorReputation, type InterestTag } from "@human-layer/core";

import { HelpfulButton } from "../../components/helpful-button";
import { MarkNotificationsReadButton } from "../../components/mark-notifications-read-button";
import { NotificationActions } from "../../components/notification-actions";
import { NotificationsSettingsPanel } from "../../components/notifications-settings-panel";
import { getAuthenticatedProfileFromCookies } from "../lib/auth";

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getReputationBadgeClass(level: string | undefined) {
  if (!level) return "reputation-badge";
  return `reputation-badge reputation-badge--${level}`;
}

function formatNotificationSource(source: "bookmarked_page" | "followed_profile" | "followed_topic") {
  if (source === "bookmarked_page") return "Bookmarked page";
  if (source === "followed_topic") return "Following topic";
  return "Following";
}

type NotificationListItem = Awaited<ReturnType<typeof getNotificationsForProfile>>[number] & {
  demo?: boolean;
};

type FollowFeedListItem = Awaited<ReturnType<typeof getFollowedProfileActivity>>[number] & {
  demo?: boolean;
};

function buildDemoNotificationState(viewerHandle: string | null) {
  const normalizedViewerHandle = viewerHandle?.toLowerCase() ?? null;
  const demoHandles = ["maya_rivera", "kenji_ito", "clara_singh", "sofia_walker", "omar_brooks"].filter(
    (handle) => handle !== normalizedViewerHandle
  );
  const now = Date.now();
  const steadyContributor: ContributorReputation = {
    level: "steady_contributor",
    label: "Steady contributor",
    description: "Shows up often with useful, page-specific signal.",
    evidence: ["Consistent public takes", "Helpful votes across pages"]
  };
  const consistentSignal: ContributorReputation = {
    level: "consistently_useful",
    label: "Consistently useful",
    description: "Regularly contributes signal that other people act on.",
    evidence: ["Strong helpful history", "Repeated saves and follows"]
  };

  const notifications: NotificationListItem[] = [
    {
      commentId: "demo-notification-1",
      body: "Worth opening the issue thread before you ship. The problem statement is strong, but the screenshots still hide the most differentiated part of the product.",
      createdAt: new Date(now - 1000 * 60 * 14).toISOString(),
      helpfulCount: 7,
      authorProfileId: "demo-notification-profile-1",
      authorHandle: demoHandles[0] ?? "maya_rivera",
      authorReputation: consistentSignal,
      pageId: "",
      pageKind: "github_issue",
      pageTitle: "Human Layer launch issue",
      pageCanonicalUrl: "https://github.com/sam00101011/human-layer/issues/1",
      pageHost: "github.com",
      sources: ["followed_profile"],
      unread: false,
      reason: "Someone you follow commented on a page that keeps attracting attention.",
      demo: true
    },
    {
      commentId: "demo-notification-2",
      body: "The verify flow is clearer now. Putting the World logo up front makes the page feel more trustworthy immediately.",
      createdAt: new Date(now - 1000 * 60 * 33).toISOString(),
      helpfulCount: 4,
      authorProfileId: "demo-notification-profile-2",
      authorHandle: demoHandles[1] ?? "kenji_ito",
      authorReputation: steadyContributor,
      pageId: "",
      pageKind: "docs_page",
      pageTitle: "World ID verification page",
      pageCanonicalUrl: "https://human-layer-web.vercel.app/verify",
      pageHost: "human-layer-web.vercel.app",
      sources: ["bookmarked_page", "followed_topic"],
      unread: false,
      reason: "Activity matched both a page you saved and a topic you follow.",
      demo: true
    },
    {
      commentId: "demo-notification-3",
      body: "Timestamped takes are the right wedge for video. People instantly understand why this is better than generic comments.",
      createdAt: new Date(now - 1000 * 60 * 58).toISOString(),
      helpfulCount: 9,
      authorProfileId: "demo-notification-profile-3",
      authorHandle: demoHandles[2] ?? "clara_singh",
      authorReputation: consistentSignal,
      pageId: "",
      pageKind: "youtube_video",
      pageTitle: "YouTube product walkthrough",
      pageCanonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      pageHost: "youtube.com",
      sources: ["followed_topic"],
      unread: false,
      reason: "This landed inside one of the topic clusters you follow.",
      demo: true
    }
  ];

  const followedFeed: FollowFeedListItem[] = [
    {
      commentId: "demo-follow-1",
      body: "The extension feels strongest when it saves me time immediately. The ranking and social proof do that better than a generic discussion layer.",
      createdAt: new Date(now - 1000 * 60 * 17).toISOString(),
      helpfulCount: 5,
      authorProfileId: "demo-follow-profile-1",
      authorHandle: demoHandles[3] ?? "sofia_walker",
      authorReputation: steadyContributor,
      pageId: "",
      pageKind: "chrome_web_store_item",
      pageTitle: "Human Layer extension listing",
      pageCanonicalUrl: "https://chromewebstore.google.com/",
      pageHost: "chromewebstore.google.com",
      reason: "New take from someone you follow. Their comments usually cluster around product and onboarding quality.",
      demo: true
    },
    {
      commentId: "demo-follow-2",
      body: "The wallet story clicks as soon as the user sees a clear approval step. The modal makes the action feel intentional instead of magical.",
      createdAt: new Date(now - 1000 * 60 * 46).toISOString(),
      helpfulCount: 6,
      authorProfileId: "demo-follow-profile-2",
      authorHandle: demoHandles[4] ?? "omar_brooks",
      authorReputation: consistentSignal,
      pageId: "",
      pageKind: "product_page",
      pageTitle: "Human Layer wallet experience",
      pageCanonicalUrl: "https://human-layer-web.vercel.app/wallet",
      pageHost: "human-layer-web.vercel.app",
      reason: "New take from someone you follow. This overlaps with the product and wallet themes they comment on most.",
      demo: true
    }
  ];

  return {
    notifications,
    followedFeed
  };
}

export default async function NotificationsPage() {
  const viewer = await getAuthenticatedProfileFromCookies();

  if (!viewer) {
    return (
      <div className="page-shell stack">
        <section className="card hero-card stack">
          <span className="pill">Notifications</span>
          <h1>Follow graph and page activity</h1>
          <p className="muted">
            Sign in with your verified-human profile to see new takes from followed people and new activity on bookmarked pages.
          </p>
          <div className="action-row">
            <Link className="button" href="/verify">
              Verify to unlock notifications
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const [notifications, unreadCount, followedFeed, preferences, followedTopics] = await Promise.all([
    getNotificationsForProfile(viewer.id, 50),
    getUnreadNotificationCount(viewer.id),
    getFollowedProfileActivity(viewer.id, 12),
    getNotificationPreferencesForProfile(viewer.id),
    getFollowedTopicsForProfile(viewer.id)
  ]);
  const demoState = buildDemoNotificationState(viewer.handle ?? null);
  const displayNotifications: NotificationListItem[] = [...demoState.notifications, ...notifications];
  const displayFollowedFeed: FollowFeedListItem[] = [...demoState.followedFeed, ...followedFeed];

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Notifications</span>
            </div>
            <h1>Keep up with the pages and people you care about</h1>
            <p className="muted">
              Human Layer now tracks three live graphs for you: new takes from people you follow, fresh activity on bookmarked pages, and topic-specific signal across the interests you chose to follow.
            </p>
          </div>
          <div className="stack compact" style={{ alignItems: "flex-end" }}>
            <NotificationsSettingsPanel
              followedTopics={followedTopics}
              initialBookmarkedPageComments={preferences.bookmarkedPageComments}
              initialFollowedProfileTakes={preferences.followedProfileTakes}
              initialFollowedTopicTakes={preferences.followedTopicTakes}
            />
            <div className="metric-grid compact-grid">
              <div className="stat-card">
                <strong>{unreadCount}</strong>
                <span className="muted">Unread</span>
              </div>
              <div className="stat-card">
                <strong>{displayNotifications.length}</strong>
                <span className="muted">Recent notifications</span>
              </div>
            </div>
          </div>
        </div>
        {unreadCount > 0 ? <MarkNotificationsReadButton /> : null}
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Latest notifications</h2>
        </div>
        {displayNotifications.length === 0 ? (
          <p className="muted">No notification activity yet. Bookmark pages and follow a few people to start the feed.</p>
        ) : (
          displayNotifications.map((item) => (
            <article className="stack comment-card interactive" key={item.commentId}>
              <div className="section-header">
                <div className="chip-row">
                  {item.unread ? <span className="pill">Unread</span> : <span className="trust-badge">Seen</span>}
                  {item.sources.map((source) => (
                    <span className="trust-badge soft" key={source}>
                      {formatNotificationSource(source)}
                    </span>
                  ))}
                  {item.authorReputation ? (
                    <span className={getReputationBadgeClass(item.authorReputation.level)}>
                      {item.authorReputation.label}
                    </span>
                  ) : null}
                  <Link className="inline-link" href={`/profiles/${item.authorHandle}`}>
                    @{item.authorHandle}
                  </Link>
                </div>
                <span className="muted">{formatDateTime(item.createdAt)}</span>
              </div>
              <div className="stack compact">
                <strong>{item.pageTitle}</strong>
                <p className="muted">{item.reason}</p>
                <p>{item.body}</p>
                <p className="muted">
                  Helpful {item.helpfulCount} • {formatPageKind(item.pageKind)} • {item.pageHost}
                </p>
              </div>
              {!item.demo ? (
                <div className="inline-action-row">
                  <HelpfulButton commentId={item.commentId} initialCount={item.helpfulCount} />
                  <NotificationActions
                    commentId={item.commentId}
                    mutedHandle={item.authorHandle}
                    mutedProfileId={item.authorProfileId}
                    pageId={item.pageId}
                    unread={item.unread}
                  />
                </div>
              ) : null}
              <div className="link-row">
                {!item.demo && item.pageId ? (
                  <Link className="inline-link" href={`/pages/${item.pageId}`}>
                    Open Human Layer page
                  </Link>
                ) : null}
                <Link className="inline-link" href={item.pageCanonicalUrl} rel="noreferrer" target="_blank">
                  Open source page
                </Link>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Follow graph</h2>
        </div>
        {displayFollowedFeed.length === 0 ? (
          <p className="muted">You are not following anyone with visible takes yet.</p>
        ) : (
          displayFollowedFeed.map((item) => (
            <article className="stack comment-card interactive" key={item.commentId}>
              <div className="section-header">
                <div className="chip-row">
                  <span className="trust-badge">Following</span>
                  {item.authorReputation ? (
                    <span className={getReputationBadgeClass(item.authorReputation.level)}>
                      {item.authorReputation.label}
                    </span>
                  ) : null}
                  <Link className="inline-link" href={`/profiles/${item.authorHandle}`}>
                    @{item.authorHandle}
                  </Link>
                </div>
                <span className="muted">{formatDateTime(item.createdAt)}</span>
              </div>
              <div className="stack compact">
                <strong>{item.pageTitle}</strong>
                <p className="muted">{item.reason}</p>
                <p>{item.body}</p>
              </div>
              {!item.demo ? <HelpfulButton commentId={item.commentId} initialCount={item.helpfulCount} /> : null}
              <div className="link-row">
                {!item.demo && item.pageId ? (
                  <Link className="inline-link" href={`/pages/${item.pageId}`}>
                    Open Human Layer page
                  </Link>
                ) : null}
                <Link className="inline-link" href={item.pageCanonicalUrl} rel="noreferrer" target="_blank">
                  Open source page
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

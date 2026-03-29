import Link from "next/link";
import {
  getFollowedProfileActivity,
  getFollowedTopicsForProfile,
  getNotificationPreferencesForProfile,
  getNotificationsForProfile,
  getUnreadNotificationCount
} from "@human-layer/db";
import { getInterestTagLabel, type InterestTag } from "@human-layer/core";

import { HelpfulButton } from "../../components/helpful-button";
import { MarkNotificationsReadButton } from "../../components/mark-notifications-read-button";
import { NotificationActions } from "../../components/notification-actions";
import { NotificationsSettingsPanel } from "../../components/notifications-settings-panel";
import { ProfileHandleLink } from "../../components/profile-handle-link";
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

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Notifications</span>
              <ProfileHandleLink className="eyebrow profile-handle-link" handle={viewer.handle} />
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
                <strong>{notifications.length}</strong>
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
        {notifications.length === 0 ? (
          <p className="muted">No notification activity yet. Bookmark pages and follow a few people to start the feed.</p>
        ) : (
          notifications.map((item) => (
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
              <div className="link-row">
                <Link className="inline-link" href={`/pages/${item.pageId}`}>
                  Open Human Layer page
                </Link>
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
        {followedFeed.length === 0 ? (
          <p className="muted">You are not following anyone with visible takes yet.</p>
        ) : (
          followedFeed.map((item) => (
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
              <HelpfulButton commentId={item.commentId} initialCount={item.helpfulCount} />
              <div className="link-row">
                <Link className="inline-link" href={`/pages/${item.pageId}`}>
                  Open Human Layer page
                </Link>
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

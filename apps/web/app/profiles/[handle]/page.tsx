import Link from "next/link";
import { getProfileSnapshotByHandle } from "@human-layer/db";
import { getInterestTagLabel } from "@human-layer/core";
import { notFound } from "next/navigation";

import { FollowProfileButton } from "../../../components/follow-profile-button";
import { HelpfulButton } from "../../../components/helpful-button";
import { MessageRequestButton } from "../../../components/message-request-button";
import { ProfileSafetyActions } from "../../../components/profile-safety-actions";
import { ReportCommentButton } from "../../../components/report-comment-button";
import { getAuthenticatedProfileFromCookies } from "../../lib/auth";

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatActivityType(value: "comment" | "verdict" | "bookmark") {
  if (value === "comment") return "Published take";
  if (value === "verdict") return "Verdict";
  return "Bookmark";
}

function getReputationBadgeClass(level: string | undefined) {
  if (!level) return "reputation-badge";
  return `reputation-badge reputation-badge--${level}`;
}

function buildTrustSignals(profile: NonNullable<Awaited<ReturnType<typeof getProfileSnapshotByHandle>>>) {
  const signals = [
    profile.verifiedHuman
      ? "Verified-human write access is active for this pseudonymous profile."
      : "Verification is not active yet, so trust is limited to public activity only.",
    profile.reputation
      ? profile.reputation.description
      : "This profile does not have enough public signal yet for a contributor read.",
    `${profile.counts.comments} public take${profile.counts.comments === 1 ? "" : "s"} and ${profile.counts.saves} bookmark${profile.counts.saves === 1 ? "" : "s"} are visible on this profile.`,
    profile.activity?.length
      ? "Contribution history is timestamped below so readers can inspect how this profile participates over time."
      : "This profile does not have public contribution history yet.",
    profile.interestTags.length
      ? `Most active around ${profile.interestTags.slice(0, 3).map((tag) => getInterestTagLabel(tag)).join(", ")}.`
      : "No declared interest tags yet."
  ];

  return signals;
}

export default async function ProfilePage(props: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await props.params;
  const viewer = await getAuthenticatedProfileFromCookies();
  const profile = await getProfileSnapshotByHandle(handle);

  if (!profile) {
    notFound();
  }

  const activity = profile.activity ?? [];
  const trustSignals = buildTrustSignals(profile);

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">{profile.verifiedHuman ? "Verified human" : "Profile"}</span>
              {profile.reputation ? (
                <span className={getReputationBadgeClass(profile.reputation.level)}>
                  {profile.reputation.label}
                </span>
              ) : null}
              <span className="trust-badge">Pseudonymous</span>
              <span className="trust-badge">{activity.length > 0 ? "Activity visible" : "Public identity"}</span>
              <span className="eyebrow">Joined {formatDate(profile.createdAt)}</span>
            </div>
            <h1>@{profile.handle}</h1>
            <p className="muted">
              {profile.verifiedHuman
                ? "One verified human controls this pseudonymous identity. Trust comes from a mix of verification, visible contributions, and the pages this profile keeps coming back to."
                : "This profile is not verified yet, so treat it as an unverified public identity."}
            </p>
          </div>
          {viewer && viewer.id !== profile.id ? (
            <div className="action-row">
              <FollowProfileButton profileId={profile.id} />
              <MessageRequestButton recipientHandle={profile.handle} recipientProfileId={profile.id} />
            </div>
          ) : null}
        </div>

        {profile.interestTags.length > 0 ? (
          <div className="chip-row">
            {profile.interestTags.map((interestTag) => (
              <span className="chip" key={interestTag}>
                {getInterestTagLabel(interestTag)}
              </span>
            ))}
          </div>
        ) : null}

        <div className="metric-grid">
          <div className="stat-card">
            <strong>{profile.counts.comments}</strong>
            <span className="muted">Published takes</span>
          </div>
          <div className="stat-card">
            <strong>{profile.counts.saves}</strong>
            <span className="muted">Bookmarked pages</span>
          </div>
          <div className="stat-card">
            <strong>{profile.counts.followers}</strong>
            <span className="muted">Followers</span>
          </div>
          <div className="stat-card">
            <strong>{profile.counts.following}</strong>
            <span className="muted">Following</span>
          </div>
        </div>
      </section>

      {profile.reputation ? (
        <section className="card stack">
          <div className="section-header">
            <h2>Contributor signal</h2>
            <span className="muted">A qualitative read on whether this profile has been useful over time.</span>
          </div>
          <article className="trust-card">
            <div className="chip-row">
              <span className={getReputationBadgeClass(profile.reputation.level)}>
                {profile.reputation.label}
              </span>
              {profile.verifiedHuman ? <span className="trust-badge">Verified human</span> : null}
            </div>
            <p>{profile.reputation.description}</p>
            <ul className="signal-list">
              {profile.reputation.evidence.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      <section className="card stack">
        <div className="section-header">
          <h2>Trust signals</h2>
          <span className="muted">What makes this profile feel more credible at a glance.</span>
        </div>
        <div className="trust-grid">
          {trustSignals.map((signal) => (
            <article className="trust-card" key={signal}>
              <span className="trust-badge">{profile.verifiedHuman ? "Verified human" : "Trust note"}</span>
              <p>{signal}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Contribution history</h2>
          <span className="muted">Recent public activity from this pseudonymous verified-human profile.</span>
        </div>
        {activity.length === 0 ? (
          <p className="muted">No visible contribution history yet.</p>
        ) : (
          <div className="activity-list">
            {activity.map((item) => (
              <article className="activity-card" key={`${item.type}-${item.id}`}>
                <div className="section-header">
                  <div className="chip-row">
                    <span className="trust-badge">{formatActivityType(item.type)}</span>
                    {profile.verifiedHuman ? <span className="trust-badge soft">Verified human</span> : null}
                  </div>
                  <span className="muted">{formatDateTime(item.createdAt)}</span>
                </div>
                <div className="stack compact">
                  <strong>{item.pageTitle}</strong>
                  <p className="muted">{item.summary}</p>
                  <p className="muted">{formatPageKind(item.pageKind)}</p>
                </div>
                <div className="link-row">
                  <Link className="inline-link" href={`/pages/${item.pageId}`}>
                    Open Human Layer page
                  </Link>
                  <Link className="inline-link" href={item.canonicalUrl} rel="noreferrer" target="_blank">
                    Open source page
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Recent takes</h2>
          <span className="muted">What this verified-human profile has been publishing lately.</span>
        </div>
        {profile.recentComments.length === 0 ? (
          <p className="muted">No comments yet.</p>
        ) : (
          profile.recentComments.map((comment) => (
            <article className="stack comment-card interactive" key={comment.commentId}>
              <div className="comment-meta">
                <div className="stack compact">
                  <div className="chip-row">
                    <span className="trust-badge">Verified take</span>
                    {comment.reputation ? (
                      <span className={getReputationBadgeClass(comment.reputation.level)}>
                        {comment.reputation.label}
                      </span>
                    ) : null}
                    <strong>{comment.pageTitle}</strong>
                  </div>
                  <p className="muted">
                    {formatPageKind(comment.pageKind)} • Helpful {comment.helpfulCount} • {formatDate(comment.createdAt)}
                  </p>
                </div>
              </div>
              <p>{comment.body}</p>
              <div className="inline-action-row">
                <HelpfulButton commentId={comment.commentId} initialCount={comment.helpfulCount} />
                <ReportCommentButton commentId={comment.commentId} compact />
                <ProfileSafetyActions
                  profileHandle={comment.profileHandle}
                  profileId={comment.profileId}
                  viewerProfileId={viewer?.id}
                />
              </div>
              <div className="link-row">
                <Link className="inline-link" href={`/pages/${comment.pageId}`}>
                  Open Human Layer page
                </Link>
                <Link className="inline-link" href={comment.canonicalUrl} rel="noreferrer" target="_blank">
                  Open source page
                </Link>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Bookmarked pages</h2>
          <span className="muted">Pages this profile thought were worth revisiting.</span>
        </div>
        {profile.savedPages.length === 0 ? (
          <p className="muted">No bookmarked pages yet.</p>
        ) : (
          profile.savedPages.map((page) => (
            <article className="stack comment-card interactive" key={page.id}>
              <div className="stack compact">
                <strong>{page.title}</strong>
                <p className="muted">
                  {formatPageKind(page.pageKind)} • {page.host}
                </p>
              </div>
              <div className="link-row">
                <Link className="inline-link" href={`/pages/${page.id}`}>
                  Open Human Layer page
                </Link>
                <Link className="inline-link" href={page.canonicalUrl} rel="noreferrer" target="_blank">
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

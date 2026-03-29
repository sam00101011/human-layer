import Link from "next/link";
import { buildPageContextSummary } from "@human-layer/core";
import { findPageById, getPageThreadSnapshot } from "@human-layer/db";
import { notFound } from "next/navigation";

import { HelpfulButton } from "../../../components/helpful-button";
import { ProfileSafetyActions } from "../../../components/profile-safety-actions";
import { ReportCommentButton } from "../../../components/report-comment-button";
import { getAuthenticatedProfileFromCookies } from "../../lib/auth";

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function getReputationBadgeClass(level: string | undefined) {
  if (!level) return "reputation-badge";
  return `reputation-badge reputation-badge--${level}`;
}

export default async function HumanLayerPage(props: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await props.params;
  const viewer = await getAuthenticatedProfileFromCookies();
  const page = await findPageById(pageId);

  if (!page) {
    notFound();
  }

  const thread = await getPageThreadSnapshot(page.id, viewer?.id);
  const pageContext = buildPageContextSummary({ page, thread });
  const verdictTotal = Object.values(thread.verdictCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Human Layer page</span>
              <span className="trust-badge">Verified takes only</span>
              <span className="eyebrow">{formatPageKind(page.pageKind)} on {page.host}</span>
            </div>
            <h1>{page.title}</h1>
            <p className="muted">{pageContext.summary}</p>
          </div>
          <div className="action-row">
            <Link className="button" href={page.canonicalUrl} rel="noreferrer" target="_blank">
              Open source page
            </Link>
            {thread.topHumanTake ? (
              <Link
                className="button secondary"
                href={`/profiles/${thread.topHumanTake.profileHandle}`}
              >
                Open @{thread.topHumanTake.profileHandle}
              </Link>
            ) : null}
          </div>
        </div>

        {pageContext.tags.length > 0 ? (
          <div className="chip-row">
            {pageContext.tags.map((tag) => (
              <span className="chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="metric-grid">
          <div className="stat-card">
            <strong>{verdictTotal}</strong>
            <span className="muted">Total verdicts</span>
          </div>
          <div className="stat-card">
            <strong>{thread.recentComments.length}</strong>
            <span className="muted">Verified takes</span>
          </div>
          <div className="stat-card">
            <strong>{thread.topHumanTake?.helpfulCount ?? 0}</strong>
            <span className="muted">Helpful votes on top take</span>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Why this page matters</h2>
          <span className="muted">A faster read on what verified humans are noticing here.</span>
        </div>
        <p className="muted">{pageContext.summary}</p>
        <ul className="signal-list">
          {pageContext.whyItMatters.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Top human take</h2>
          <span className="muted">Most useful verified perspective right now.</span>
        </div>
        {thread.topHumanTake ? (
          <article className="stack comment-card">
            <div className="comment-meta">
              <div className="chip-row">
                <span className="trust-badge">Verified take</span>
                {thread.topHumanTake.reputation ? (
                  <span className={getReputationBadgeClass(thread.topHumanTake.reputation.level)}>
                    {thread.topHumanTake.reputation.label}
                  </span>
                ) : null}
                <Link className="inline-link" href={`/profiles/${thread.topHumanTake.profileHandle}`}>
                  @{thread.topHumanTake.profileHandle}
                </Link>
              </div>
              <span className="muted">
                Helpful {thread.topHumanTake.helpfulCount} • {formatDate(thread.topHumanTake.createdAt)}
              </span>
            </div>
            <p>{thread.topHumanTake.body}</p>
            <div className="inline-action-row">
              <HelpfulButton
                commentId={thread.topHumanTake.commentId}
                initialCount={thread.topHumanTake.helpfulCount}
              />
              <ReportCommentButton commentId={thread.topHumanTake.commentId} compact />
              <ProfileSafetyActions
                profileHandle={thread.topHumanTake.profileHandle}
                profileId={thread.topHumanTake.profileId}
                viewerProfileId={viewer?.id}
              />
            </div>
          </article>
        ) : (
          <p className="muted">No top human take yet.</p>
        )}
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Verdicts</h2>
          <span className="muted">How verified humans are reading this page.</span>
        </div>
        <div className="metric-grid">
          {Object.entries(thread.verdictCounts).map(([verdict, count]) => (
            <div className="stat-card" key={verdict}>
              <strong>{count}</strong>
              <span className="muted verdict-label">{formatPageKind(verdict)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Recent verified takes</h2>
          <span className="muted">Fresh contributions from verified profiles.</span>
        </div>
        {thread.recentComments.length === 0 ? (
          <p className="muted">No comments yet.</p>
        ) : (
          thread.recentComments.map((comment) => (
            <article className="stack comment-card" key={comment.commentId}>
              <div className="comment-meta">
                <div className="chip-row">
                  <span className="trust-badge">Verified take</span>
                  {comment.reputation ? (
                    <span className={getReputationBadgeClass(comment.reputation.level)}>
                      {comment.reputation.label}
                    </span>
                  ) : null}
                  <Link className="inline-link" href={`/profiles/${comment.profileHandle}`}>
                    @{comment.profileHandle}
                  </Link>
                </div>
                <span className="muted">
                  Helpful {comment.helpfulCount} • {formatDate(comment.createdAt)}
                </span>
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
            </article>
          ))
        )}
      </section>
    </div>
  );
}

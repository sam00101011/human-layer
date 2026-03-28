import Link from "next/link";
import { findPageById, getPageThreadSnapshot } from "@human-layer/db";
import { notFound } from "next/navigation";

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export default async function HumanLayerPage(props: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await props.params;
  const page = await findPageById(pageId);

  if (!page) {
    notFound();
  }

  const thread = await getPageThreadSnapshot(page.id);
  const verdictTotal = Object.values(thread.verdictCounts).reduce((sum, count) => sum + count, 0);

  return (
    <main className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Human Layer page</span>
              <span className="eyebrow">{formatPageKind(page.pageKind)} on {page.host}</span>
            </div>
            <h1>{page.title}</h1>
            <p className="muted">
              Verified-human context for this page lives here. Read the top take, scan the
              current verdict mix, and jump back to the original source whenever you need the raw page.
            </p>
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

        <div className="metric-grid">
          <div className="stat-card">
            <strong>{verdictTotal}</strong>
            <span className="muted">Total verdicts</span>
          </div>
          <div className="stat-card">
            <strong>{thread.recentComments.length}</strong>
            <span className="muted">Recent comments</span>
          </div>
          <div className="stat-card">
            <strong>{thread.topHumanTake?.helpfulCount ?? 0}</strong>
            <span className="muted">Helpful votes on top take</span>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Top human take</h2>
          <span className="muted">Most useful verified perspective right now.</span>
        </div>
        {thread.topHumanTake ? (
          <article className="stack comment-card">
            <div className="comment-meta">
              <Link className="inline-link" href={`/profiles/${thread.topHumanTake.profileHandle}`}>
                @{thread.topHumanTake.profileHandle}
              </Link>
              <span className="muted">
                Helpful {thread.topHumanTake.helpfulCount} • {formatDate(thread.topHumanTake.createdAt)}
              </span>
            </div>
            <p>{thread.topHumanTake.body}</p>
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
          <h2>Recent comments</h2>
          <span className="muted">Fresh contributions from verified profiles.</span>
        </div>
        {thread.recentComments.length === 0 ? (
          <p className="muted">No comments yet.</p>
        ) : (
          thread.recentComments.map((comment) => (
            <article className="stack comment-card" key={comment.commentId}>
              <div className="comment-meta">
                <Link className="inline-link" href={`/profiles/${comment.profileHandle}`}>
                  @{comment.profileHandle}
                </Link>
                <span className="muted">
                  Helpful {comment.helpfulCount} • {formatDate(comment.createdAt)}
                </span>
              </div>
              <p>{comment.body}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

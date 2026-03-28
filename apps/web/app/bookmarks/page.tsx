import Link from "next/link";
import { getBookmarkedPagesForProfile } from "@human-layer/db";

import { getAuthenticatedProfileFromCookies } from "../lib/auth";

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export default async function BookmarksPage() {
  const viewer = await getAuthenticatedProfileFromCookies();

  if (!viewer) {
    return (
      <div className="page-shell stack">
        <section className="card hero-card stack">
          <span className="pill">Bookmarks</span>
          <h1>Your Human Layer bookmarks</h1>
          <p className="muted">
            Sign in with your verified-human profile to keep a real list of the pages you want to revisit.
          </p>
          <div className="action-row">
            <Link className="button" href="/verify">
              Verify to unlock bookmarks
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const bookmarks = await getBookmarkedPagesForProfile(viewer.id, 100);

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Bookmarks</span>
              <span className="eyebrow">@{viewer.handle}</span>
            </div>
            <h1>Saved pages worth coming back to</h1>
            <p className="muted">
              Bookmarking now has a real home. Keep track of the repos, docs, posts, and pages you want to revisit inside Human Layer.
            </p>
          </div>
          <div className="metric-grid compact-grid">
            <div className="stat-card">
              <strong>{bookmarks.length}</strong>
              <span className="muted">Bookmarked pages</span>
            </div>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Your bookmarks</h2>
          <span className="muted">Newest first, synced to your verified-human profile.</span>
        </div>
        {bookmarks.length === 0 ? (
          <p className="muted">You have not bookmarked any pages yet.</p>
        ) : (
          bookmarks.map((page) => (
            <article className="stack comment-card interactive" key={page.id}>
              <div className="section-header">
                <div className="stack compact">
                  <strong>{page.title}</strong>
                  <p className="muted">
                    {formatPageKind(page.pageKind)} • {page.host} • Saved {formatDate(page.savedAt)}
                  </p>
                </div>
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

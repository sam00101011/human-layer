import Link from "next/link";
import { getProfileSnapshotByHandle } from "@human-layer/db";
import { notFound } from "next/navigation";

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export default async function ProfilePage(props: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await props.params;
  const profile = await getProfileSnapshotByHandle(handle);

  if (!profile) {
    notFound();
  }

  return (
    <main className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Verified human profile</span>
              <span className="eyebrow">Joined {formatDate(profile.createdAt)}</span>
            </div>
            <h1>@{profile.handle}</h1>
            <p className="muted">
              {profile.verifiedHuman
                ? "One-human write access is active for this pseudonymous profile."
                : "This profile is not verified yet."}
            </p>
          </div>
        </div>

        {profile.interestTags.length > 0 ? (
          <div className="chip-row">
            {profile.interestTags.map((interestTag) => (
              <span className="chip" key={interestTag}>
                {interestTag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="metric-grid">
          <div className="stat-card">
            <strong>{profile.counts.comments}</strong>
            <span className="muted">Comments</span>
          </div>
          <div className="stat-card">
            <strong>{profile.counts.saves}</strong>
            <span className="muted">Saved pages</span>
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

      <section className="card stack">
        <div className="section-header">
          <h2>Recent comments</h2>
          <span className="muted">What this profile has been adding lately.</span>
        </div>
        {profile.recentComments.length === 0 ? (
          <p className="muted">No comments yet.</p>
        ) : (
          profile.recentComments.map((comment) => (
            <article className="stack comment-card" key={comment.commentId}>
              <div className="stack compact">
                <strong>{comment.pageTitle}</strong>
                <p className="muted">
                  {formatPageKind(comment.pageKind)} • Helpful {comment.helpfulCount} • {formatDate(comment.createdAt)}
                </p>
              </div>
              <p>{comment.body}</p>
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
          <h2>Saved pages</h2>
          <span className="muted">Pages this profile wanted to come back to.</span>
        </div>
        {profile.savedPages.length === 0 ? (
          <p className="muted">No saved pages yet.</p>
        ) : (
          profile.savedPages.map((page) => (
            <article className="stack comment-card" key={page.id}>
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
    </main>
  );
}

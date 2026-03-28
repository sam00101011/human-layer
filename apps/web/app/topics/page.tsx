import Link from "next/link";
import {
  FEATURED_TOPIC_TAGS,
  getInterestGroupForTag,
  getInterestTagDescription,
  getInterestTagLabel,
  getRelatedInterestTags
} from "@human-layer/core";

export default function TopicsIndexPage() {
  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="chip-row">
          <span className="pill">Topics</span>
          <span className="trust-badge">Human graph</span>
        </div>
        <div className="stack compact">
          <h1>Browse the graph by topic instead of by website</h1>
          <p className="muted">
            Human Layer can now cluster pages, takes, and contributors around recurring interests
            like AI, Devtools, Growth, Security, Design, and Infra. Each topic surface pulls
            together trending pages, strong verified takes, and the contributors shaping that area.
          </p>
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Featured topics</h2>
          <span className="muted">Start with the highest-signal clusters in the beta graph.</span>
        </div>
        <div className="topic-grid">
          {FEATURED_TOPIC_TAGS.map((topic) => {
            const group = getInterestGroupForTag(topic);
            const related = getRelatedInterestTags([topic], 4);

            return (
              <article className="topic-card" key={topic}>
                <div className="chip-row">
                  <span className="trust-badge">Topic</span>
                  {group ? <span className="pill soft-pill">{group.label}</span> : null}
                </div>
                <strong>{getInterestTagLabel(topic)}</strong>
                <p className="muted">{getInterestTagDescription(topic)}</p>
                <div className="chip-row">
                  {related.map((tag) => (
                    <Link className="chip" href={`/topics/${tag}`} key={tag}>
                      {getInterestTagLabel(tag)}
                    </Link>
                  ))}
                </div>
                <div className="action-row">
                  <Link className="button secondary subtle" href={`/topics/${topic}`}>
                    Open topic surface
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

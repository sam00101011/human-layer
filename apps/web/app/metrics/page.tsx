import Link from "next/link";
import { getPublicMetricsSnapshot } from "@human-layer/db";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

export default async function MetricsPage() {
  const metrics = await getPublicMetricsSnapshot();

  const headlineMetrics = [
    {
      label: "Verified users",
      value: metrics.totalVerifiedUsers,
      description: "Profiles that completed Human Layer verification."
    },
    {
      label: "Visible comments",
      value: metrics.totalComments,
      description: "Public takes that are currently live on the graph."
    },
    {
      label: "Tracked pages",
      value: metrics.totalPages,
      description: "Canonical pages normalized and stored across supported websites."
    },
    {
      label: "Bookmarks",
      value: metrics.totalBookmarks,
      description: "Pages people decided were worth coming back to."
    }
  ];

  const graphMetrics = [
    {
      label: "Helpful votes",
      value: metrics.totalHelpfulVotes,
      description: "Signals used to surface the strongest takes."
    },
    {
      label: "Profile follows",
      value: metrics.totalProfileFollows,
      description: "Direct follow edges between people in the graph."
    },
    {
      label: "Topic follows",
      value: metrics.totalTopicFollows,
      description: "Topic subscriptions powering notifications and feeds."
    },
    {
      label: "Verdicts",
      value: metrics.totalVerdicts,
      description: "Explicit judgments on whether a page is worth trusting."
    }
  ];

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="chip-row">
          <span className="pill">Metrics</span>
          <span className="trust-badge">Public graph snapshot</span>
        </div>
        <div className="stack compact">
          <h1>Human Layer by the numbers</h1>
          <p className="muted">
            A simple public snapshot of verified humans, comments, pages, bookmarks, and the
            follow graph behind Human Layer.
          </p>
        </div>
        <div className="metric-grid">
          {headlineMetrics.map((metric) => (
            <article className="stat-card" key={metric.label}>
              <strong>{formatNumber(metric.value)}</strong>
              <span>{metric.label}</span>
              <span className="muted">{metric.description}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Graph activity</h2>
          <span className="muted">The interaction layer sitting on top of tracked pages.</span>
        </div>
        <div className="metric-grid">
          {graphMetrics.map((metric) => (
            <article className="stat-card" key={metric.label}>
              <strong>{formatNumber(metric.value)}</strong>
              <span>{metric.label}</span>
              <span className="muted">{metric.description}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Most tracked surfaces</h2>
          <span className="muted">Where the graph currently has the most canonical pages.</span>
        </div>
        <div className="trust-grid">
          {metrics.pageKindBreakdown.map((entry) => (
            <article className="trust-card" key={entry.pageKind}>
              <span className="eyebrow">{formatPageKind(entry.pageKind)}</span>
              <strong>{formatNumber(entry.count)} pages</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Most tracked hosts</h2>
          <span className="muted">The domains with the most stored pages so far.</span>
        </div>
        <div className="trust-grid">
          {metrics.hostBreakdown.map((entry) => (
            <article className="trust-card" key={entry.host}>
              <span className="eyebrow">{entry.host}</span>
              <strong>{formatNumber(entry.count)} pages</strong>
            </article>
          ))}
        </div>
        <p className="muted">
          Want another site or plugin in the graph?{" "}
          <Link className="inline-link" href="/integrations">
            Propose an integration on GitHub
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

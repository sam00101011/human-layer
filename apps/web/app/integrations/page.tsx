import Link from "next/link";

const githubRepoUrl = "https://github.com/sam00101011/human-layer";
const githubForkUrl = "https://github.com/sam00101011/human-layer/fork";
const githubPullsUrl = "https://github.com/sam00101011/human-layer/pulls";
const githubIssueUrl =
  "https://github.com/sam00101011/human-layer/issues/new?template=integration-request.yml";
const githubTemplateUrl =
  "https://github.com/sam00101011/human-layer/blob/main/.github/PULL_REQUEST_TEMPLATE/integration-proposal.md";
const githubGuideUrl =
  "https://github.com/sam00101011/human-layer/blob/main/INTEGRATION-CONTRIBUTING.md";

export default function IntegrationsPage() {
  return (
    <div className="page-shell stack legal-shell">
      <span className="pill">Propose an integration</span>

      <section className="card hero-card stack">
        <div className="chip-row">
          <span className="trust-badge">GitHub PR flow</span>
          <span className="trust-badge">Docs-only proposals welcome</span>
        </div>
        <h1>Help Human Layer support more sites, plugins, and integrations</h1>
        <p className="muted">
          The easiest way to propose a new integration is to open a pull request on GitHub.
          You do not need to ship full code to help. A docs-only PR with the site, page shape,
          why Human Layer adds value there, and any edge cases is enough for review.
        </p>
        <div className="chip-row">
          <a className="button" href={githubForkUrl} rel="noreferrer" target="_blank">
            Fork and start a PR
          </a>
          <a className="button secondary" href={githubIssueUrl} rel="noreferrer" target="_blank">
            Request via GitHub issue
          </a>
          <a className="button secondary" href={githubTemplateUrl} rel="noreferrer" target="_blank">
            Open PR template
          </a>
          <a className="button secondary" href={githubPullsUrl} rel="noreferrer" target="_blank">
            View open PRs
          </a>
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Fastest path</h2>
          <span className="muted">A lightweight proposal flow that still lands as a real PR.</span>
        </div>
        <ol className="legal-list">
          <li>Fork the GitHub repo.</li>
          <li>Create a branch for your proposal or integration work.</li>
          <li>Use the dedicated integration PR template.</li>
          <li>Open a PR, even if it only adds docs and example URLs.</li>
        </ol>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Not coding? Use the request board</h2>
          <span className="muted">A lighter path for people who want to suggest a site without opening a PR.</span>
        </div>
        <p className="muted">
          Open the GitHub issue form if you just want to propose a new site, marketplace, or page
          shape. We track active requests on the public board so people can see what is requested,
          under review, already building, or live.
        </p>
        <div className="chip-row">
          <a className="button secondary" href={githubIssueUrl} rel="noreferrer" target="_blank">
            Open issue form
          </a>
          <Link className="button secondary" href="/requested-integrations">
            View request board
          </Link>
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>What to include</h2>
          <span className="muted">Enough context for someone else to review or implement quickly.</span>
        </div>
        <ul className="legal-list">
          <li>The website, plugin surface, or integration you want supported.</li>
          <li>The exact page types or URL patterns that should work.</li>
          <li>Why Human Layer adds value there beyond generic comments.</li>
          <li>Any page-level signals you want, like upgrade warnings, install trust, or timestamps.</li>
          <li>Two or three real example URLs.</li>
        </ul>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Good proposal ideas</h2>
          <span className="muted">High-signal pages where verified human context changes decisions.</span>
        </div>
        <div className="chip-row">
          <span className="chip">new website support</span>
          <span className="chip">plugin marketplace</span>
          <span className="chip">docs integration</span>
          <span className="chip">video timestamps</span>
          <span className="chip">podcast highlights</span>
          <span className="chip">trust signals</span>
          <span className="chip">ranking lens</span>
          <span className="chip">extension quick action</span>
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Useful links</h2>
          <span className="muted">Everything needed to turn an idea into a GitHub PR.</span>
        </div>
        <div className="chip-row">
          <a className="button secondary" href={githubRepoUrl} rel="noreferrer" target="_blank">
            Open repository
          </a>
          <a className="button secondary" href={githubGuideUrl} rel="noreferrer" target="_blank">
            Open integration guide
          </a>
          <Link className="button secondary" href="/requested-integrations">
            Request board
          </Link>
          <Link className="button secondary" href="/support">
            Support
          </Link>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";

import {
  integrationRequests,
  integrationRequestStatusCopy,
  type IntegrationRequestStatus
} from "./data";

const issueFormUrl =
  "https://github.com/sam00101011/human-layer/issues/new?template=integration-request.yml";

function getStatusClass(status: IntegrationRequestStatus) {
  if (status === "live") return "trust-badge";
  if (status === "building") return "pill";
  if (status === "reviewing") return "trust-badge soft";
  return "chip";
}

export default function RequestedIntegrationsPage() {
  const statusEntries = Object.entries(integrationRequestStatusCopy) as Array<
    [IntegrationRequestStatus, { label: string; description: string }]
  >;

  return (
    <div className="page-shell stack legal-shell">
      <span className="pill">Request board</span>

      <section className="card hero-card stack">
        <div className="chip-row">
          <span className="trust-badge">Public status board</span>
          <span className="trust-badge">GitHub issue intake</span>
        </div>
        <h1>Requested integrations and plugin surfaces</h1>
        <p className="muted">
          This is the lightweight public board for new site and plugin requests. Non-coders can use
          the GitHub issue form, and builders can still turn the same request into a PR later.
        </p>
        <div className="chip-row">
          <a className="button" href={issueFormUrl} rel="noreferrer" target="_blank">
            Request a new integration
          </a>
          <Link className="button secondary" href="/integrations">
            Open PR path
          </Link>
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Status meanings</h2>
          <span className="muted">A simple pipeline from request to live support.</span>
        </div>
        <div className="trust-grid">
          {statusEntries.map(([status, copy]) => (
            <article className="trust-card" key={status}>
              <span className={getStatusClass(status)}>{copy.label}</span>
              <p className="muted">{copy.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Current board</h2>
          <span className="muted">Manually maintained for now while GitHub issues drive intake.</span>
        </div>
        <div className="topic-grid">
          {integrationRequests.map((request) => (
            <article className="topic-card" key={request.name}>
              <div className="chip-row">
                <span className={getStatusClass(request.status)}>
                  {integrationRequestStatusCopy[request.status].label}
                </span>
                <span className="chip">{request.type}</span>
              </div>
              <strong>{request.name}</strong>
              <p className="muted">{request.value}</p>
              <p className="muted small-copy">{request.note}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

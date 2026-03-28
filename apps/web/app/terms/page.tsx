export default function TermsPage() {
  return (
    <div className="page-shell stack legal-shell">
      <span className="pill">Terms</span>

      <section className="card stack">
        <h1>Human Layer Terms of Use</h1>
        <p className="muted">
          These terms govern access to the Human Layer web app, browser extension, and private beta.
        </p>
      </section>

      <section className="card stack">
        <h2>Use of the Service</h2>
        <ul className="legal-list">
          <li>You may use Human Layer only in compliance with applicable law.</li>
          <li>
            You are responsible for the comments, verdicts, handles, and other content you publish
            through Human Layer.
          </li>
          <li>
            You may not attempt to bypass the one-human verification flow, abuse the beta, or
            interfere with the service.
          </li>
        </ul>
      </section>

      <section className="card stack">
        <h2>Beta Status</h2>
        <p className="muted">
          Human Layer is a beta product. Features may change, break, or be removed. Access may be
          limited, suspended, or revoked while we operate the private beta.
        </p>
      </section>

      <section className="card stack">
        <h2>Public Content</h2>
        <p className="muted">
          Handles, comments, verdicts, and other public-facing profile content may be visible to
          other Human Layer users. Do not publish information you expect to remain private.
        </p>
      </section>

      <section className="card stack">
        <h2>Disclaimer</h2>
        <p className="muted">
          Human Layer is provided on an “as is” and “as available” basis during beta. We make no
          guarantee that the service will be uninterrupted, error-free, or fit for a specific
          purpose.
        </p>
      </section>
    </div>
  );
}

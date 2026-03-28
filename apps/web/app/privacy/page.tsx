export default function PrivacyPage() {
  return (
    <main className="page-shell stack legal-shell">
      <span className="pill">Privacy</span>

      <section className="card stack">
        <h1>Human Layer Privacy Policy</h1>
        <p className="muted">
          Human Layer is a verified-human context layer for the web. This policy explains what we
          collect in the web app and extension beta, why we collect it, and how we limit it.
        </p>
      </section>

      <section className="card stack">
        <h2>What We Collect</h2>
        <ul className="legal-list">
          <li>
            Verified profile data such as your handle, selected interest tags, verification level,
            and pseudonymous World ID nullifier.
          </li>
          <li>
            Page interactions such as comments, verdicts, saves, and follows that you create inside
            Human Layer.
          </li>
          <li>
            Basic operational telemetry such as error logs, request IDs, and product analytics used
            to keep the beta stable.
          </li>
          <li>
            Extension-local storage needed for authentication handoff and overlay state.
          </li>
        </ul>
      </section>

      <section className="card stack">
        <h2>What We Do Not Collect</h2>
        <ul className="legal-list">
          <li>We do not read the contents of your passwords, private messages, or payment data.</li>
          <li>
            We do not receive your full World App account data. We only receive the verification
            proof and the pseudonymous nullifier needed to enforce one-human access.
          </li>
          <li>
            We do not publish your browsing history. The extension looks up supported pages only to
            render Human Layer context on those pages.
          </li>
        </ul>
      </section>

      <section className="card stack">
        <h2>How We Use Data</h2>
        <ul className="legal-list">
          <li>To verify one-human write access and prevent duplicate abuse.</li>
          <li>To show public page-level context such as verdicts, comments, and profiles.</li>
          <li>To operate, debug, and improve the beta experience.</li>
        </ul>
      </section>

      <section className="card stack">
        <h2>Third-Party Services</h2>
        <p className="muted">
          Human Layer currently depends on World ID for verification, Vercel for hosting, Neon for
          Postgres, Upstash for Redis, Sentry for error monitoring, and PostHog for product
          analytics. Those providers may process limited technical metadata as part of operating the
          service.
        </p>
      </section>

      <section className="card stack">
        <h2>Beta Notice</h2>
        <p className="muted">
          Human Layer is currently in beta. Data handling and product surfaces may change as we
          improve the service. Material policy changes will be reflected on this page.
        </p>
      </section>
    </main>
  );
}

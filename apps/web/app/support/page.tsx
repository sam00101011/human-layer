import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="page-shell stack legal-shell">
      <span className="pill">Support</span>

      <section className="card stack">
        <h1>Human Layer Support</h1>
        <p className="muted">
          The fastest way to get help during the beta is to include the page URL, what you were
          trying to do, and any visible error message or request ID.
        </p>
      </section>

      <section className="card stack">
        <h2>Beta Support Checklist</h2>
        <ul className="legal-list">
          <li>The page URL where the issue happened.</li>
          <li>Whether you were using the web app or the extension.</li>
          <li>The visible error text, if any.</li>
          <li>A screenshot or screen recording if the issue is visual.</li>
        </ul>
      </section>

      <section className="card stack">
        <h2>Useful Links</h2>
        <div className="chip-row">
          <Link className="button" href="/verify">
            Open verification
          </Link>
          <Link className="button secondary" href="/privacy">
            Privacy policy
          </Link>
          <Link className="button secondary" href="/terms">
            Terms of use
          </Link>
        </div>
      </section>

      <section className="card stack">
        <h2>Private Beta Note</h2>
        <p className="muted">
          If you are preparing a Chrome Web Store submission, use this page as the support URL and
          the privacy page as the privacy-policy URL until you move to a custom domain.
        </p>
      </section>
    </main>
  );
}

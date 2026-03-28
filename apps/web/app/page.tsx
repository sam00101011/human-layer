import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell stack">
      <span className="pill">Private beta is live</span>

      <section className="card stack">
        <h1>Verified-human context for the pages people already use</h1>
        <p className="muted">
          Human Layer adds pseudonymous verified-human context to supported pages on GitHub and
          Hacker News. The web app powers onboarding, profiles, page routes, and the extension
          handoff flow.
        </p>
        <ul>
          <li>
            Page lookup API: <span className="mono">/api/pages/lookup?url=...</span>
          </li>
          <li>
            Verification: <span className="mono">/verify</span>
          </li>
          <li>
            Extension handoff: <span className="mono">/auth/extension-handoff</span>
          </li>
        </ul>
      </section>

      <section className="card stack">
        <h2>Suggested first run</h2>
        <ol>
          <li>Open the verification flow and create a pseudonymous verified-human profile.</li>
          <li>Load the extension and visit a supported GitHub or Hacker News page.</li>
          <li>Open the page route, inspect the top human take, and test the profile links.</li>
          <li>Try a comment, verdict, save, or follow action after verification.</li>
        </ol>
        <div className="chip-row">
          <Link className="button" href="/verify">
            Open verification
          </Link>
          <Link className="button secondary" href="/support">
            Beta support
          </Link>
          <Link className="button secondary" href="/privacy">
            Privacy policy
          </Link>
        </div>
      </section>

      <section className="card stack">
        <h2>Store and beta links</h2>
        <ul>
          <li>
            Privacy policy: <span className="mono">/privacy</span>
          </li>
          <li>
            Terms of use: <span className="mono">/terms</span>
          </li>
          <li>
            Support page: <span className="mono">/support</span>
          </li>
        </ul>
        <div className="chip-row">
          <Link className="button secondary" href="/terms">
            Terms
          </Link>
          <Link className="button secondary" href="/dev-login">
            Open dev login fallback
          </Link>
        </div>
      </section>
    </main>
  );
}

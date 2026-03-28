import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell stack">
      <span className="pill">Verification is live</span>

      <section className="card stack">
        <h1>Human Layer web app</h1>
        <p className="muted">
          This app now includes the Phase 1 verified-human onboarding flow, profile creation, and
          extension handoff used by the browser extension.
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
          <li>Start Postgres and Redis with docker compose.</li>
          <li>Run the database migration and seed scripts.</li>
          <li>Open the verification flow and create a pseudonymous profile.</li>
          <li>Open GitHub or a seeded Hacker News page to exercise verified write actions.</li>
        </ol>
        <div className="chip-row">
          <Link className="button" href="/verify">
            Open verification
          </Link>
          <Link className="button secondary" href="/dev-login">
            Open dev login fallback
          </Link>
        </div>
      </section>
    </main>
  );
}

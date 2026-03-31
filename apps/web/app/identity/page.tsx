import { getAtprotoAccountSnapshot } from "@human-layer/db";
import { redirect } from "next/navigation";

import { AtprotoIdentityPanel } from "../../components/atproto-identity-panel";
import { getAuthenticatedProfileFromCookies } from "../lib/auth";

export default async function IdentityPage() {
  const viewer = await getAuthenticatedProfileFromCookies();
  if (!viewer) {
    redirect("/verify?returnUrl=/identity");
  }

  const identity = await getAtprotoAccountSnapshot(viewer.id);

  return (
    <div className="page-shell stack">
      <AtprotoIdentityPanel initialIdentity={identity} />

      <section className="card stack">
        <div className="section-header">
          <h2>What this unlocks</h2>
          <span className="muted">The next layers we will hang off this identity.</span>
        </div>
        <div className="trust-grid">
          <article className="trust-card">
            <span className="trust-badge">Portable follows</span>
            <p>Human Layer can mirror follows and trusted-people lists into a public graph instead of keeping them app-local forever.</p>
          </article>
          <article className="trust-card">
            <span className="trust-badge">Starter packs</span>
            <p>Interests like AI, music, gaming, and security can become shareable starter packs for verified humans.</p>
          </article>
          <article className="trust-card">
            <span className="trust-badge">Feed distribution</span>
            <p>Human-only feeds can eventually flow through AT Protocol instead of staying trapped in one product surface.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

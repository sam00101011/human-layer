import { getModerationAuditHistory, getModerationQueue } from "@human-layer/db";

import { ModerationAuditLog } from "../../components/moderation-audit-log";
import { ModerationQueue } from "../../components/moderation-queue";
import { getAuthenticatedProfileFromCookies, isAdminProfile } from "../lib/auth";

export default async function ModerationPage() {
  const viewer = await getAuthenticatedProfileFromCookies();

  if (!viewer) {
    return (
      <div className="page-shell stack">
        <section className="card hero-card stack">
          <span className="pill">Moderation</span>
          <h1>Admin review is locked</h1>
          <p className="muted">Sign in with an approved admin profile to review reported comments.</p>
        </section>
      </div>
    );
  }

  if (!isAdminProfile(viewer)) {
    return (
      <div className="page-shell stack">
        <section className="card hero-card stack">
          <span className="pill">Moderation</span>
          <h1>Access restricted</h1>
          <p className="muted">
            This queue is only available to handles listed in <span className="mono">ADMIN_REVIEW_HANDLES</span>.
          </p>
        </section>
      </div>
    );
  }

  const [items, audit] = await Promise.all([getModerationQueue(100), getModerationAuditHistory(25)]);
  const repeatOffenderCount = new Set(
    items.filter((item) => item.repeatOffender).map((item) => item.authorProfileId)
  ).size;
  const blockedAuthorCount = new Set(
    items.filter((item) => item.authorBlockedAt).map((item) => item.authorProfileId)
  ).size;

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Moderation</span>
              <span className="eyebrow">@{viewer.handle}</span>
            </div>
            <h1>Review reports and hide abuse</h1>
            <p className="muted">
              Reported comments land here for lightweight triage. Hide abusive comments, dismiss false positives, and restore mistakes without touching the database directly.
            </p>
          </div>
          <div className="metric-grid compact-grid">
            <div className="stat-card">
              <strong>{items.filter((item) => item.status === "open").length}</strong>
              <span className="muted">Open reports</span>
            </div>
            <div className="stat-card">
              <strong>{repeatOffenderCount}</strong>
              <span className="muted">Repeat-offender risk</span>
            </div>
            <div className="stat-card">
              <strong>{blockedAuthorCount}</strong>
              <span className="muted">Blocked authors in queue</span>
            </div>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Moderation queue</h2>
          <span className="muted">Recent reports across Human Layer pages.</span>
        </div>
        <ModerationQueue items={items} />
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Audit history</h2>
          <span className="muted">Recent admin actions, notes, and escalation history.</span>
        </div>
        <ModerationAuditLog items={audit} />
      </section>
    </div>
  );
}

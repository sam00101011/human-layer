"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import type { AtprotoAccountSnapshot } from "@human-layer/db";

type AtprotoIdentityPanelProps = {
  initialIdentity: AtprotoAccountSnapshot | null;
  compact?: boolean;
};

function getStatusLabel(status: string | undefined) {
  if (status === "live") return "Live";
  if (status === "provisioned") return "Provisioned";
  if (status === "errored") return "Needs attention";
  return "Reserved";
}

export function AtprotoIdentityPanel({
  initialIdentity,
  compact = false
}: AtprotoIdentityPanelProps) {
  const [identity, setIdentity] = useState(initialIdentity);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "provisioning" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleProvision() {
    if (status !== "idle") return;

    setStatus("provisioning");
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/atproto/provision", {
      method: "POST"
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not reach the AT Protocol provisioning route.");
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          identity?: AtprotoAccountSnapshot | null;
        }
      | null;

    if (!response.ok || !payload?.identity) {
      setStatus("idle");
      setError(payload?.error ?? "Could not finish AT Protocol setup.");
      return;
    }

    setIdentity(payload.identity);
    setStatus("idle");
    setSuccess("AT Protocol identity is ready.");
  }

  async function handleTogglePublicPosting(nextValue: boolean) {
    if (status !== "idle") return;

    setStatus("saving");
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/atproto", {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        publicPostingEnabled: nextValue
      })
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not save your AT Protocol settings.");
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          identity?: AtprotoAccountSnapshot | null;
        }
      | null;

    if (!response.ok || !payload?.identity) {
      setStatus("idle");
      setError(payload?.error ?? "Could not save your AT Protocol settings.");
      return;
    }

    setIdentity(payload.identity);
    setStatus("idle");
    setSuccess(nextValue ? "Public posting enabled." : "Public posting disabled.");
  }

  const canProvision = identity ? identity.status === "reserved" || identity.status === "errored" : false;
  const title = compact ? "AT Protocol identity" : "Human Layer AT Protocol identity";

  return (
    <section className={compact ? "card stack" : "card hero-card stack"}>
      <div className="section-header">
        <div className="stack compact">
          <div className="chip-row">
            <span className="pill">AT Protocol</span>
            {identity ? <span className="trust-badge soft">{getStatusLabel(identity.status)}</span> : null}
            {identity?.publicPostingEnabled ? <span className="trust-badge">Public posting on</span> : null}
          </div>
          <h2>{title}</h2>
          <p className="muted">
            Human Layer reserves an identity at verification, then lets you finish setup when you are ready.
            This is where portable follows, starter packs, and future feed distribution will live.
          </p>
        </div>
        <div className="stack compact" style={{ alignItems: "flex-end" }}>
          <button
            aria-label={open ? "Hide identity settings" : "Show identity settings"}
            className="icon-button"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <Settings2 aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {identity ? (
        <div className="wallet-meta-grid">
          <div className="wallet-meta-card">
            <span className="muted small-copy">AT handle</span>
            <strong>@{identity.handle}</strong>
          </div>
          <div className="wallet-meta-card">
            <span className="muted small-copy">DID</span>
            <code>{identity.did}</code>
          </div>
          <div className="wallet-meta-card">
            <span className="muted small-copy">Managed PDS</span>
            <strong>{identity.pdsUrl.replace(/^https?:\/\//, "")}</strong>
          </div>
          <div className="wallet-meta-card">
            <span className="muted small-copy">Posting</span>
            <strong>{identity.publicPostingEnabled ? "Opted in" : "Private by default"}</strong>
          </div>
        </div>
      ) : (
        <p className="muted">
          Finish verification first and Human Layer will reserve an AT Protocol identity for this profile.
        </p>
      )}

      <div className="action-row">
        {canProvision ? (
          <button className="button" disabled={status !== "idle"} onClick={() => void handleProvision()} type="button">
            {status === "provisioning" ? "Finishing setup…" : "Finish AT Protocol setup"}
          </button>
        ) : null}
        <Link className="button secondary subtle" href="/identity">
          Open identity page
        </Link>
      </div>

      {open ? (
        <div className="settings-panel stack">
          <div className="section-header tight">
            <h2>Identity settings</h2>
            <span className="muted small-copy">Keep public posting off until you explicitly want it.</span>
          </div>
          <label className="toggle-card">
            <input
              checked={Boolean(identity?.publicPostingEnabled)}
              disabled={!identity || status !== "idle" || canProvision}
              onChange={(event) => void handleTogglePublicPosting(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Allow public posting</strong>
              <span className="muted">
                This keeps the account managed by Human Layer but lets you opt into public AT Protocol posting later.
              </span>
            </span>
          </label>
          {canProvision ? (
            <p className="muted small-copy">
              Finish setup first before changing publishing settings.
            </p>
          ) : null}
        </div>
      ) : null}

      {success ? <span className="success-message">{success}</span> : null}
      {error ? <span className="error-message">{error}</span> : null}
    </section>
  );
}

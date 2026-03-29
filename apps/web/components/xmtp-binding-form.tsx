"use client";

import { useState } from "react";

type XmtpBindingFormProps = {
  initialInboxId?: string | null;
};

export function XmtpBindingForm({ initialInboxId = "" }: XmtpBindingFormProps) {
  const [inboxId, setInboxId] = useState(initialInboxId);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (status === "saving") {
      return;
    }

    setStatus("saving");
    setError(null);

    const response = await fetch("/api/messages/bind", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        inboxId
      })
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not reach the XMTP binding route.");
      return;
    }

    if (response.status === 401) {
      window.location.href = "/verify?returnUrl=" + encodeURIComponent(window.location.href);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not link your XMTP inbox.");
      return;
    }

    setStatus("saved");
    window.location.reload();
  }

  return (
    <div className="stack">
      <label className="stack compact">
        <span className="muted small-copy">XMTP inbox ID</span>
        <input
          className="input-field"
          onChange={(event) => setInboxId(event.target.value)}
          placeholder="xmtp-inbox-id"
          value={inboxId}
        />
      </label>
      <p className="muted">
        Human Layer stores your XMTP inbox binding and verified-human request metadata, but not your chat
        contents or private keys.
      </p>
      <div className="action-row">
        <button className="button" disabled={status === "saving"} onClick={() => void handleSave()} type="button">
          {status === "saving" ? "Saving..." : initialInboxId ? "Update XMTP inbox" : "Link XMTP inbox"}
        </button>
      </div>
      {error ? <span className="error-message">{error}</span> : null}
      {status === "saved" ? <span className="success-message">XMTP inbox linked.</span> : null}
    </div>
  );
}

"use client";

import { useState } from "react";

type MessageRequestActionsProps = {
  requestId: string;
};

export function MessageRequestActions({ requestId }: MessageRequestActionsProps) {
  const [status, setStatus] = useState<"idle" | "accepting" | "ignoring">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "accept" | "ignore") {
    if (status !== "idle") {
      return;
    }

    setStatus(action === "accept" ? "accepting" : "ignoring");
    setError(null);

    const response = await fetch(`/api/messages/requests/${requestId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action
      })
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not reach the message request route.");
      return;
    }

    if (response.status === 401) {
      window.location.href = "/verify?returnUrl=" + encodeURIComponent(window.location.href);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not update the request.");
      return;
    }

    window.location.reload();
  }

  return (
    <div className="stack compact">
      <div className="inline-action-row">
        <button
          className="button secondary subtle"
          disabled={status !== "idle"}
          onClick={() => void handleAction("accept")}
          type="button"
        >
          {status === "accepting" ? "Accepting..." : "Accept"}
        </button>
        <button
          className="button secondary subtle"
          disabled={status !== "idle"}
          onClick={() => void handleAction("ignore")}
          type="button"
        >
          {status === "ignoring" ? "Ignoring..." : "Ignore"}
        </button>
      </div>
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

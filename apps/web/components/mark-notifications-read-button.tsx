"use client";

import { useState } from "react";

export function MarkNotificationsReadButton() {
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleMarkAllRead() {
    if (status !== "idle") {
      return;
    }

    setStatus("submitting");
    setError(null);

    const response = await fetch("/api/notifications/read", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ markAll: true })
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not mark notifications as read.");
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not mark notifications as read.");
      return;
    }

    setStatus("done");
    window.location.reload();
  }

  return (
    <div className="stack compact">
      <button
        className="button secondary subtle"
        disabled={status !== "idle"}
        onClick={() => {
          void handleMarkAllRead();
        }}
        type="button"
      >
        {status === "submitting" ? "Marking..." : "Mark all as read"}
      </button>
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

"use client";

import { useState } from "react";

type HelpfulButtonProps = {
  commentId: string;
  initialCount: number;
};

export function HelpfulButton({ commentId, initialCount }: HelpfulButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleHelpful() {
    if (status !== "idle") {
      return;
    }

    setStatus("submitting");
    setError(null);

    const response = await fetch(`/api/comments/${commentId}/helpful`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      }
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not save the helpful vote.");
      return;
    }

    if (response.status === 401) {
      window.location.href = `/verify?returnUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not save the helpful vote.");
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | { helpfulCount?: number; created?: boolean }
      | null;

    setCount(payload?.helpfulCount ?? count);
    setStatus("done");
  }

  return (
    <div className="stack compact">
      <button
        className="inline-action"
        disabled={status !== "idle"}
        onClick={() => {
          void handleHelpful();
        }}
        type="button"
      >
        {status === "submitting"
          ? "Saving..."
          : status === "done"
            ? `Helpful added • ${count}`
            : `Helpful • ${count}`}
      </button>
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

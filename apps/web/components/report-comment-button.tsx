"use client";

import { useState } from "react";

type ReportCommentButtonProps = {
  commentId: string;
  compact?: boolean;
};

export function ReportCommentButton({ commentId, compact = false }: ReportCommentButtonProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "reported">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleReport() {
    if (status === "submitting" || status === "reported") {
      return;
    }

    setStatus("submitting");
    setError(null);

    const response = await fetch(`/api/comments/${commentId}/report`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        reasonCode: "needs_review"
      })
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not send the report right now.");
      return;
    }

    if (response.status === 401) {
      window.location.href = `/verify?returnUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not send the report right now.");
      return;
    }

    setStatus("reported");
  }

  return (
    <div className="stack compact">
      <button
        className={compact ? "inline-action danger" : "button secondary subtle"}
        disabled={status !== "idle"}
        onClick={() => {
          void handleReport();
        }}
        type="button"
      >
        {status === "reported" ? "Reported" : status === "submitting" ? "Reporting..." : "Report"}
      </button>
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

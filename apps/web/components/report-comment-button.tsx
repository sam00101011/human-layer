"use client";

import { getCommentReportReasonOptions, type CommentReportReasonCode } from "@human-layer/core";
import { useState } from "react";

type ReportCommentButtonProps = {
  commentId: string;
  compact?: boolean;
};

export function ReportCommentButton({ commentId, compact = false }: ReportCommentButtonProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "reported">("idle");
  const [expanded, setExpanded] = useState(false);
  const [reasonCode, setReasonCode] = useState<CommentReportReasonCode>("spam");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const options = getCommentReportReasonOptions();

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
        reasonCode,
        details: details.trim() || undefined
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
    setExpanded(false);
  }

  return (
    <div className="stack compact">
      <div className="inline-action-row">
        <button
          className={compact ? "inline-action danger" : "button secondary subtle"}
          disabled={status === "submitting" || status === "reported"}
          onClick={() => {
            setExpanded((current) => !current);
          }}
          type="button"
        >
          {status === "reported" ? "Reported" : expanded ? "Cancel report" : "Report"}
        </button>
      </div>
      {expanded && status !== "reported" ? (
        <div className="stack compact">
          <label className="stack compact">
            <span className="muted small-copy">Category</span>
            <select
              className="input-field"
              onChange={(event) => {
                setReasonCode(event.target.value as CommentReportReasonCode);
              }}
              value={reasonCode}
            >
              {options.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="muted small-copy">
            {options.find((option) => option.code === reasonCode)?.description}
          </p>
          <label className="stack compact">
            <span className="muted small-copy">Optional note for moderators</span>
            <textarea
              className="input-field"
              onChange={(event) => {
                setDetails(event.target.value);
              }}
              placeholder="Add context if it will help a reviewer."
              rows={3}
              value={details}
            />
          </label>
          <button
            className={compact ? "button secondary subtle" : "button secondary"}
            disabled={status === "submitting"}
            onClick={() => {
              void handleReport();
            }}
            type="button"
          >
            {status === "submitting" ? "Reporting..." : "Send report"}
          </button>
        </div>
      ) : null}
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

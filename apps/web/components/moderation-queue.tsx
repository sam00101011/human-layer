"use client";

import { getCommentReportReasonLabel, type CommentReportReasonCode } from "@human-layer/core";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ModerationQueueItem = {
  reportId: string;
  status: string;
  reasonCode: string;
  details: string | null;
  createdAt: string;
  reviewedAt: string | null;
  commentId: string;
  commentBody: string;
  commentCreatedAt: string;
  commentHidden: boolean;
  commentReasonCode: string | null;
  authorProfileId: string;
  authorHandle: string;
  reporterProfileId: string;
  reporterHandle: string;
  pageId: string;
  pageKind: string;
  pageTitle: string;
  pageHost: string;
  pageCanonicalUrl: string;
  authorReportCount: number;
  authorOpenReportCount: number;
  authorHiddenCommentCount: number;
  authorBlockedAt: string | null;
  repeatOffender: boolean;
  priorityLabel: "low" | "standard" | "high" | "urgent";
  priorityScore: number;
  priorityReasons: string[];
  escalateProfileBlock: boolean;
};

type ModerationQueueProps = {
  items: ModerationQueueItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

function getPriorityBadgeClass(priorityLabel: ModerationQueueItem["priorityLabel"]) {
  if (priorityLabel === "urgent") return "pill pill-danger";
  if (priorityLabel === "high") return "pill";
  return "trust-badge soft";
}

export function ModerationQueue({ items }: ModerationQueueProps) {
  const router = useRouter();
  const [pendingCommentId, setPendingCommentId] = useState<string | null>(null);
  const [notesByCommentId, setNotesByCommentId] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function submitAction(
    item: ModerationQueueItem,
    action: "hide" | "dismiss" | "restore" | "block_profile" | "unblock_profile"
  ) {
    setPendingCommentId(item.commentId);
    setError(null);

    const response = await fetch(`/api/admin/moderation/comments/${item.commentId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action,
        reasonCode:
          action === "hide"
            ? item.reasonCode
            : action === "block_profile"
              ? "repeat_offender"
              : null,
        note: notesByCommentId[item.commentId]?.trim() || null
      })
    }).catch(() => null);

    if (!response?.ok) {
      const payload = (response && (await response.json().catch(() => null))) as
        | { error?: string }
        | null;
      setPendingCommentId(null);
      setError(payload?.error ?? "Could not update moderation state.");
      return;
    }

    setPendingCommentId(null);
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="muted">No reports are waiting for review.</p>;
  }

  return (
    <div className="stack">
      {error ? <p className="error-message">{error}</p> : null}
      {items.map((item) => {
        const pending = pendingCommentId === item.commentId;
        const noteValue = notesByCommentId[item.commentId] ?? "";

        return (
          <article className="stack comment-card" key={item.reportId}>
            <div className="section-header">
              <div className="stack compact">
                <strong>{item.pageTitle}</strong>
                <p className="muted">
                  {formatPageKind(item.pageKind)} • {item.pageHost} • report {item.status}
                </p>
              </div>
              <div className="chip-row">
                <span className={getPriorityBadgeClass(item.priorityLabel)}>
                  {item.priorityLabel === "urgent"
                    ? "Urgent"
                    : item.priorityLabel === "high"
                      ? "High priority"
                      : item.priorityLabel === "standard"
                        ? "Standard priority"
                        : "Low priority"}
                </span>
                <span className={item.commentHidden ? "pill pill-danger" : "pill"}>
                  {item.commentHidden ? "Hidden" : "Open"}
                </span>
              </div>
            </div>

            <div className="stack compact">
              <p className="muted">
                Reported by @{item.reporterHandle} on {formatDate(item.createdAt)} for{" "}
                <span className="mono">
                  {getCommentReportReasonLabel(item.reasonCode as CommentReportReasonCode)}
                </span>
              </p>
              <p className="muted">
                Comment by @{item.authorHandle} on {formatDate(item.commentCreatedAt)}
              </p>
              <p className="muted">
                Author reports {item.authorReportCount} • open {item.authorOpenReportCount} • hidden{" "}
                {item.authorHiddenCommentCount}
              </p>
            </div>

            <div className="chip-row">
              {item.repeatOffender ? <span className="pill pill-danger">Repeat offender risk</span> : null}
              {item.authorBlockedAt ? <span className="pill">Author blocked</span> : null}
              {item.escalateProfileBlock ? <span className="trust-badge soft">Escalate profile block</span> : null}
              {item.priorityReasons.map((reason) => (
                <span className="trust-badge soft" key={reason}>
                  {reason}
                </span>
              ))}
            </div>
            <p>{item.commentBody}</p>
            {item.details ? <p className="muted">Reporter note: {item.details}</p> : null}
            <label className="stack compact">
              <span className="muted small-copy">Admin note</span>
              <textarea
                className="input-field"
                onChange={(event) => {
                  setNotesByCommentId((current) => ({
                    ...current,
                    [item.commentId]: event.target.value
                  }));
                }}
                placeholder="Leave context for the moderation log."
                rows={3}
                value={noteValue}
              />
            </label>

            <div className="link-row">
              <a className="inline-link" href={item.pageCanonicalUrl} rel="noreferrer" target="_blank">
                Open source page
              </a>
              <a className="inline-link" href={`/pages/${item.pageId}`}>
                Open Human Layer page
              </a>
            </div>

            <div className="action-row">
              <button
                className="button"
                disabled={pending}
                onClick={() => {
                  void submitAction(item, item.commentHidden ? "restore" : "hide");
                }}
                type="button"
              >
                {pending ? "Saving..." : item.commentHidden ? "Restore comment" : "Hide comment"}
              </button>
              <button
                className="button secondary subtle"
                disabled={pending}
                onClick={() => {
                  void submitAction(item, "dismiss");
                }}
                type="button"
              >
                Dismiss report
              </button>
              <button
                className="button secondary subtle"
                disabled={pending}
                onClick={() => {
                  void submitAction(item, item.authorBlockedAt ? "unblock_profile" : "block_profile");
                }}
                type="button"
              >
                {item.authorBlockedAt
                  ? `Unblock @${item.authorHandle}`
                  : item.escalateProfileBlock
                    ? `Escalate and block @${item.authorHandle}`
                    : `Block @${item.authorHandle}`}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

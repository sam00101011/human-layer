"use client";

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

export function ModerationQueue({ items }: ModerationQueueProps) {
  const router = useRouter();
  const [pendingCommentId, setPendingCommentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitAction(commentId: string, action: "hide" | "dismiss" | "restore") {
    setPendingCommentId(commentId);
    setError(null);

    const response = await fetch(`/api/admin/moderation/comments/${commentId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action,
        reasonCode: action === "hide" ? "reported_abuse" : null
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

        return (
          <article className="stack comment-card" key={item.reportId}>
            <div className="section-header">
              <div className="stack compact">
                <strong>{item.pageTitle}</strong>
                <p className="muted">
                  {formatPageKind(item.pageKind)} • {item.pageHost} • report {item.status}
                </p>
              </div>
              <span className={item.commentHidden ? "pill pill-danger" : "pill"}>
                {item.commentHidden ? "Hidden" : "Open"}
              </span>
            </div>

            <div className="stack compact">
              <p className="muted">
                Reported by @{item.reporterHandle} on {formatDate(item.createdAt)} for{" "}
                <span className="mono">{item.reasonCode}</span>
              </p>
              <p className="muted">
                Comment by @{item.authorHandle} on {formatDate(item.commentCreatedAt)}
              </p>
            </div>

            <p>{item.commentBody}</p>
            {item.details ? <p className="muted">Reporter note: {item.details}</p> : null}

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
                  void submitAction(item.commentId, item.commentHidden ? "restore" : "hide");
                }}
                type="button"
              >
                {pending ? "Saving..." : item.commentHidden ? "Restore comment" : "Hide comment"}
              </button>
              <button
                className="button secondary subtle"
                disabled={pending}
                onClick={() => {
                  void submitAction(item.commentId, "dismiss");
                }}
                type="button"
              >
                Dismiss report
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

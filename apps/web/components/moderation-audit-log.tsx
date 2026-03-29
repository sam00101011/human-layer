import { getCommentReportReasonLabel, type CommentReportReasonCode } from "@human-layer/core";
import type { ModerationAuditItem } from "@human-layer/db";

type ModerationAuditLogProps = {
  items: ModerationAuditItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatActionLabel(actionType: string) {
  return actionType.replace(/_/g, " ");
}

function formatMetadata(metadata: Record<string, unknown>) {
  const reviewedCommentId =
    typeof metadata.reviewedCommentId === "string" ? metadata.reviewedCommentId : null;
  const escalatedFromCommentId =
    typeof metadata.escalatedFromCommentId === "string" ? metadata.escalatedFromCommentId : null;

  if (escalatedFromCommentId) {
    return `Escalated from comment ${escalatedFromCommentId}.`;
  }

  if (reviewedCommentId) {
    return `Reviewed comment ${reviewedCommentId}.`;
  }

  return null;
}

export function ModerationAuditLog({ items }: ModerationAuditLogProps) {
  if (items.length === 0) {
    return <p className="muted">No moderation actions have been recorded yet.</p>;
  }

  return (
    <div className="stack">
      {items.map((item) => (
        <article className="comment-card stack" key={item.id}>
          <div className="section-header">
            <div className="stack compact">
              <strong>{formatActionLabel(item.actionType)}</strong>
              <p className="muted">
                {item.actorHandle ? `@${item.actorHandle}` : "Unknown admin"} •{" "}
                {formatDate(item.createdAt)}
              </p>
            </div>
            {item.reasonCode ? (
              <span className="pill">
                {getCommentReportReasonLabel(item.reasonCode as CommentReportReasonCode)}
              </span>
            ) : null}
          </div>
          <p className="muted">
            {item.targetHandle ? `Target: @${item.targetHandle}` : "Target handle unavailable"}
          </p>
          {formatMetadata(item.metadata) ? <p className="muted small-copy">{formatMetadata(item.metadata)}</p> : null}
          {item.note ? <p>{item.note}</p> : null}
        </article>
      ))}
    </div>
  );
}

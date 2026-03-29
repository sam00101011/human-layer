import type { CSSProperties, ReactNode } from "react";
import {
  buildPageContextSummary,
  explainHumanTakeRecommendation,
  sortHumanTakes,
  type CommentProjection,
  type NormalizedPageCandidate,
  type PageLookupResponse,
  type Verdict
} from "@human-layer/core";
import { Bookmark, BookmarkCheck, Sparkles, ThumbsUp } from "lucide-react";

import type { OverlaySurfaceState } from "./OverlayController";

type OverlayViewProps = {
  draftComment: string;
  followedProfileIds: string[];
  helpfulCommentIds: string[];
  helpfulCountsByCommentId: Record<string, number>;
  helpfulSubmittingCommentIds: string[];
  isSaved: boolean;
  isSubmitting: boolean;
  lookup: PageLookupResponse | null;
  onDraftCommentChange(value: string): void;
  onFollow(profileId: string): void;
  onHelpful(commentId: string): void;
  onOpenBookmarks(): void;
  onOpenFeedback(): void;
  onOpenPage(pageId: string): void;
  onOpenProfile(handle: string): void;
  onReportComment(commentId: string): void;
  onRetry(): void;
  onSave(): void;
  onSubmitTake(): void;
  onVerify(): void;
  onVerdictSelect(verdict: Verdict | null): void;
  reportedCommentIds: string[];
  selectedVerdict: Verdict | null;
  statusMessage: string | null;
  surfaceState: OverlaySurfaceState;
  target: NormalizedPageCandidate;
  verdictOptions: readonly Verdict[];
};

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

function stopOverlayEvent(event: { stopPropagation(): void }) {
  event.stopPropagation();
}

const textAreaCaptureProps = {
  onClickCapture: stopOverlayEvent,
  onKeyDownCapture: stopOverlayEvent,
  onKeyUpCapture: stopOverlayEvent,
  onMouseDownCapture: stopOverlayEvent
};

function renderSurfaceShell(props: {
  action?: ReactNode;
  message: string;
  title: string;
  pageKind: string;
}) {
  return (
    <section data-state="shell" style={panelStyle}>
      <div style={badgeStyle}>Human Layer</div>
      <div style={{ display: "grid", gap: 6 }}>
        <strong>{props.title}</strong>
        <span style={mutedStyle}>{formatPageKind(props.pageKind)}</span>
      </div>
      <p style={mutedStyle}>{props.message}</p>
      {props.action ?? null}
    </section>
  );
}

function renderProfileHandle(props: {
  handle: string;
  onOpenProfile(handle: string): void;
  variant?: "default" | "pill";
}) {
  return (
    <button
      onClick={() => props.onOpenProfile(props.handle)}
      style={props.variant === "pill" ? profilePillButtonStyle : profileHandleButtonStyle}
      type="button"
    >
      @{props.handle}
    </button>
  );
}

function renderReputationBadge(label: string) {
  return <span style={miniTrustChipStyle}>{label}</span>;
}

function renderVerdictCounts(lookup: PageLookupResponse) {
  if (!lookup.thread) return null;

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {Object.entries(lookup.thread.verdictCounts).map(([verdict, count]) => (
        <div key={verdict} style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ textTransform: "capitalize" }}>{verdict}</span>
          <strong>{count}</strong>
        </div>
      ))}
    </div>
  );
}

function renderPageContext(lookup: PageLookupResponse) {
  if (!lookup.page || !lookup.thread) return null;

  const context = buildPageContextSummary({
    page: lookup.page,
    thread: lookup.thread
  });

  return (
    <div style={contextCardStyle}>
      {context.tags.length > 0 ? (
        <div style={contextTagRowStyle}>
          {context.tags.map((tag) => (
            <span key={tag} style={contextTagStyle}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <p style={helperNoteStyle}>{context.summary}</p>
    </div>
  );
}

function getRankedOverlayComments(
  lookup: PageLookupResponse,
  helpfulCountsByCommentId: Record<string, number>
): CommentProjection[] {
  if (!lookup.thread) return [];

  const deduped = new Map<string, CommentProjection>();
  const candidates = [
    ...(lookup.thread.topHumanTake ? [lookup.thread.topHumanTake] : []),
    ...lookup.thread.recentComments
  ];

  for (const comment of candidates) {
    deduped.set(comment.commentId, {
      ...comment,
      helpfulCount: helpfulCountsByCommentId[comment.commentId] ?? comment.helpfulCount
    });
  }

  return sortHumanTakes([...deduped.values()]);
}

function renderRecommendationReasons(reasons: string[]) {
  if (reasons.length === 0) return null;

  return (
    <div style={recommendationRowStyle}>
      {reasons.map((reason) => (
        <span key={reason} style={recommendationChipStyle}>
          <Sparkles aria-hidden="true" size={12} strokeWidth={2.2} />
          <span>{reason}</span>
        </span>
      ))}
    </div>
  );
}

function renderHelpfulButton(props: {
  comment: CommentProjection;
  helpfulCommentIds: string[];
  helpfulSubmittingCommentIds: string[];
  onHelpful(commentId: string): void;
  viewerProfileId?: string;
}) {
  const alreadyHelpful = props.helpfulCommentIds.includes(props.comment.commentId);
  const isSubmitting = props.helpfulSubmittingCommentIds.includes(props.comment.commentId);
  const isOwnComment = props.viewerProfileId === props.comment.profileId;

  let label = `Helpful ${props.comment.helpfulCount}`;
  if (isOwnComment) {
    label = `Your take • ${props.comment.helpfulCount}`;
  } else if (alreadyHelpful) {
    label = `Marked helpful • ${props.comment.helpfulCount}`;
  } else if (isSubmitting) {
    label = "Marking helpful...";
  }

  return (
    <button
      disabled={isOwnComment || alreadyHelpful || isSubmitting}
      onClick={() => props.onHelpful(props.comment.commentId)}
      style={{
        ...secondaryButtonStyle,
        padding: "7px 10px",
        fontSize: 12,
        opacity: isOwnComment || alreadyHelpful || isSubmitting ? 0.6 : 1
      }}
      type="button"
    >
      <span style={buttonIconLabelStyle}>
        <ThumbsUp aria-hidden="true" size={14} strokeWidth={2.2} />
        <span>{label}</span>
      </span>
    </button>
  );
}

function renderFollowButton(props: {
  lookup: PageLookupResponse;
  followedProfileIds: string[];
  profileId: string;
  profileHandle: string;
  onFollow(profileId: string): void;
}) {
  if (!props.lookup.viewer || props.lookup.viewer.profileId === props.profileId) {
    return null;
  }

  const alreadyFollowing = props.followedProfileIds.includes(props.profileId);

  return (
    <button
      disabled={alreadyFollowing}
      onClick={() => props.onFollow(props.profileId)}
      style={{
        ...secondaryButtonStyle,
        opacity: alreadyFollowing ? 0.6 : 1
      }}
      type="button"
    >
      {alreadyFollowing ? "Following" : `Follow @${props.profileHandle}`}
    </button>
  );
}

function renderReportButton(props: {
  commentId: string;
  isSubmitting: boolean;
  onReportComment(commentId: string): void;
  reportedCommentIds: string[];
}) {
  const alreadyReported = props.reportedCommentIds.includes(props.commentId);

  return (
    <button
      disabled={props.isSubmitting || alreadyReported}
      onClick={() => props.onReportComment(props.commentId)}
      style={{
        ...secondaryButtonStyle,
        padding: "7px 10px",
        fontSize: 12,
        opacity: props.isSubmitting || alreadyReported ? 0.6 : 1
      }}
      type="button"
    >
      {alreadyReported ? "Reported" : props.isSubmitting ? "Reporting..." : "Report"}
    </button>
  );
}

function renderComposer(props: OverlayViewProps, lookup: PageLookupResponse) {
  if (!lookup.viewer || !lookup.page) return null;

  const isSubmitDisabled =
    props.isSubmitting || (!props.selectedVerdict && props.draftComment.trim().length === 0);
  const SaveIcon = props.isSaved ? BookmarkCheck : Bookmark;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={sectionLabelStyle}>Your take</span>
        <button onClick={props.onSave} style={secondaryButtonStyle} type="button">
          <span style={buttonIconLabelStyle}>
            <SaveIcon aria-hidden="true" size={14} strokeWidth={2.2} />
            <span>{props.isSaved ? "Bookmarked" : "Bookmark"}</span>
          </span>
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {props.verdictOptions.map((verdict) => {
          const isSelected = props.selectedVerdict === verdict;
          return (
            <button
              key={verdict}
              onClick={() => props.onVerdictSelect(isSelected ? null : verdict)}
              style={{
                ...tagButtonStyle,
                background: isSelected ? "#facc15" : "transparent",
                color: isSelected ? "#111827" : "#f9fafb"
              }}
              type="button"
            >
              {verdict}
            </button>
          );
        })}
      </div>
      <textarea
        onChange={(event) => props.onDraftCommentChange(event.target.value)}
        placeholder="Add a short page-level comment"
        style={textAreaStyle}
        value={props.draftComment}
        {...textAreaCaptureProps}
      />
      <button
        disabled={isSubmitDisabled}
        onClick={props.onSubmitTake}
        style={{
          ...buttonStyle,
          opacity: isSubmitDisabled ? 0.55 : 1
        }}
        type="button"
      >
        {props.isSubmitting ? "Posting..." : "Post take"}
      </button>
    </div>
  );
}

function renderVerifyPrompt(props: Pick<OverlayViewProps, "onOpenFeedback" | "onVerify">) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button onClick={props.onVerify} style={buttonStyle} type="button">
        Verify to write
      </button>
      <p style={helperNoteStyle}>
        Verified human means one World ID-verified person can unlock write access with a
        pseudonymous Human Layer profile.
      </p>
      <button onClick={props.onOpenFeedback} style={secondaryButtonStyle} type="button">
        Feedback
      </button>
    </div>
  );
}

export function OverlayView(props: OverlayViewProps) {
  const { lookup } = props;

  if (props.surfaceState === "loading") {
    return renderSurfaceShell({
      title: props.target.title,
      pageKind: props.target.pageKind,
      message: "Checking verified takes for this page."
    });
  }

  if (props.surfaceState === "error") {
    return renderSurfaceShell({
      title: props.target.title,
      pageKind: props.target.pageKind,
      message: "Human Layer is having trouble loading right now.",
      action: (
        <div style={actionRowStyle}>
          <button onClick={props.onRetry} style={secondaryButtonStyle} type="button">
            Retry
          </button>
          <button onClick={props.onOpenFeedback} style={secondaryButtonStyle} type="button">
            Feedback
          </button>
        </div>
      )
    });
  }

  if (!lookup || !lookup.supported || !lookup.page || !lookup.thread) {
    return (
      <section data-state="unsupported" style={panelStyle}>
        <div style={badgeStyle}>Human Layer</div>
        <p style={mutedStyle}>This page is outside the Phase 0 supported surface list.</p>
        <button onClick={props.onOpenFeedback} style={secondaryButtonStyle} type="button">
          Feedback
        </button>
      </section>
    );
  }

  const rankedComments = getRankedOverlayComments(lookup, props.helpfulCountsByCommentId);
  const topTake = rankedComments[0] ?? null;
  const recommendedComments = rankedComments.slice(topTake ? 1 : 0);

  return (
    <section data-state={lookup.state} style={panelStyle}>
      <div style={{ display: "grid", gap: 8 }}>
        <button onClick={() => props.onOpenPage(lookup.page.id)} style={badgeButtonStyle} type="button">
          Human Layer
        </button>
        <strong>{lookup.page.title}</strong>
        <span style={mutedStyle}>{lookup.page.pageKind}</span>
      </div>

      {lookup.state === "empty" ? (
        <div style={{ display: "grid", gap: 12 }}>
          {renderPageContext(lookup)}
          <p style={mutedStyle}>
            This page is supported, but there are no verified takes yet. Be the first verified
            human to leave a verdict or comment.
          </p>
          {lookup.viewer ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ ...pillStyle, width: "fit-content" }}>
                <span>Signed in as</span>
                {renderProfileHandle({
                  handle: lookup.viewer.handle,
                  onOpenProfile: props.onOpenProfile,
                  variant: "pill"
                })}
              </div>
              <div style={actionRowStyle}>
                <button onClick={props.onOpenBookmarks} style={secondaryButtonStyle} type="button">
                  My bookmarks
                </button>
              </div>
            </div>
          ) : (
            renderVerifyPrompt(props)
          )}
          {renderComposer(props, lookup)}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {renderPageContext(lookup)}
          {lookup.viewer ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ ...pillStyle, width: "fit-content" }}>
                <span>Signed in as</span>
                {renderProfileHandle({
                  handle: lookup.viewer.handle,
                  onOpenProfile: props.onOpenProfile,
                  variant: "pill"
                })}
              </div>
              <div style={actionRowStyle}>
                <button onClick={props.onOpenBookmarks} style={secondaryButtonStyle} type="button">
                  My bookmarks
                </button>
              </div>
            </div>
          ) : (
            renderVerifyPrompt(props)
          )}
          <div style={{ display: "grid", gap: 6 }}>
            <span style={sectionLabelStyle}>Top human take</span>
            {topTake ? (
             <div style={{ display: "grid", gap: 6 }}>
               <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                 <span style={miniTrustChipStyle}>Verified take</span>
                  {topTake.reputation
                    ? renderReputationBadge(topTake.reputation.label)
                   : null}
               </div>
                {renderRecommendationReasons(explainHumanTakeRecommendation(topTake, rankedComments))}
               {renderProfileHandle({
                  handle: topTake.profileHandle,
                 onOpenProfile: props.onOpenProfile
               })}
             </div>
           ) : null}
            <p style={quoteStyle}>{topTake?.body ?? "No top human take yet."}</p>
            {topTake ? (
              <div style={actionRowStyle}>
                {renderHelpfulButton({
                  comment: topTake,
                  helpfulCommentIds: props.helpfulCommentIds,
                  helpfulSubmittingCommentIds: props.helpfulSubmittingCommentIds,
                  onHelpful: props.onHelpful,
                  viewerProfileId: lookup.viewer?.profileId
                })}
                {renderFollowButton({
                  lookup,
                  followedProfileIds: props.followedProfileIds,
                  profileId: topTake.profileId,
                  profileHandle: topTake.profileHandle,
                  onFollow: props.onFollow
                })}
                {renderReportButton({
                  commentId: topTake.commentId,
                  isSubmitting: props.isSubmitting,
                  onReportComment: props.onReportComment,
                  reportedCommentIds: props.reportedCommentIds
                })}
              </div>
            ) : null}
         </div>
         <div style={{ display: "grid", gap: 6 }}>
           <span style={sectionLabelStyle}>Verdicts</span>
           {renderVerdictCounts(lookup)}
         </div>
         <div style={{ display: "grid", gap: 6 }}>
            <span style={sectionLabelStyle}>Recommended verified takes</span>
            {recommendedComments.length === 0 ? (
              <p style={helperNoteStyle}>No other ranked takes yet.</p>
            ) : recommendedComments.map((comment) => (
             <div key={comment.commentId} style={commentStyle}>
               <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                 <span style={miniTrustChipStyle}>Verified take</span>
                 {comment.reputation ? renderReputationBadge(comment.reputation.label) : null}
               </div>
                {renderRecommendationReasons(explainHumanTakeRecommendation(comment, rankedComments))}
               {renderProfileHandle({
                 handle: comment.profileHandle,
                 onOpenProfile: props.onOpenProfile
               })}
               <span style={mutedStyle}>{comment.body}</span>
                <div style={actionRowStyle}>
                  {renderHelpfulButton({
                    comment,
                    helpfulCommentIds: props.helpfulCommentIds,
                    helpfulSubmittingCommentIds: props.helpfulSubmittingCommentIds,
                    onHelpful: props.onHelpful,
                    viewerProfileId: lookup.viewer?.profileId
                  })}
                  {renderFollowButton({
                    lookup,
                    followedProfileIds: props.followedProfileIds,
                    profileId: comment.profileId,
                    profileHandle: comment.profileHandle,
                    onFollow: props.onFollow
                  })}
                  {renderReportButton({
                    commentId: comment.commentId,
                    isSubmitting: props.isSubmitting,
                    onReportComment: props.onReportComment,
                    reportedCommentIds: props.reportedCommentIds
                  })}
                </div>
              </div>
            ))}
         </div>
         {renderComposer(props, lookup)}
       </div>
     )}

      {props.statusMessage ? <p style={mutedStyle}>{props.statusMessage}</p> : null}
      <div style={footerRowStyle}>
        <span style={footerNoteStyle}>Beta feedback helps us keep Human Layer stable.</span>
        <button onClick={props.onOpenFeedback} style={secondaryButtonStyle} type="button">
          Feedback
        </button>
      </div>
    </section>
  );
}

const actionRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8
};

const panelStyle: CSSProperties = {
  all: "initial",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  width: 320,
  display: "grid",
  gap: 16,
  padding: 16,
  background: "rgba(17, 24, 39, 0.98)",
  color: "#f9fafb",
  borderRadius: 16,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.35)"
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  width: "fit-content",
  padding: "4px 10px",
  borderRadius: 999,
  background: "#facc15",
  color: "#111827",
  fontSize: 12,
  fontWeight: 700
};

const badgeButtonStyle: CSSProperties = {
  ...badgeStyle,
  border: "none",
  cursor: "pointer"
};

const buttonStyle: CSSProperties = {
  border: "none",
  borderRadius: 12,
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 600
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: 12,
  background: "transparent",
  color: "#f9fafb",
  cursor: "pointer",
  padding: "9px 12px",
  fontSize: 13,
  fontWeight: 600
};

const buttonIconLabelStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8
};

const mutedStyle: CSSProperties = {
  color: "#d1d5db",
  fontSize: 14,
  lineHeight: 1.5
};

const helperNoteStyle: CSSProperties = {
  ...mutedStyle,
  fontSize: 12
};

const contextCardStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 10,
  borderRadius: 12,
  background: "rgba(255, 255, 255, 0.06)"
};

const contextTagRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6
};

const contextTagStyle: CSSProperties = {
  borderRadius: 999,
  padding: "4px 8px",
  background: "rgba(250, 204, 21, 0.16)",
  color: "#fde68a",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "capitalize"
};

const profileHandleButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#f9fafb",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 700,
  padding: 0,
  textAlign: "left"
};

const profilePillButtonStyle: CSSProperties = {
  ...profileHandleButtonStyle,
  color: "#fde68a",
  fontSize: 12,
  fontWeight: 700
};

const sectionLabelStyle: CSSProperties = {
  color: "#fcd34d",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase"
};

const miniTrustChipStyle: CSSProperties = {
  width: "fit-content",
  borderRadius: 999,
  padding: "4px 8px",
  background: "rgba(59, 130, 246, 0.16)",
  color: "#bfdbfe",
  fontSize: 11,
  fontWeight: 700
};

const recommendationRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6
};

const recommendationChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  width: "fit-content",
  borderRadius: 999,
  padding: "4px 8px",
  background: "rgba(167, 139, 250, 0.14)",
  color: "#ddd6fe",
  fontSize: 11,
  fontWeight: 700
};

const quoteStyle: CSSProperties = {
  margin: 0,
  color: "#f3f4f6",
  lineHeight: 1.5
};

const commentStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  padding: 10,
  borderRadius: 12,
  background: "rgba(255, 255, 255, 0.06)"
};

const textAreaStyle: CSSProperties = {
  width: "100%",
  minHeight: 88,
  borderRadius: 12,
  border: "1px solid rgba(255, 255, 255, 0.14)",
  background: "rgba(255, 255, 255, 0.08)",
  color: "#f9fafb",
  padding: 12,
  resize: "vertical"
};

const tagButtonStyle: CSSProperties = {
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: 999,
  background: "transparent",
  cursor: "pointer",
  padding: "6px 10px",
  fontSize: 12,
  textTransform: "capitalize"
};

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "4px 10px",
  background: "rgba(250, 204, 21, 0.2)",
  color: "#fde68a",
  fontSize: 12,
  fontWeight: 700
};

const footerRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12
};

const footerNoteStyle: CSSProperties = {
  color: "#9ca3af",
  fontSize: 11,
  lineHeight: 1.4
};

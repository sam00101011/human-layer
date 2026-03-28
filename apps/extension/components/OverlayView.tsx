import type { CSSProperties, ReactNode } from "react";
import type { NormalizedPageCandidate, PageLookupResponse, Verdict } from "@human-layer/core";

import type { OverlaySurfaceState } from "./OverlayController";

type OverlayViewProps = {
  draftComment: string;
  followedProfileIds: string[];
  isSaved: boolean;
  isSubmitting: boolean;
  lookup: PageLookupResponse | null;
  onDraftCommentChange(value: string): void;
  onFollow(profileId: string): void;
  onOpenPage(pageId: string): void;
  onOpenProfile(handle: string): void;
  onRetry(): void;
  onSave(): void;
  onSubmitTake(): void;
  onVerify(): void;
  onVerdictSelect(verdict: Verdict | null): void;
  selectedVerdict: Verdict | null;
  statusMessage: string | null;
  surfaceState: OverlaySurfaceState;
  target: NormalizedPageCandidate;
  verdictOptions: readonly Verdict[];
};

function formatPageKind(pageKind: string) {
  return pageKind.replace(/_/g, " ");
}

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

function renderComposer(props: OverlayViewProps, lookup: PageLookupResponse) {
  if (!lookup.viewer || !lookup.page) return null;

  const isSubmitDisabled =
    props.isSubmitting || (!props.selectedVerdict && props.draftComment.trim().length === 0);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={sectionLabelStyle}>Your take</span>
        <button onClick={props.onSave} style={secondaryButtonStyle} type="button">
          {props.isSaved ? "Saved" : "Save page"}
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

export function OverlayView(props: OverlayViewProps) {
  const { lookup, onVerify } = props;

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
        <button onClick={props.onRetry} style={secondaryButtonStyle} type="button">
          Retry
        </button>
      )
    });
  }

  if (!lookup || !lookup.supported || !lookup.page || !lookup.thread) {
    return (
      <section data-state="unsupported" style={panelStyle}>
        <div style={badgeStyle}>Human Layer</div>
        <p style={mutedStyle}>This page is outside the Phase 0 supported surface list.</p>
      </section>
    );
  }

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
          <p style={mutedStyle}>
            This page is supported, but there are no verified takes yet. Be the first verified
            human to leave a verdict or comment.
          </p>
          {lookup.viewer ? (
            <div style={{ ...pillStyle, width: "fit-content" }}>
              <span>Signed in as</span>
              {renderProfileHandle({
                handle: lookup.viewer.handle,
                onOpenProfile: props.onOpenProfile,
                variant: "pill"
              })}
            </div>
          ) : (
            <button onClick={onVerify} style={buttonStyle} type="button">
              Verify to write
            </button>
          )}
          {renderComposer(props, lookup)}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {lookup.viewer ? (
            <div style={{ ...pillStyle, width: "fit-content" }}>
              <span>Signed in as</span>
              {renderProfileHandle({
                handle: lookup.viewer.handle,
                onOpenProfile: props.onOpenProfile,
                variant: "pill"
              })}
            </div>
          ) : (
            <button onClick={onVerify} style={buttonStyle} type="button">
              Verify to write
            </button>
          )}
          <div style={{ display: "grid", gap: 6 }}>
            <span style={sectionLabelStyle}>Top human take</span>
            {lookup.thread.topHumanTake
              ? renderProfileHandle({
                  handle: lookup.thread.topHumanTake.profileHandle,
                  onOpenProfile: props.onOpenProfile
                })
              : null}
            <p style={quoteStyle}>{lookup.thread.topHumanTake?.body ?? "No top human take yet."}</p>
            {lookup.thread.topHumanTake
              ? renderFollowButton({
                  lookup,
                  followedProfileIds: props.followedProfileIds,
                  profileId: lookup.thread.topHumanTake.profileId,
                  profileHandle: lookup.thread.topHumanTake.profileHandle,
                  onFollow: props.onFollow
                })
              : null}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <span style={sectionLabelStyle}>Verdicts</span>
            {renderVerdictCounts(lookup)}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <span style={sectionLabelStyle}>Recent comments</span>
            {lookup.thread.recentComments.map((comment) => (
              <div key={comment.commentId} style={commentStyle}>
                {renderProfileHandle({
                  handle: comment.profileHandle,
                  onOpenProfile: props.onOpenProfile
                })}
                <span style={mutedStyle}>{comment.body}</span>
                {renderFollowButton({
                  lookup,
                  followedProfileIds: props.followedProfileIds,
                  profileId: comment.profileId,
                  profileHandle: comment.profileHandle,
                  onFollow: props.onFollow
                })}
              </div>
            ))}
          </div>
          {renderComposer(props, lookup)}
        </div>
      )}

      {props.statusMessage ? <p style={mutedStyle}>{props.statusMessage}</p> : null}
    </section>
  );
}

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

const mutedStyle: CSSProperties = {
  color: "#d1d5db",
  fontSize: 14,
  lineHeight: 1.5
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

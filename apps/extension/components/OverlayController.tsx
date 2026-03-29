"use client";

import {
  VERDICTS,
  type NormalizedPageCandidate,
  type PageLookupResponse,
  type Verdict
} from "@human-layer/core";
import { useEffect, useRef, useState } from "react";

import {
  attachAuthHandoffListener,
  createChromeTokenStorage,
  getStoredAuthToken
} from "../lib/auth-handoff";
import { captureExtensionAnalyticsEvent } from "../lib/analytics";
import { sendApiProxyRequest } from "../lib/api";
import { OverlayView } from "./OverlayView";

type OverlayControllerProps = {
  initialLookup: PageLookupResponse | null;
  currentUrl: string;
  appUrl: string;
  target: NormalizedPageCandidate;
};

export type OverlaySurfaceState = "loading" | "ready" | "error";

type ErrorResponsePayload = {
  error?: string;
  requestId?: string;
};

type HelpfulVoteResponse = {
  created?: boolean;
  helpfulCount?: number;
  ok?: boolean;
};

type PendingAction =
  | { type: "submit_take" }
  | { type: "save_page" }
  | { type: "follow_profile"; profileId: string }
  | { type: "helpful_comment"; commentId: string }
  | { type: "report_comment"; commentId: string }
  | null;

function isErrorResponsePayload(value: unknown): value is ErrorResponsePayload {
  return typeof value === "object" && value !== null;
}

export function buildVerifyUrl(appUrl: string, currentUrl: string): string {
  return `${appUrl}/verify?handoff=1&returnUrl=${encodeURIComponent(currentUrl)}`;
}

export function OverlayController({
  initialLookup,
  currentUrl,
  appUrl,
  target
}: OverlayControllerProps) {
  const [lookup, setLookup] = useState<PageLookupResponse | null>(initialLookup);
  const [surfaceState, setSurfaceState] = useState<OverlaySurfaceState>(
    initialLookup ? "ready" : "loading"
  );
  const [selectedVerdict, setSelectedVerdict] = useState<Verdict | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [followedProfileIds, setFollowedProfileIds] = useState<string[]>([]);
  const [helpfulCommentIds, setHelpfulCommentIds] = useState<string[]>([]);
  const [helpfulCountsByCommentId, setHelpfulCountsByCommentId] = useState<Record<string, number>>({});
  const [helpfulSubmittingCommentIds, setHelpfulSubmittingCommentIds] = useState<string[]>([]);
  const [reportedCommentIds, setReportedCommentIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [authResumeCount, setAuthResumeCount] = useState(0);
  const trackedOverlayKeyRef = useRef<string | null>(null);

  async function refreshLookup(options?: { replaceShell?: boolean }) {
    if (options?.replaceShell) {
      setSurfaceState("loading");
      setStatusMessage(null);
    }

    const hadLookup = Boolean(lookup);
    const authToken = await getStoredAuthToken();
    const response = await sendApiProxyRequest<PageLookupResponse>({
      appUrl,
      path: `/api/pages/lookup?url=${encodeURIComponent(currentUrl)}`,
      authToken
    }).catch(() => null);

    if (!response?.ok || !response.json) {
      const payload = isErrorResponsePayload(response?.json) ? response.json : null;

      console.warn("Human Layer lookup failed", {
        url: currentUrl,
        status: response?.status ?? 0,
        requestId: payload?.requestId ?? null,
        error: response?.error ?? payload?.error ?? "lookup failed"
      });

      if (!hadLookup || options?.replaceShell) {
        setSurfaceState("error");
        setStatusMessage("We could not reach Human Layer right now.");
      } else {
        setStatusMessage("Could not refresh the overlay.");
      }
      return false;
    }

    const payload = response.json as PageLookupResponse;
    setLookup(payload);
    setSaved(Boolean(payload.savedByViewer));
    setSurfaceState("ready");
    setStatusMessage(null);
    return true;
  }

  function openVerify() {
    // Open a regular tab-sized window so the World ID widget stays in its desktop QR flow.
    // A narrow popup makes IDKit render the mobile deep-link path instead.
    window.open(buildVerifyUrl(appUrl, currentUrl), "_blank");
  }

  function openPage(pageId: string) {
    window.open(`${appUrl}/pages/${pageId}`, "_blank", "noopener,noreferrer");
  }

  function openBookmarks() {
    window.open(`${appUrl}/bookmarks`, "_blank", "noopener,noreferrer");
  }

  function openProfile(handle: string) {
    window.open(
      `${appUrl}/profiles/${encodeURIComponent(handle)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openFeedback() {
    window.open(
      `${appUrl}/support?source=extension&contextUrl=${encodeURIComponent(currentUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  useEffect(() => {
    return attachAuthHandoffListener({
      appOrigin: new URL(appUrl).origin,
      storage: createChromeTokenStorage(),
      onTokenStored() {
        setAuthResumeCount((count) => count + 1);
      }
    });
  }, [appUrl, currentUrl]);

  useEffect(() => {
    if (authResumeCount === 0) {
      return;
    }

    let cancelled = false;

    async function handleResumedAuth() {
      const queuedAction = pendingAction;

      setStatusMessage(
        queuedAction ? "Verified session ready. Resuming your action..." : "Verified session ready. You can post now."
      );

      await refreshLookup();

      if (cancelled || !queuedAction) {
        return;
      }

      setPendingAction(null);

      if (queuedAction.type === "submit_take") {
        await handleSubmitTake();
        return;
      }

      if (queuedAction.type === "save_page") {
        await handleSave();
        return;
      }

      if (queuedAction.type === "report_comment") {
        await handleReportComment(queuedAction.commentId);
        return;
      }

      if (queuedAction.type === "helpful_comment") {
        await handleHelpfulComment(queuedAction.commentId);
        return;
      }

      await handleFollow(queuedAction.profileId);
    }

    void handleResumedAuth();

    return () => {
      cancelled = true;
    };
  }, [authResumeCount]);

  useEffect(() => {
    if (initialLookup) return;
    void refreshLookup({ replaceShell: true });
  }, [appUrl, currentUrl, initialLookup]);

  useEffect(() => {
    trackedOverlayKeyRef.current = null;
    setHelpfulCommentIds([]);
    setHelpfulCountsByCommentId({});
    setHelpfulSubmittingCommentIds([]);
  }, [appUrl, currentUrl]);

  useEffect(() => {
    if (surfaceState !== "ready" || !lookup?.supported || !lookup.page) {
      return;
    }

    const overlayKey = [
      lookup.page.id,
      lookup.state,
      lookup.viewer?.profileId ?? "anonymous"
    ].join(":");

    if (trackedOverlayKeyRef.current === overlayKey) {
      return;
    }

    trackedOverlayKeyRef.current = overlayKey;
    void captureExtensionAnalyticsEvent({
      appUrl,
      event: "overlay_opened",
      properties: {
        source: "extension",
        pageId: lookup.page.id,
        pageKind: lookup.page.pageKind,
        host: lookup.page.host,
        state: lookup.state,
        hasViewer: Boolean(lookup.viewer)
      }
    });
  }, [appUrl, lookup, surfaceState]);

  async function getAuthorizedToken(): Promise<string | null> {
    const authToken = await getStoredAuthToken();
    if (!authToken) return null;
    return authToken;
  }

  async function postJson(
    url: string,
    body: Record<string, unknown>,
    authTokenOverride?: string | null
  ) {
    const authToken = authTokenOverride ?? (await getAuthorizedToken());
    if (!authToken) {
      openVerify();
      return false;
    }

    const path = url.replace(appUrl, "");
    const response = await sendApiProxyRequest({
      appUrl,
      path,
      method: "POST",
      authToken,
      body
    }).catch(() => null);

    if (!response?.ok) {
      const payload = (response?.json ?? null) as { error?: string } | null;
      setStatusMessage(payload?.error ?? "That action failed.");
      return false;
    }

    return true;
  }

  async function handleSubmitTake() {
    const trimmedComment = draftComment.trim();
    if (!lookup?.page) return;

    if (!selectedVerdict && !trimmedComment) {
      setStatusMessage("Choose a verdict or add a comment first.");
      return;
    }

    const authToken = await getAuthorizedToken();
    if (!authToken) {
      setPendingAction({ type: "submit_take" });
      setStatusMessage("Finish verification to post your take.");
      openVerify();
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedVerdict) {
        const verdictOk = await postJson(
          `${appUrl}/api/pages/${lookup.page.id}/verdict`,
          { verdict: selectedVerdict },
          authToken
        );
        if (!verdictOk) return;
      }

      if (trimmedComment) {
        const commentOk = await postJson(
          `${appUrl}/api/pages/${lookup.page.id}/comments`,
          { body: trimmedComment },
          authToken
        );
        if (!commentOk) return;
      }

      setDraftComment("");
      setSelectedVerdict(null);
      setStatusMessage("Your take is live.");
      await refreshLookup();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSave() {
    if (!lookup?.page) return;

    const authToken = await getAuthorizedToken();
    if (!authToken) {
      setPendingAction({ type: "save_page" });
      setStatusMessage("Finish verification to save this page.");
      openVerify();
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await postJson(`${appUrl}/api/pages/${lookup.page.id}/save`, {}, authToken);
      if (!ok) return;
      setSaved(true);
      setStatusMessage("Page saved.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFollow(profileId: string) {
    const authToken = await getAuthorizedToken();
    if (!authToken) {
      setPendingAction({ type: "follow_profile", profileId });
      setStatusMessage("Finish verification to follow this profile.");
      openVerify();
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await postJson(`${appUrl}/api/profiles/${profileId}/follow`, {}, authToken);
      if (!ok) return;
      setFollowedProfileIds((current) =>
        current.includes(profileId) ? current : [...current, profileId]
      );
      setStatusMessage("Following profile.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleHelpfulComment(commentId: string) {
    const authToken = await getAuthorizedToken();
    if (!authToken) {
      setPendingAction({ type: "helpful_comment", commentId });
      setStatusMessage("Finish verification to mark this take as helpful.");
      openVerify();
      return;
    }

    setHelpfulSubmittingCommentIds((current) =>
      current.includes(commentId) ? current : [...current, commentId]
    );

    try {
      const response = await sendApiProxyRequest<HelpfulVoteResponse>({
        appUrl,
        path: `/api/comments/${commentId}/helpful`,
        method: "POST",
        authToken
      }).catch(() => null);

      if (!response?.ok || !response.json) {
        const payload = (response?.json ?? null) as { error?: string } | null;
        setStatusMessage(payload?.error ?? "Could not mark this take as helpful.");
        return;
      }

      const payload = response.json;
      setHelpfulCountsByCommentId((current) => ({
        ...current,
        [commentId]: payload.helpfulCount ?? current[commentId] ?? 0
      }));
      setHelpfulCommentIds((current) =>
        current.includes(commentId) ? current : [...current, commentId]
      );
      setStatusMessage(payload.created ? "Helpful feedback recorded." : "You already marked this take as helpful.");
    } finally {
      setHelpfulSubmittingCommentIds((current) => current.filter((value) => value !== commentId));
    }
  }

  async function handleReportComment(commentId: string) {
    const authToken = await getAuthorizedToken();
    if (!authToken) {
      setPendingAction({ type: "report_comment", commentId });
      setStatusMessage("Finish verification to report this comment.");
      openVerify();
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await postJson(`${appUrl}/api/comments/${commentId}/report`, {
        reasonCode: "needs_review"
      }, authToken);
      if (!ok) return;
      setReportedCommentIds((current) => current.includes(commentId) ? current : [...current, commentId]);
      setStatusMessage("Comment reported for review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <OverlayView
      draftComment={draftComment}
      followedProfileIds={followedProfileIds}
      helpfulCommentIds={helpfulCommentIds}
      helpfulCountsByCommentId={helpfulCountsByCommentId}
      helpfulSubmittingCommentIds={helpfulSubmittingCommentIds}
      isSaved={saved}
      isSubmitting={isSubmitting}
      lookup={lookup}
      onDraftCommentChange={setDraftComment}
      onFollow={handleFollow}
      onHelpful={handleHelpfulComment}
      onOpenBookmarks={openBookmarks}
      onOpenPage={openPage}
      onOpenProfile={openProfile}
      onOpenFeedback={openFeedback}
      onReportComment={handleReportComment}
      onRetry={() => {
        void refreshLookup({ replaceShell: true });
      }}
      reportedCommentIds={reportedCommentIds}
      onSave={handleSave}
      onSubmitTake={handleSubmitTake}
      onVerify={openVerify}
      onVerdictSelect={setSelectedVerdict}
      selectedVerdict={selectedVerdict}
      statusMessage={statusMessage}
      surfaceState={surfaceState}
      target={target}
      verdictOptions={VERDICTS}
    />
  );
}

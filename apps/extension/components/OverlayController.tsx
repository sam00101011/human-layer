"use client";

import {
  VERDICTS,
  type NormalizedPageCandidate,
  type PageLookupResponse,
  type Verdict
} from "@human-layer/core";
import { useEffect, useState } from "react";

import {
  attachAuthHandoffListener,
  createChromeTokenStorage,
  getStoredAuthToken
} from "../lib/auth-handoff";
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

function isErrorResponsePayload(value: unknown): value is ErrorResponsePayload {
  return typeof value === "object" && value !== null;
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
    setSurfaceState("ready");
    setStatusMessage(null);
    return true;
  }

  function openVerify() {
    const returnUrl = encodeURIComponent(currentUrl);
    window.open(
      `${appUrl}/verify?handoff=1&returnUrl=${returnUrl}`,
      "_blank",
      "popup=yes,width=480,height=720"
    );
  }

  function openPage(pageId: string) {
    window.open(`${appUrl}/pages/${pageId}`, "_blank", "noopener,noreferrer");
  }

  function openProfile(handle: string) {
    window.open(
      `${appUrl}/profiles/${encodeURIComponent(handle)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  useEffect(() => {
    return attachAuthHandoffListener({
      appOrigin: new URL(appUrl).origin,
      storage: createChromeTokenStorage(),
      onTokenStored() {
        setStatusMessage("Verified session ready. You can post now.");
        void refreshLookup();
      }
    });
  }, [appUrl, currentUrl]);

  useEffect(() => {
    if (initialLookup) return;
    void refreshLookup({ replaceShell: true });
  }, [appUrl, currentUrl, initialLookup]);

  async function getAuthorizedToken(): Promise<string | null> {
    const authToken = await getStoredAuthToken();
    if (!authToken) return null;
    return authToken;
  }

  async function postJson(url: string, body: Record<string, unknown>) {
    const authToken = await getAuthorizedToken();
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

    setIsSubmitting(true);
    try {
      if (selectedVerdict) {
        const verdictOk = await postJson(
          `${appUrl}/api/pages/${lookup.page.id}/verdict`,
          { verdict: selectedVerdict }
        );
        if (!verdictOk) return;
      }

      if (trimmedComment) {
        const commentOk = await postJson(
          `${appUrl}/api/pages/${lookup.page.id}/comments`,
          { body: trimmedComment }
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

    setIsSubmitting(true);
    try {
      const ok = await postJson(`${appUrl}/api/pages/${lookup.page.id}/save`, {});
      if (!ok) return;
      setSaved(true);
      setStatusMessage("Page saved.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFollow(profileId: string) {
    setIsSubmitting(true);
    try {
      const ok = await postJson(`${appUrl}/api/profiles/${profileId}/follow`, {});
      if (!ok) return;
      setFollowedProfileIds((current) =>
        current.includes(profileId) ? current : [...current, profileId]
      );
      setStatusMessage("Following profile.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <OverlayView
      draftComment={draftComment}
      followedProfileIds={followedProfileIds}
      isSaved={saved}
      isSubmitting={isSubmitting}
      lookup={lookup}
      onDraftCommentChange={setDraftComment}
      onFollow={handleFollow}
      onOpenPage={openPage}
      onOpenProfile={openProfile}
      onRetry={() => {
        void refreshLookup({ replaceShell: true });
      }}
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

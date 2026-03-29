"use client";

import { useState } from "react";

type ProfileSafetyActionsProps = {
  profileId: string;
  profileHandle: string;
  viewerProfileId?: string;
};

export function ProfileSafetyActions({
  profileId,
  profileHandle,
  viewerProfileId
}: ProfileSafetyActionsProps) {
  const [status, setStatus] = useState<"idle" | "muting" | "muted" | "blocking" | "blocked">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  if (!viewerProfileId || viewerProfileId === profileId) {
    return null;
  }

  async function postSafetyAction(
    path: string,
    body: Record<string, string>,
    nextStatus: "muted" | "blocked"
  ) {
    setStatus(nextStatus === "muted" ? "muting" : "blocking");
    setError(null);

    const response = await fetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not update safety controls right now.");
      return;
    }

    if (response.status === 401) {
      window.location.href = `/verify?returnUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not update safety controls right now.");
      return;
    }

    setStatus(nextStatus);
  }

  return (
    <div className="stack compact">
      <div className="inline-action-row">
        <button
          className="button secondary subtle"
          disabled={status === "muting" || status === "muted"}
          onClick={() => {
            void postSafetyAction("/api/notifications/mute", { mutedProfileId: profileId }, "muted");
          }}
          type="button"
        >
          {status === "muted" ? `Muted @${profileHandle}` : status === "muting" ? "Muting..." : `Mute @${profileHandle}`}
        </button>
        <button
          className="button secondary subtle"
          disabled={status === "blocking" || status === "blocked"}
          onClick={() => {
            const confirmed = window.confirm(
              `Block @${profileHandle}? Their takes will stop appearing in your signed-in feed and page reads.`
            );
            if (!confirmed) {
              return;
            }

            void postSafetyAction(`/api/profiles/${profileId}/block`, {}, "blocked");
          }}
          type="button"
        >
          {status === "blocked" ? `Blocked @${profileHandle}` : status === "blocking" ? "Blocking..." : `Block @${profileHandle}`}
        </button>
      </div>
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

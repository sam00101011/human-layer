"use client";

import { useState } from "react";

type NotificationActionsProps = {
  commentId: string;
  pageId: string;
  mutedProfileId: string;
  mutedHandle: string;
  unread: boolean;
};

export function NotificationActions({
  commentId,
  pageId,
  mutedProfileId,
  mutedHandle,
  unread
}: NotificationActionsProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function postAction(url: string, body: Record<string, unknown>, nextStatus: string) {
    if (status) {
      return;
    }

    setStatus(nextStatus);
    setError(null);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }).catch(() => null);

    if (!response) {
      setStatus(null);
      setError("Could not update notification controls.");
      return;
    }

    if (response.status === 401) {
      window.location.href = `/verify?returnUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(null);
      setError(payload?.error ?? "Could not update notification controls.");
      return;
    }

    window.location.reload();
  }

  return (
    <div className="stack compact">
      <div className="inline-action-row">
        {unread ? (
          <button
            className="inline-action"
            onClick={() => {
              void postAction("/api/notifications/read", { commentIds: [commentId] }, "read");
            }}
            type="button"
          >
            {status === "read" ? "Marking..." : "Mark read"}
          </button>
        ) : null}
        <button
          className="inline-action"
          onClick={() => {
            void postAction("/api/notifications/mute", { pageId }, "page");
          }}
          type="button"
        >
          {status === "page" ? "Muting..." : "Mute page"}
        </button>
        <button
          className="inline-action"
          onClick={() => {
            void postAction("/api/notifications/mute", { mutedProfileId }, "profile");
          }}
          type="button"
        >
          {status === "profile" ? "Muting..." : `Mute @${mutedHandle}`}
        </button>
        <button
          className="inline-action danger"
          onClick={() => {
            const confirmed = window.confirm(
              `Block @${mutedHandle}? Their takes will stop appearing in your signed-in feed and page reads.`
            );
            if (!confirmed) {
              return;
            }

            void postAction(`/api/profiles/${mutedProfileId}/block`, {}, "block");
          }}
          type="button"
        >
          {status === "block" ? "Blocking..." : `Block @${mutedHandle}`}
        </button>
      </div>
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

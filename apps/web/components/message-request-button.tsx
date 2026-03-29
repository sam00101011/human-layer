"use client";

import { useState } from "react";

type MessageRequestButtonProps = {
  recipientProfileId: string;
  recipientHandle?: string;
  pageId?: string | null;
};

export function MessageRequestButton({
  recipientProfileId,
  recipientHandle,
  pageId
}: MessageRequestButtonProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (status !== "idle") {
      return;
    }

    setStatus("submitting");
    setError(null);

    const response = await fetch("/api/messages/requests", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        recipientProfileId,
        pageId: pageId ?? null
      })
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not reach the messaging route.");
      return;
    }

    if (response.status === 401) {
      window.location.href = "/verify?returnUrl=" + encodeURIComponent(window.location.href);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not send the message request.");
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="stack compact">
      <button
        className="button secondary subtle"
        disabled={status !== "idle"}
        onClick={() => void handleSend()}
        type="button"
      >
        {status === "sent"
          ? "Request sent"
          : status === "submitting"
            ? "Sending..."
            : recipientHandle
              ? `Message @${recipientHandle}`
              : "Send message request"}
      </button>
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

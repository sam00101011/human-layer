"use client";

import { useState } from "react";

type FollowProfileButtonProps = {
  profileId: string;
};

export function FollowProfileButton({ profileId }: FollowProfileButtonProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "following">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFollow() {
    if (status !== "idle") {
      return;
    }

    setStatus("submitting");
    setError(null);

    const response = await fetch(`/api/profiles/${profileId}/follow`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      }
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not follow right now.");
      return;
    }

    if (response.status === 401) {
      window.location.href = `/verify?returnUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not follow right now.");
      return;
    }

    setStatus("following");
  }

  return (
    <div className="stack compact">
      <button
        className="button secondary subtle"
        disabled={status !== "idle"}
        onClick={() => {
          void handleFollow();
        }}
        type="button"
      >
        {status === "following" ? "Following" : status === "submitting" ? "Following..." : "Follow"}
      </button>
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

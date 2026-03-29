"use client";

import { useState } from "react";

import { getInterestTagLabel, type InterestTag } from "@human-layer/core";

type FollowTopicButtonProps = {
  topic: InterestTag;
  initialFollowing?: boolean;
};

export function FollowTopicButton({
  topic,
  initialFollowing = false
}: FollowTopicButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFollow() {
    if (isFollowing || status === "submitting") {
      return;
    }

    setStatus("submitting");
    setError(null);

    const response = await fetch(`/api/topics/${topic}/follow`, {
      method: "POST"
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not follow this topic right now.");
      return;
    }

    if (response.status === 401) {
      window.location.href = `/verify?returnUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not follow this topic right now.");
      return;
    }

    setIsFollowing(true);
    setStatus("idle");
    window.location.reload();
  }

  return (
    <div className="stack compact">
      <button
        className={`button ${isFollowing ? "secondary subtle" : ""}`.trim()}
        disabled={isFollowing || status === "submitting"}
        onClick={() => {
          void handleFollow();
        }}
        type="button"
      >
        {isFollowing
          ? `Following ${getInterestTagLabel(topic)}`
          : status === "submitting"
            ? "Following..."
            : `Follow ${getInterestTagLabel(topic)}`}
      </button>
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

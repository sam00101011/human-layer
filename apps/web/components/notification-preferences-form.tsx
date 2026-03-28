"use client";

import { useState } from "react";

type NotificationPreferencesFormProps = {
  initialBookmarkedPageComments: boolean;
  initialFollowedProfileTakes: boolean;
};

export function NotificationPreferencesForm({
  initialBookmarkedPageComments,
  initialFollowedProfileTakes
}: NotificationPreferencesFormProps) {
  const [bookmarkedPageComments, setBookmarkedPageComments] = useState(
    initialBookmarkedPageComments
  );
  const [followedProfileTakes, setFollowedProfileTakes] = useState(initialFollowedProfileTakes);
  const [status, setStatus] = useState<"idle" | "submitting" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (status === "submitting") {
      return;
    }

    setStatus("submitting");
    setError(null);

    const response = await fetch("/api/notifications/preferences", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        bookmarkedPageComments,
        followedProfileTakes
      })
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not save your notification preferences.");
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not save your notification preferences.");
      return;
    }

    setStatus("saved");
    window.location.reload();
  }

  return (
    <div className="stack">
      <label className="toggle-card">
        <input
          checked={bookmarkedPageComments}
          onChange={(event) => setBookmarkedPageComments(event.target.checked)}
          type="checkbox"
        />
        <span>
          <strong>Comments on bookmarked pages</strong>
          <span className="muted">Stay informed when pages you bookmarked get fresh verified takes.</span>
        </span>
      </label>
      <label className="toggle-card">
        <input
          checked={followedProfileTakes}
          onChange={(event) => setFollowedProfileTakes(event.target.checked)}
          type="checkbox"
        />
        <span>
          <strong>New takes from followed people</strong>
          <span className="muted">Keep the follow graph active when people you follow publish new takes.</span>
        </span>
      </label>
      <div className="action-row">
        <button
          className="button secondary subtle"
          onClick={() => {
            void handleSubmit();
          }}
          type="button"
        >
          {status === "submitting" ? "Saving..." : status === "saved" ? "Saved" : "Save preferences"}
        </button>
      </div>
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

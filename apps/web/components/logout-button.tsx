"use client";

import { useState } from "react";

export function LogoutButton() {
  const [status, setStatus] = useState<"idle" | "logging_out">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (status !== "idle") return;

    setStatus("logging_out");
    setError(null);

    const response = await fetch("/api/auth/logout", {
      method: "POST"
    }).catch(() => null);

    if (!response?.ok) {
      setStatus("idle");
      setError("Could not log out right now.");
      return;
    }

    window.location.href = "/verify";
  }

  return (
    <div className="stack compact">
      <button className="button secondary subtle" onClick={() => void handleLogout()} type="button">
        {status === "logging_out" ? "Logging out..." : "Logout"}
      </button>
      {error ? <span className="muted small-copy">{error}</span> : null}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function DevLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setErrorMessage(null);

    const handoff = searchParams.get("handoff") === "1";
    const returnUrl = searchParams.get("returnUrl") ?? "";

    const response = await fetch("/api/auth/dev-session", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ handoff, returnUrl })
    });

    if (!response.ok) {
      setStatus("error");
      setErrorMessage("Could not create the dev session.");
      return;
    }

    const payload = (await response.json()) as { redirectTo: string };
    router.push(payload.redirectTo);
  }

  return (
    <div className="card stack">
      <h1>Dev login</h1>
      <p className="muted">
        This is the fallback Phase 0 stubbed auth flow. Use `/verify` for the main World ID
        onboarding path. This fallback creates a server-side session cookie for the demo profile
        and can still hand a short-lived bearer token back to the extension.
      </p>
      <button className="button" disabled={status === "loading"} onClick={handleClick} type="button">
        {status === "loading" ? "Signing in..." : "Create dev session"}
      </button>
      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
    </div>
  );
}

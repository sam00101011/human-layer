"use client";

import { useEffect, useMemo, useState } from "react";

import { extensionMessageType } from "../app/lib/auth-shared";

function getTargetOrigin(returnUrl: string | null): string {
  if (!returnUrl) return "*";

  try {
    return new URL(returnUrl).origin;
  } catch {
    return "*";
  }
}

export function HandoffClient({ returnUrl }: { returnUrl: string | null }) {
  const [status, setStatus] = useState("Preparing extension token...");
  const targetOrigin = useMemo(() => getTargetOrigin(returnUrl), [returnUrl]);

  useEffect(() => {
    let closed = false;

    async function sendToken() {
      try {
        const response = await fetch("/api/auth/extension-token", {
          method: "POST"
        });

        if (!response.ok) {
          throw new Error("Could not mint the extension token.");
        }

        const payload = await response.json();
        window.opener?.postMessage(
          {
            type: extensionMessageType,
            token: payload.token,
            expiresAt: payload.expiresAt
          },
          targetOrigin
        );

        setStatus("Token sent to the extension. Closing this window...");
        window.setTimeout(() => {
          if (!closed) window.close();
        }, 2000);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unknown handoff error");
      }
    }

    void sendToken();

    return () => {
      closed = true;
    };
  }, [targetOrigin]);

  return (
    <div className="card stack">
      <h1>Extension handoff</h1>
      <p className="muted">{status}</p>
    </div>
  );
}

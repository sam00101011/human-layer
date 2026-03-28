"use client";

import { INTEREST_TAGS, MAX_PROFILE_INTERESTS } from "@human-layer/core";
import {
  IDKitRequestWidget,
  deviceLegacy,
  orbLegacy,
  type IDKitResult
} from "@worldcoin/idkit";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  extractLegacyProofPayload
} from "../app/lib/world-id-client";
import type {
  WorldIdClientConfig,
  WorldIdRequestConfig
} from "../app/lib/world-id";
import { captureBrowserAnalyticsEvent } from "../app/lib/browser-analytics";

type WorldIdVerifyFormProps = {
  handoff: boolean;
  returnUrl: string;
  worldIdConfig: WorldIdClientConfig;
};

const handlePattern = /^[a-z0-9_]{3,24}$/;

function createDefaultMockHumanKey() {
  return `mock-human-${Math.random().toString(36).slice(2, 10)}`;
}

function isWorldIdRequestConfig(value: unknown): value is WorldIdRequestConfig {
  return Boolean(
    value &&
      typeof value === "object" &&
      "appId" in value &&
      "rpContext" in value
  );
}

export function WorldIdVerifyForm({
  handoff,
  returnUrl,
  worldIdConfig
}: WorldIdVerifyFormProps) {
  const router = useRouter();
  const redirectRef = useRef<string | null>(null);
  const verifyFailureMessageRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [handle, setHandle] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(["devtools", "research"]);
  const [mockHumanKey, setMockHumanKey] = useState("");
  const [verificationLevel, setVerificationLevel] = useState<"orb" | "device">("orb");
  const [requestConfig, setRequestConfig] = useState<WorldIdRequestConfig | null>(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (worldIdConfig.mode !== "mock") return;

    const stored = window.localStorage.getItem("human-layer/mock-human-key");
    const nextValue = stored ?? createDefaultMockHumanKey();
    window.localStorage.setItem("human-layer/mock-human-key", nextValue);
    setMockHumanKey(nextValue);
  }, [worldIdConfig.mode]);

  function toggleTag(tag: string) {
    setSelectedTags((current) => {
      if (current.includes(tag)) {
        return current.filter((value) => value !== tag);
      }

      if (current.length >= MAX_PROFILE_INTERESTS) {
        return current;
      }

      return [...current, tag];
    });
  }

  function validateDraft(): string | null {
    if (!handlePattern.test(handle.trim().toLowerCase())) {
      return "Handle must be 3-24 characters using lowercase letters, numbers, or underscores.";
    }

    if (selectedTags.length === 0) {
      return "Choose at least one interest tag.";
    }

    if (worldIdConfig.mode === "mock" && !mockHumanKey.trim()) {
      return "Mock human key is required in local mode.";
    }

    return null;
  }

  async function submitVerification(params: {
    worldIdResult?: IDKitResult;
    proof?: string;
    merkleRoot?: string;
    nullifierHash?: string;
    signalHash?: string | null;
    verificationLevel?: "orb" | "device";
    signal?: string | null;
    mockHumanKey?: string;
  }) {
    const response = await fetch("/api/auth/world-id/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        handle,
        interestTags: selectedTags,
        handoff,
        returnUrl,
        mockHumanKey: params.mockHumanKey,
        worldIdResult: params.worldIdResult,
        proof: params.proof,
        merkleRoot: params.merkleRoot,
        nullifierHash: params.nullifierHash,
        signalHash: params.signalHash,
        verificationLevel: params.verificationLevel,
        signal: params.signal ?? worldIdConfig.signal
      })
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; redirectTo?: string }
      | null;

    if (!response.ok || !payload?.redirectTo) {
      throw new Error(payload?.error ?? "Verification failed.");
    }

    return payload.redirectTo;
  }

  async function handleMockSubmit() {
    const redirectTo = await submitVerification({
      mockHumanKey,
      verificationLevel,
      signal: worldIdConfig.signal
    });

    router.push(redirectTo);
  }

  async function beginRemoteVerification() {
    const response = await fetch("/api/auth/world-id/request");
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | WorldIdRequestConfig
      | null;

    if (!response.ok || !isWorldIdRequestConfig(payload)) {
      const errorMessage =
        payload && typeof payload === "object" && "error" in payload
          ? String(payload.error)
          : "Could not open World ID.";
      throw new Error(errorMessage);
    }

    redirectRef.current = null;
    setRequestConfig(payload);
    setIsWidgetOpen(true);
  }

  async function handleIdKitVerify(result: IDKitResult) {
    try {
      const payload =
        result.protocol_version === "3.0"
          ? extractLegacyProofPayload(result)
          : {
              proof: undefined,
              merkleRoot: undefined,
              nullifierHash: undefined,
              signalHash: undefined
            };
      redirectRef.current = await submitVerification({
        worldIdResult: result,
        proof: payload.proof,
        merkleRoot: payload.merkleRoot,
        nullifierHash: payload.nullifierHash,
        signalHash: payload.signalHash,
        verificationLevel,
        signal: worldIdConfig.signal
      });
      verifyFailureMessageRef.current = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed.";
      verifyFailureMessageRef.current = message;
      setStatusMessage(message);
      throw error;
    }
  }

  function handleSubmit() {
    setStatusMessage(null);

    const validationError = validateDraft();
    if (validationError) {
      setStatusMessage(validationError);
      return;
    }

    void captureBrowserAnalyticsEvent("verify_started", {
      source: handoff ? "extension_handoff" : "web_app",
      mode: worldIdConfig.mode,
      verificationLevel,
      returnUrlPresent: Boolean(returnUrl),
      selectedTagCount: selectedTags.length
    });

    startTransition(() => {
      if (worldIdConfig.mode === "mock") {
        void handleMockSubmit().catch((error) => {
          setStatusMessage(error instanceof Error ? error.message : "Verification failed.");
        });
        return;
      }

      void beginRemoteVerification().catch((error) => {
        setStatusMessage(error instanceof Error ? error.message : "Could not open World ID.");
      });
    });
  }

  const verifyButtonLabel =
    worldIdConfig.mode === "mock"
      ? "Verify and create profile"
      : "Continue with World ID";

  return (
    <section className="card stack">
      <div className="stack">
        <h1>Verify with World ID</h1>
        <p className="muted">
          Human Layer uses World ID to unlock one-human write access. Create a pseudonymous handle,
          pick your interests, then return to the same page with write actions enabled.
        </p>
        <div className="pill">
          {worldIdConfig.mode === "mock"
            ? "Mock IDKit mode is active until app credentials are configured."
            : "Live IDKit mode is active. The official World ID widget opens from this page."}
        </div>
      </div>

      <label className="field">
        <span>Handle</span>
        <input
          className="input"
          maxLength={24}
          onChange={(event) => setHandle(event.target.value.toLowerCase())}
          onBlur={() => {
            if (handle && !handlePattern.test(handle.trim().toLowerCase())) {
              setStatusMessage('Handle must be 3-24 characters using lowercase letters, numbers, or underscores.');
            }
          }}
          placeholder="builder_signal"
          value={handle}
        />
        <span className="helper">
          Use 3-24 lowercase letters, numbers, or underscores.
          <span style={{ float: 'right' }}>{handle.length}/24</span>
        </span>
      </label>

      <div className="field">
        <span>Interests</span>
        <div className="chip-row">
          {INTEREST_TAGS.map((interestTag) => {
            const selected = selectedTags.includes(interestTag);
            return (
              <button
                className={selected ? "chip active" : "chip"}
                key={interestTag}
                onClick={() => toggleTag(interestTag)}
                type="button"
              >
                {interestTag}
              </button>
            );
          })}
        </div>
        <span className="helper">
          Pick up to {MAX_PROFILE_INTERESTS}. These power the first version of the Human Graph.
        </span>
      </div>

      {worldIdConfig.mode === "mock" ? (
        <label className="field">
          <span>Mock human key</span>
          <input
            className="input"
            onChange={(event) => {
              const value = event.target.value;
              setMockHumanKey(value);
              window.localStorage.setItem("human-layer/mock-human-key", value);
            }}
            value={mockHumanKey}
          />
          <span className="helper">
            Reuse the same key to simulate the same verified human across sessions.
          </span>
        </label>
      ) : (
        <div className="field">
          <span>Verification type</span>
          <div className="chip-row">
            <button
              className={verificationLevel === "orb" ? "chip active" : "chip"}
              onClick={() => setVerificationLevel("orb")}
              type="button"
            >
              Orb only
            </button>
            <button
              className={verificationLevel === "device" ? "chip active" : "chip"}
              onClick={() => setVerificationLevel("device")}
              type="button"
            >
              Orb or device
            </button>
          </div>
          <span className="helper">
            The live widget uses the official IDKit request flow and returns a signed proof to the
            backend.
          </span>
        </div>
      )}

      <div className="field">
        <span>Why verification exists</span>
        <p className="helper">
          Verified human means one World ID-verified person can unlock write access with a
          pseudonymous Human Layer profile. We use that check to reduce spam while keeping public
          handles separate from your World App identity.
        </p>
        <div className="chip-row">
          <Link className="button secondary" href="/privacy">
            Privacy
          </Link>
          <Link className="button secondary" href="/terms">
            Terms
          </Link>
          <Link className="button secondary" href="/support?source=verify">
            Support
          </Link>
        </div>
      </div>

      <button className="button" disabled={isPending} onClick={handleSubmit} type="button">
        {isPending ? "Preparing..." : verifyButtonLabel}
      </button>

      {worldIdConfig.mode === "remote" && requestConfig ? (
        <IDKitRequestWidget
          action={requestConfig.action}
          allow_legacy_proofs={requestConfig.allowLegacyProofs}
          app_id={requestConfig.appId as `app_${string}`}
          autoClose
          environment={requestConfig.environment}
          handleVerify={handleIdKitVerify}
          onError={(errorCode) => {
            if (verifyFailureMessageRef.current) {
              setStatusMessage(verifyFailureMessageRef.current);
              return;
            }

            setStatusMessage(`World ID error: ${errorCode}`);
          }}
          onOpenChange={(open) => {
            setIsWidgetOpen(open);
            if (!open) {
              verifyFailureMessageRef.current = null;
            }
          }}
          onSuccess={() => {
            if (!redirectRef.current) {
              setStatusMessage("Verification succeeded, but redirect information is missing.");
              return;
            }

            router.push(redirectRef.current);
          }}
          open={isWidgetOpen}
          preset={
            verificationLevel === "device"
              ? deviceLegacy({ signal: requestConfig.signal })
              : orbLegacy({ signal: requestConfig.signal })
          }
          return_to={typeof window === "undefined" ? undefined : window.location.href}
          rp_context={requestConfig.rpContext}
        />
      ) : null}

      {statusMessage ? <p className="error-message">{statusMessage}</p> : null}
    </section>
  );
}

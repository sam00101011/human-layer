"use client";

import { useMemo, useState } from "react";

type ProviderOption = {
  id: string;
  label: string;
  priceUsdCents: number;
  description: string;
};

type ResearchResponse = {
  ok: true;
  payment: {
    eventId: string;
    remainingCreditUsdCents: number;
    remainingDailyBudgetUsdCents: number;
  };
  result: {
    providerId: string;
    providerLabel: string;
    priceUsdCents: number;
    mode: "preview";
    query: string;
    summary: string;
    whyItMatters: string;
    bullets: string[];
    citations: Array<{ label: string; url: string }>;
  };
};

type WalletResearchActionProps = {
  pageId: string;
  initialProviderId: string;
  enabledProviders: string[];
  providers: ProviderOption[];
};

export function WalletResearchAction({
  pageId,
  initialProviderId,
  enabledProviders,
  providers
}: WalletResearchActionProps) {
  function formatUsd(cents: number) {
    return "$" + (cents / 100).toFixed(2);
  }

  const visibleProviders = useMemo(
    () => providers.filter((provider) => enabledProviders.includes(provider.id)),
    [enabledProviders, providers]
  );
  const [providerId, setProviderId] = useState(
    visibleProviders.find((provider) => provider.id === initialProviderId)?.id ??
      visibleProviders[0]?.id ??
      initialProviderId
  );
  const [status, setStatus] = useState<"idle" | "running">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResponse | null>(null);

  async function handleRun() {
    if (status === "running") return;

    setStatus("running");
    setError(null);

    const response = await fetch("/api/wallet/research", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        pageId,
        provider: providerId
      })
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not reach the research wallet route.");
      return;
    }

    if (response.status === 401) {
      window.location.href = "/verify?returnUrl=" + encodeURIComponent(window.location.href);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not run wallet research.");
      return;
    }

    const payload = (await response.json()) as ResearchResponse;
    setResult(payload);
    setStatus("idle");
  }

  return (
    <div className="stack">
      <label className="stack compact">
        <span className="muted small-copy">Research provider</span>
        <select
          className="input-field"
          onChange={(event) => setProviderId(event.target.value)}
          value={providerId}
        >
          {visibleProviders.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.label}
            </option>
          ))}
        </select>
      </label>

      <button className="button" onClick={() => void handleRun()} type="button">
        {status === "running" ? "Running research..." : "Research this page"}
      </button>

      {error ? <span className="error-message">{error}</span> : null}

      {result ? (
        <div className="wallet-research-result stack">
          <div className="chip-row">
            <span className="pill">Wallet result</span>
            <span className="trust-badge">{result.result.providerLabel}</span>
            <span className="trust-badge soft">
              {formatUsd(result.result.priceUsdCents)} spent
            </span>
            <span className="trust-badge soft">
              {formatUsd(result.payment.remainingCreditUsdCents)} credit left
            </span>
          </div>
          <p className="muted">{result.result.summary}</p>
          <div className="stack compact">
            <strong>Why it matters</strong>
            <p className="muted">{result.result.whyItMatters}</p>
          </div>
          <ul className="legal-list">
            {result.result.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <div className="stack compact">
            <span className="muted small-copy">Query</span>
            <code>{result.result.query}</code>
          </div>
          <div className="chip-row">
            {result.result.citations.map((citation) => (
              <a
                className="chip"
                href={citation.url}
                key={citation.label + citation.url}
                rel="noreferrer"
                target="_blank"
              >
                {citation.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

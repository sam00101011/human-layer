"use client";

import { useState } from "react";

type ProviderOption = {
  id: string;
  label: string;
  priceUsdCents: number;
  description: string;
};

type WalletManagementFormProps = {
  initialSpendingEnabled: boolean;
  initialDailySpendLimitUsdCents: number;
  initialDefaultProvider: string;
  initialEnabledProviders: string[];
  providers: ProviderOption[];
};

export function WalletManagementForm({
  initialSpendingEnabled,
  initialDailySpendLimitUsdCents,
  initialDefaultProvider,
  initialEnabledProviders,
  providers
}: WalletManagementFormProps) {
  const [spendingEnabled, setSpendingEnabled] = useState(initialSpendingEnabled);
  const [dailySpendLimitDollars, setDailySpendLimitDollars] = useState(
    String((initialDailySpendLimitUsdCents / 100).toFixed(2))
  );
  const [defaultProvider, setDefaultProvider] = useState(initialDefaultProvider);
  const [enabledProviders, setEnabledProviders] = useState<string[]>(initialEnabledProviders);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  function toggleProvider(providerId: string) {
    setEnabledProviders((current) => {
      if (current.includes(providerId)) {
        const next = current.filter((value) => value !== providerId);
        return next.length > 0 ? next : current;
      }

      return [...current, providerId];
    });
  }

  async function handleSave() {
    if (status === "saving") return;

    setStatus("saving");
    setError(null);

    const response = await fetch("/api/wallet", {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        spendingEnabled,
        dailySpendLimitUsdCents: Math.round(Number(dailySpendLimitDollars || "0") * 100),
        defaultProvider,
        enabledProviders
      })
    }).catch(() => null);

    if (!response) {
      setStatus("idle");
      setError("Could not save your wallet settings.");
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(payload?.error ?? "Could not save your wallet settings.");
      return;
    }

    setStatus("saved");
    window.location.reload();
  }

  return (
    <div className="stack">
      <label className="toggle-card">
        <input
          checked={spendingEnabled}
          onChange={(event) => setSpendingEnabled(event.target.checked)}
          type="checkbox"
        />
        <span>
          <strong>Wallet spending enabled</strong>
          <span className="muted">
            Turn this off if you want the wallet to stay visible but not pay for research actions.
          </span>
        </span>
      </label>

      <label className="stack compact">
        <span className="muted small-copy">Daily spend cap (USD)</span>
        <input
          className="input-field"
          inputMode="decimal"
          onChange={(event) => setDailySpendLimitDollars(event.target.value)}
          value={dailySpendLimitDollars}
        />
      </label>

      <label className="stack compact">
        <span className="muted small-copy">Default research provider</span>
        <select
          className="input-field"
          onChange={(event) => setDefaultProvider(event.target.value)}
          value={defaultProvider}
        >
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.label}
            </option>
          ))}
        </select>
      </label>

      <div className="stack compact">
        <span className="muted small-copy">Enabled providers</span>
        <div className="stack compact">
          {providers.map((provider) => (
            <label className="toggle-card" key={provider.id}>
              <input
                checked={enabledProviders.includes(provider.id)}
                onChange={() => toggleProvider(provider.id)}
                type="checkbox"
              />
              <span>
                <strong>{provider.label}</strong>
                <span className="muted">
                  {provider.description} • \${(provider.priceUsdCents / 100).toFixed(2)} / request
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="action-row">
        <button className="button" onClick={() => void handleSave()} type="button">
          {status === "saving" ? "Saving..." : "Save wallet settings"}
        </button>
      </div>
      {error ? <span className="error-message">{error}</span> : null}
      {status === "saved" ? <span className="success-message">Wallet updated.</span> : null}
    </div>
  );
}

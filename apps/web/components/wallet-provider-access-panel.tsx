"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

type ProviderOption = {
  id: string;
  label: string;
  priceUsdCents: number;
  description: string;
  executionMode: "wallet_signed_x402" | "preview";
};

type WalletProviderAccessPanelProps = {
  enabledProviders: string[];
  providers: ProviderOption[];
};

function formatUsd(cents: number) {
  return "$" + (cents / 100).toFixed(2);
}

export function WalletProviderAccessPanel({
  enabledProviders,
  providers
}: WalletProviderAccessPanelProps) {
  const [open, setOpen] = useState(false);
  const enabledCount = providers.filter((provider) => enabledProviders.includes(provider.id)).length;

  return (
    <section className="card stack">
      <button className="wallet-disclosure-button" onClick={() => setOpen((value) => !value)} type="button">
        <div className="stack compact">
          <div className="chip-row">
            <span className="trust-badge">Provider access</span>
            <span className="trust-badge soft">{enabledCount} enabled</span>
          </div>
          <span className="muted small-copy">Wallet-signed tools are ready when you need them.</span>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={open ? "wallet-disclosure-icon open" : "wallet-disclosure-icon"}
          size={16}
        />
      </button>
      {open ? (
        <div className="topic-grid">
          {providers.map((provider) => (
            <article className="topic-card" key={provider.id}>
              <div className="chip-row">
                <span className="trust-badge">{provider.label}</span>
                <span className={enabledProviders.includes(provider.id) ? "pill" : "trust-badge soft"}>
                  {enabledProviders.includes(provider.id) ? "Enabled" : "Disabled"}
                </span>
                <span className="trust-badge soft">
                  {provider.executionMode === "wallet_signed_x402" ? "Wallet-signed" : "Preview"}
                </span>
              </div>
              <p className="muted">{provider.description}</p>
              <span className="small-copy muted">{formatUsd(provider.priceUsdCents)} per request</span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

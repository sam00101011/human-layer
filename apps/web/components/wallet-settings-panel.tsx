"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";

import { WalletManagementForm } from "./wallet-management-form";

type ProviderOption = {
  id: string;
  label: string;
  priceUsdCents: number;
  description: string;
};

type WalletSettingsPanelProps = {
  initialSpendingEnabled: boolean;
  initialDailySpendLimitUsdCents: number;
  initialDefaultProvider: string;
  initialEnabledProviders: string[];
  providers: ProviderOption[];
};

export function WalletSettingsPanel(props: WalletSettingsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="stack compact wallet-settings-anchor">
      <button
        aria-label={open ? "Hide wallet settings" : "Show wallet settings"}
        className="icon-button"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Settings2 aria-hidden="true" size={16} strokeWidth={2} />
      </button>
      {open ? (
        <div className="settings-panel stack">
          <div className="section-header tight">
            <h2>Wallet management</h2>
            <span className="muted small-copy">Spend caps, defaults, and provider toggles.</span>
          </div>
          <WalletManagementForm {...props} />
        </div>
      ) : null}
    </div>
  );
}

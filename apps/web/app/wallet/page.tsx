import Link from "next/link";
import { getManagedWalletSnapshot } from "@human-layer/db";
import { redirect } from "next/navigation";

import { PasskeyWalletCard } from "../../components/passkey-wallet-card";
import { WalletCommandConsole } from "../../components/wallet-command-console";
import { WalletProviderAccessPanel } from "../../components/wallet-provider-access-panel";
import { WalletSettingsPanel } from "../../components/wallet-settings-panel";
import { getAuthenticatedProfileFromCookies } from "../lib/auth";
import { getWalletResearchProviders } from "../lib/wallet-tools";

function formatUsd(cents: number) {
  return "$" + (cents / 100).toFixed(2);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatProviderLabel(providerId: string | null | undefined, providerLabels: Map<string, string>) {
  if (!providerId) return null;
  return providerLabels.get(providerId) ?? providerId;
}

export default async function WalletPage() {
  const viewer = await getAuthenticatedProfileFromCookies();
  if (!viewer) {
    redirect("/verify?returnUrl=/wallet");
  }

  const wallet = await getManagedWalletSnapshot(viewer.id);
  const providers = getWalletResearchProviders();
  const providerLabels = new Map(providers.map((provider) => [provider.id, provider.label]));

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Wallet</span>
              <span className="trust-badge">Base passkey wallet</span>
              <span className="trust-badge soft">User-owned</span>
            </div>
            <h1>Human Layer wallet</h1>
            <p className="muted">
              Connect a passkey-backed Base wallet for wallet-signed x402 actions. Human Layer stores
              the linked address, wallet type, spend settings, and payment history, but not your private keys.
            </p>
          </div>
          <div className="action-row">
            <Link className="button secondary" href="/install-extension">
              Back to install flow
            </Link>
          </div>
        </div>
      </section>

      <WalletCommandConsole
        enabledProviders={wallet?.enabledProviders ?? []}
        linkedWalletAddress={wallet?.walletAddress ?? null}
        providers={providers}
      />

      <PasskeyWalletCard
        linkedNetwork={wallet?.network ?? null}
        linkedStatus={wallet?.status ?? null}
        linkedWalletAddress={wallet?.walletAddress ?? null}
        linkedWalletProvider={wallet?.walletProvider ?? null}
        linkedWalletType={wallet?.walletType ?? null}
      />

      {wallet ? (
        <>
          <section className="card stack">
            <div className="section-header">
              <h2>Wallet overview</h2>
              <WalletSettingsPanel
                initialDailySpendLimitUsdCents={wallet.dailySpendLimitUsdCents}
                initialDefaultProvider={wallet.defaultProvider}
                initialEnabledProviders={wallet.enabledProviders}
                initialSpendingEnabled={wallet.spendingEnabled}
                providers={providers}
              />
            </div>
            <div className="metric-grid">
              <div className="stat-card">
                <strong>{formatUsd(wallet.spentTodayUsdCents)}</strong>
                <span className="muted">Spent today</span>
              </div>
              <div className="stat-card">
                <strong>{formatUsd(wallet.dailySpendLimitUsdCents)}</strong>
                <span className="muted">Daily cap</span>
              </div>
              <div className="stat-card">
                <strong>{formatUsd(wallet.remainingDailyBudgetUsdCents)}</strong>
                <span className="muted">Budget left today</span>
              </div>
              <div className="stat-card">
                <strong>{wallet.paymentHistory.length}</strong>
                <span className="muted">Recent paid actions</span>
              </div>
            </div>

            <div className="wallet-meta-grid">
              <div className="wallet-meta-card">
                <span className="muted small-copy">Wallet address</span>
                <code>{wallet.walletAddress}</code>
              </div>
              <div className="wallet-meta-card">
                <span className="muted small-copy">Network</span>
                <strong>{wallet.network}</strong>
              </div>
              <div className="wallet-meta-card">
                <span className="muted small-copy">Wallet provider</span>
                <strong>{wallet.walletProvider.replace(/_/g, " ")}</strong>
              </div>
              <div className="wallet-meta-card">
                <span className="muted small-copy">Wallet type</span>
                <strong>{wallet.walletType.replace(/_/g, " ")}</strong>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="card stack">
          <div className="section-header">
            <h2>Connect your wallet first</h2>
            <span className="muted">
              The passkey wallet is created and linked from this device after verification.
            </span>
          </div>
          <p className="muted">
            Once linked, you can use wallet-signed x402 tools, keep a payment history, and set spend caps
            without handing Human Layer any private keys.
          </p>
        </section>
      )}

      <WalletProviderAccessPanel enabledProviders={wallet?.enabledProviders ?? []} providers={providers} />

      {wallet ? (
        <section className="card stack">
          <div className="section-header">
            <h2>Payment history</h2>
            <span className="muted">Recorded wallet-signed actions and previews linked to this profile.</span>
          </div>
          {wallet.paymentHistory.length > 0 ? (
            <div className="stack compact">
              {wallet.paymentHistory.map((event) => (
                <div className="wallet-history-item" key={event.id}>
                  <div className="stack compact">
                    <strong>{event.description ?? event.kind}</strong>
                    <span className="muted small-copy">
                      {formatProviderLabel(event.provider, providerLabels)
                        ? formatProviderLabel(event.provider, providerLabels) + " • "
                        : ""}
                      {event.pageTitle ?? "Wallet action"} • {formatDate(event.createdAt)}
                    </span>
                  </div>
                  <div className="chip-row">
                    <span className="trust-badge soft">{event.status}</span>
                    <span className="trust-badge">{formatUsd(event.amountUsdCents)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No paid actions yet. Your first research run will show up here.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

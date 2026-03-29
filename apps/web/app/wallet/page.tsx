import Link from "next/link";
import { findPageById, getManagedWalletSnapshot, getPageThreadSnapshot } from "@human-layer/db";
import { redirect } from "next/navigation";

import { PasskeyWalletCard } from "../../components/passkey-wallet-card";
import { WalletManagementForm } from "../../components/wallet-management-form";
import { WalletResearchAction } from "../../components/wallet-research-action";
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

export default async function WalletPage(props: {
  searchParams: Promise<{ pageId?: string }>;
}) {
  const viewer = await getAuthenticatedProfileFromCookies();
  if (!viewer) {
    redirect("/verify?returnUrl=/wallet");
  }

  const searchParams = await props.searchParams;
  const [wallet, sourcePage] = await Promise.all([
    getManagedWalletSnapshot(viewer.id),
    typeof searchParams.pageId === "string" ? findPageById(searchParams.pageId) : Promise.resolve(null)
  ]);
  const sourceThread = sourcePage ? await getPageThreadSnapshot(sourcePage.id, viewer.id) : null;
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

          <section className="card stack">
            <div className="section-header">
              <h2>Wallet management</h2>
              <span className="muted">Control spend, choose providers, and keep the default simple.</span>
            </div>
            <WalletManagementForm
              initialDailySpendLimitUsdCents={wallet.dailySpendLimitUsdCents}
              initialDefaultProvider={wallet.defaultProvider}
              initialEnabledProviders={wallet.enabledProviders}
              initialSpendingEnabled={wallet.spendingEnabled}
              providers={providers}
            />
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

      <section className="card stack">
        <div className="section-header">
          <h2>Provider access</h2>
          <span className="muted">
            Native x402 providers run with your connected wallet today. Preview-only providers stay visible so
            the roadmap is clear without pretending they are server-custodied.
          </span>
        </div>
        <div className="topic-grid">
          {providers.map((provider) => (
            <article className="topic-card" key={provider.id}>
              <div className="chip-row">
                <span className="trust-badge">{provider.label}</span>
                {wallet ? (
                  <span
                    className={
                      wallet.enabledProviders.includes(provider.id) ? "pill" : "trust-badge soft"
                    }
                  >
                    {wallet.enabledProviders.includes(provider.id) ? "Enabled" : "Disabled"}
                  </span>
                ) : null}
                <span className="trust-badge soft">
                  {provider.executionMode === "wallet_signed_x402" ? "Wallet-signed" : "Preview"}
                </span>
              </div>
              <p className="muted">{provider.description}</p>
              <span className="small-copy muted">{formatUsd(provider.priceUsdCents)} per request</span>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Research this page</h2>
          <span className="muted">
            {sourcePage
              ? "Run a wallet-backed research action on the page you came from."
              : "Open this page from a Human Layer page thread to run research on a specific URL."}
          </span>
        </div>
        {!wallet ? (
          <p className="muted">Link a passkey wallet first, then return here to run wallet-signed research.</p>
        ) : sourcePage && sourceThread ? (
          <div className="stack">
            <div className="wallet-meta-card">
              <span className="muted small-copy">Selected page</span>
              <strong>{sourcePage.title}</strong>
              <span className="muted">{sourcePage.host}</span>
            </div>
            <WalletResearchAction
              enabledProviders={wallet.enabledProviders}
              initialProviderId={wallet.defaultProvider}
              linkedWalletAddress={wallet.walletAddress}
              page={sourcePage}
              pageId={sourcePage.id}
              providers={providers}
              thread={sourceThread}
            />
          </div>
        ) : (
          <p className="muted">
            Start from a Human Layer page thread and tap <strong>Research with wallet</strong> to run this flow.
          </p>
        )}
      </section>

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

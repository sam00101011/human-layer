import Link from "next/link";
import { ensureManagedWalletForProfile, findPageById } from "@human-layer/db";
import { redirect } from "next/navigation";

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

export default async function WalletPage(props: {
  searchParams: Promise<{ pageId?: string }>;
}) {
  const viewer = await getAuthenticatedProfileFromCookies();
  if (!viewer) {
    redirect("/verify?returnUrl=/wallet");
  }

  const wallet = await ensureManagedWalletForProfile({
    profileId: viewer.id,
    handle: viewer.handle
  });
  const searchParams = await props.searchParams;
  const sourcePage =
    typeof searchParams.pageId === "string" ? await findPageById(searchParams.pageId) : null;
  const providers = getWalletResearchProviders();

  return (
    <div className="page-shell stack">
      <section className="card hero-card stack">
        <div className="hero-row">
          <div className="stack compact">
            <div className="chip-row">
              <span className="pill">Wallet</span>
              <span className="trust-badge">Managed beta wallet</span>
              <span className="trust-badge soft">No transfers yet</span>
            </div>
            <h1>{wallet.walletLabel}</h1>
            <p className="muted">
              Your verified-human account now comes with a managed wallet for x402-style tool usage,
              spending controls, and provider access without separate crypto setup.
            </p>
          </div>
          <div className="action-row">
            <Link className="button secondary" href="/install-extension">
              Back to install flow
            </Link>
          </div>
        </div>

        <div className="metric-grid">
          <div className="stat-card">
            <strong>{formatUsd(wallet.availableCreditUsdCents)}</strong>
            <span className="muted">Available credit</span>
          </div>
          <div className="stat-card">
            <strong>{formatUsd(wallet.spentTodayUsdCents)}</strong>
            <span className="muted">Spent today</span>
          </div>
          <div className="stat-card">
            <strong>{formatUsd(wallet.dailySpendLimitUsdCents)}</strong>
            <span className="muted">Daily cap</span>
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
            <span className="muted small-copy">Auth mode</span>
            <strong>{wallet.passkeyReady ? "Passkey-ready beta" : "Managed beta"}</strong>
          </div>
          <div className="wallet-meta-card">
            <span className="muted small-copy">Status</span>
            <strong>{wallet.status}</strong>
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

      <section className="card stack">
        <div className="section-header">
          <h2>Provider access</h2>
          <span className="muted">The wallet can unlock one-click research actions with no crypto UX.</span>
        </div>
        <div className="topic-grid">
          {providers.map((provider) => (
            <article className="topic-card" key={provider.id}>
              <div className="chip-row">
                <span className="trust-badge">{provider.label}</span>
                <span
                  className={
                    wallet.enabledProviders.includes(provider.id) ? "pill" : "trust-badge soft"
                  }
                >
                  {wallet.enabledProviders.includes(provider.id) ? "Enabled" : "Disabled"}
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
        {sourcePage ? (
          <div className="stack">
            <div className="wallet-meta-card">
              <span className="muted small-copy">Selected page</span>
              <strong>{sourcePage.title}</strong>
              <span className="muted">{sourcePage.host}</span>
            </div>
            <WalletResearchAction
              enabledProviders={wallet.enabledProviders}
              initialProviderId={wallet.defaultProvider}
              pageId={sourcePage.id}
              providers={providers}
            />
          </div>
        ) : (
          <p className="muted">
            Start from a Human Layer page thread and tap <strong>Research with wallet</strong> to run this flow.
          </p>
        )}
      </section>

      <section className="card stack">
        <div className="section-header">
          <h2>Payment history</h2>
          <span className="muted">x402-style events recorded against this wallet.</span>
        </div>
        {wallet.paymentHistory.length > 0 ? (
          <div className="stack compact">
            {wallet.paymentHistory.map((event) => (
              <div className="wallet-history-item" key={event.id}>
                <div className="stack compact">
                  <strong>{event.description ?? event.kind}</strong>
                  <span className="muted small-copy">
                    {event.provider ? event.provider + " • " : ""}
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
    </div>
  );
}

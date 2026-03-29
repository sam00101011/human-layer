import Link from "next/link";
import { ensureManagedWalletForProfile } from "@human-layer/db";

import { InstallExtensionStatus } from "../../components/install-extension-status";
import { getAuthenticatedProfileFromCookies } from "../lib/auth";

const extensionDownloadPath = "/downloads/human-layer-extension-hackathon.zip";

export default async function InstallExtensionPage(props: {
  searchParams: Promise<{ next?: string; source?: string }>;
}) {
  const searchParams = await props.searchParams;
  const nextPath =
    typeof searchParams.next === "string" && searchParams.next.startsWith("/")
      ? searchParams.next
      : "/";
  const source = searchParams.source?.trim();
  const viewer = await getAuthenticatedProfileFromCookies();
  const wallet = viewer
    ? await ensureManagedWalletForProfile({
        profileId: viewer.id,
        handle: viewer.handle
      })
    : null;

  return (
    <div className="page-shell stack legal-shell">
      <span className="pill">Install extension</span>
      <InstallExtensionStatus
        downloadPath={extensionDownloadPath}
        nextPath={nextPath}
        source={source}
      />

      {wallet ? (
        <section className="card stack">
          <div className="section-header">
            <h2>Your wallet is ready</h2>
            <span className="muted">Managed beta wallet with built-in paid tool access.</span>
          </div>
          <div className="metric-grid">
            <div className="stat-card">
              <strong>{"$" + (wallet.availableCreditUsdCents / 100).toFixed(2)}</strong>
              <span className="muted">Available credit</span>
            </div>
            <div className="stat-card">
              <strong>{"$" + (wallet.dailySpendLimitUsdCents / 100).toFixed(2)}</strong>
              <span className="muted">Daily cap</span>
            </div>
          </div>
          <p className="muted">
            Verification now auto-provisions your Human Layer wallet, so you can unlock x402-style
            research and tool usage without separate crypto setup.
          </p>
          <div className="chip-row">
            <Link className="button" href="/wallet">
              Open wallet
            </Link>
            <span className="trust-badge soft">{wallet.walletAddress}</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}

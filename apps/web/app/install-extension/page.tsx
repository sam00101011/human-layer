import Link from "next/link";
import { getAtprotoAccountSnapshot, getManagedWalletSnapshot } from "@human-layer/db";

import { AtprotoIdentityPanel } from "../../components/atproto-identity-panel";
import { InstallExtensionStatus } from "../../components/install-extension-status";
import { PasskeyWalletCard } from "../../components/passkey-wallet-card";
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
  const wallet = viewer ? await getManagedWalletSnapshot(viewer.id) : null;
  const identity = viewer ? await getAtprotoAccountSnapshot(viewer.id) : null;

  return (
    <div className="page-shell stack legal-shell">
      <span className="pill">Install extension</span>
      <InstallExtensionStatus
        downloadPath={extensionDownloadPath}
        nextPath={nextPath}
        source={source}
      />

      {viewer ? (
        <section className="card stack">
          <div className="section-header">
            <h2>{wallet ? "Passkey wallet linked" : "Connect your passkey wallet"}</h2>
            <span className="muted">
              Verify first, then create or connect a Base wallet from this device.
            </span>
          </div>
          <p className="muted">
            Human Layer stores your linked wallet address, wallet type, and spend settings. Your wallet keys
            stay on the device behind the passkey flow.
          </p>
          <PasskeyWalletCard
            compact
            linkedNetwork={wallet?.network ?? null}
            linkedStatus={wallet?.status ?? null}
            linkedWalletAddress={wallet?.walletAddress ?? null}
            linkedWalletProvider={wallet?.walletProvider ?? null}
            linkedWalletType={wallet?.walletType ?? null}
          />
          {wallet ? (
            <div className="action-row">
              <Link className="button" href="/wallet">
                Open wallet
              </Link>
              <span className="trust-badge soft">{wallet.walletAddress}</span>
            </div>
          ) : null}
        </section>
      ) : null}

      {viewer ? <AtprotoIdentityPanel compact initialIdentity={identity} /> : null}
    </div>
  );
}

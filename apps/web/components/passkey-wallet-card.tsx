"use client";

import { useState } from "react";
import { useAccount, useConnect } from "wagmi";

import { getWalletConnectErrorMessage } from "../app/lib/wallet-connect-errors";

type PasskeyWalletCardProps = {
  linkedWalletAddress?: string | null;
  linkedWalletProvider?: string | null;
  linkedWalletType?: string | null;
  linkedNetwork?: string | null;
  linkedStatus?: string | null;
  compact?: boolean;
};

type LinkedWalletResponse = {
  ok: true;
  wallet: {
    walletAddress: string;
  };
};

function formatAddress(value: string) {
  return value.slice(0, 6) + "..." + value.slice(-4);
}

export function PasskeyWalletCard({
  linkedWalletAddress,
  linkedWalletProvider,
  linkedWalletType,
  linkedNetwork,
  linkedStatus,
  compact = false
}: PasskeyWalletCardProps) {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const coinbaseConnector = connectors[0] ?? null;
  const connectedAddress = address?.toLowerCase() ?? null;
  const linkedAddress = linkedWalletAddress?.toLowerCase() ?? null;
  const matchesLinkedWallet = Boolean(connectedAddress && linkedAddress && connectedAddress === linkedAddress);

  async function linkWallet(walletAddress: string) {
    setLinking(true);
    setError(null);
    setStatus("Linking wallet…");

    const response = await fetch("/api/wallet/link", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        walletAddress,
        walletProvider: "coinbase_smart_wallet",
        walletType: "passkey_smart_wallet",
        network: "base"
      })
    }).catch(() => null);

    if (!response) {
      setLinking(false);
      setStatus(null);
      setError("Could not reach the wallet link route.");
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setLinking(false);
      setStatus(null);
      setError(payload?.error ?? "Could not link your wallet.");
      return;
    }

    const payload = (await response.json()) as LinkedWalletResponse;
    setLinking(false);
    setStatus("Wallet linked: " + formatAddress(payload.wallet.walletAddress));
    window.location.reload();
  }

  async function handleConnect() {
    if (!coinbaseConnector) {
      setError("Coinbase Smart Wallet is not available in this browser.");
      return;
    }

    setError(null);
    setStatus("Opening Coinbase Smart Wallet…");

    try {
      const result = await connectAsync({ connector: coinbaseConnector });
      const nextAddress = result.accounts[0];
      if (!nextAddress) {
        setStatus(null);
        setError("Wallet connected, but no address was returned.");
        return;
      }

      await linkWallet(nextAddress);
    } catch (nextError) {
      setStatus(null);
      setError(getWalletConnectErrorMessage(nextError));
    }
  }

  async function handleRelinkConnectedWallet() {
    if (!connectedAddress) {
      await handleConnect();
      return;
    }

    await linkWallet(connectedAddress);
  }

  return (
    <section className={compact ? "stack compact" : "card stack"}>
      {!compact ? (
        <div className="section-header">
          <h2>Passkey wallet</h2>
          <span className="muted">Provision and link a user-owned Base wallet directly from this browser.</span>
        </div>
      ) : null}

      <div className="chip-row">
        <span className="trust-badge">
          {linkedAddress ? "Wallet linked" : "Wallet not linked"}
        </span>
        <span className={isConnected ? "pill" : "trust-badge soft"}>
          {isConnected ? "Wallet connected" : "Not connected"}
        </span>
        {linkedNetwork ? <span className="trust-badge soft">{linkedNetwork}</span> : null}
      </div>

      {linkedAddress ? (
        <div className="wallet-meta-card">
          <span className="muted small-copy">Linked wallet</span>
          <code>{linkedWalletAddress}</code>
          <span className="muted small-copy">
            {(linkedWalletProvider ?? "coinbase_smart_wallet").replace(/_/g, " ")} •{" "}
            {(linkedWalletType ?? "passkey_smart_wallet").replace(/_/g, " ")} •{" "}
            {linkedStatus ?? "linked"}
          </span>
        </div>
      ) : (
        <p className="muted">
          Your Base passkey wallet lives on your device. Human Layer only stores the linked address,
          wallet type, and spend settings.
        </p>
      )}

      {isConnected && connectedAddress && !matchesLinkedWallet ? (
        <div className="wallet-meta-card">
          <span className="muted small-copy">Connected in browser</span>
          <code>{connectedAddress}</code>
        </div>
      ) : null}

      <div className="action-row">
        <button className="button" disabled={isPending || linking} onClick={() => void handleConnect()} type="button">
          {isPending || linking ? "Connecting…" : "Create or connect passkey wallet"}
        </button>
        {isConnected && connectedAddress && !matchesLinkedWallet ? (
          <button
            className="button secondary"
            disabled={linking}
            onClick={() => void handleRelinkConnectedWallet()}
            type="button"
          >
            {linking ? "Linking…" : "Use connected wallet"}
          </button>
        ) : null}
      </div>

      {status ? <span className="success-message">{status}</span> : null}
      {error ? <span className="error-message">{error}</span> : null}
    </section>
  );
}

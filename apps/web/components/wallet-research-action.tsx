"use client";

import type { PageSummary, ThreadSnapshot } from "@human-layer/core";
import type { ManagedWalletProviderId } from "@human-layer/db";
import { useMemo, useState } from "react";
import { useAccount, useConnect, usePublicClient, useWalletClient } from "wagmi";

import {
  createClientWalletPaymentFetch,
  runClientWalletResearch,
  type WalletResearchResult
} from "../app/lib/wallet-tools";
import { getWalletConnectErrorMessage } from "../app/lib/wallet-connect-errors";

type ProviderOption = {
  id: ManagedWalletProviderId;
  label: string;
  priceUsdCents: number;
  description: string;
  executionMode: "wallet_signed_x402" | "preview";
};

type RecordedResearchResponse = {
  ok: true;
  payment: {
    eventId: string;
    remainingDailyBudgetUsdCents: number;
  };
  result: WalletResearchResult;
};

type WalletResearchActionProps = {
  pageId: string;
  page: Pick<PageSummary, "id" | "pageKind" | "canonicalUrl" | "host" | "title">;
  thread: ThreadSnapshot;
  linkedWalletAddress?: string | null;
  initialProviderId: string;
  enabledProviders: string[];
  providers: ProviderOption[];
};

function formatUsd(cents: number) {
  return "$" + (cents / 100).toFixed(2);
}

export function WalletResearchAction({
  pageId,
  page,
  thread,
  linkedWalletAddress,
  initialProviderId,
  enabledProviders,
  providers
}: WalletResearchActionProps) {
  const { address } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const visibleProviders = useMemo(
    () => providers.filter((provider) => enabledProviders.includes(provider.id)),
    [enabledProviders, providers]
  );
  const [providerId, setProviderId] = useState(
    visibleProviders.find((provider) => provider.id === initialProviderId)?.id ??
      visibleProviders[0]?.id ??
      initialProviderId
  );
  const [status, setStatus] = useState<"idle" | "connecting" | "running">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecordedResearchResponse | null>(null);

  const coinbaseConnector = connectors[0] ?? null;
  const currentProvider = visibleProviders.find((provider) => provider.id === providerId) ?? null;
  const linkedAddress = linkedWalletAddress?.toLowerCase() ?? null;

  async function linkWallet(walletAddress: string) {
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
      throw new Error("Could not reach the wallet link route.");
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Could not link your wallet.");
    }
  }

  async function ensureConnectedAddress(): Promise<`0x${string}` | null> {
    const existing = address?.toLowerCase();
    if (existing) {
      return existing as `0x${string}`;
    }

    if (!coinbaseConnector) {
      setError("Coinbase Smart Wallet is not available in this browser.");
      return null;
    }

    setStatus("connecting");

    try {
      const connection = await connectAsync({ connector: coinbaseConnector });
      const nextAddress = connection.accounts[0]?.toLowerCase();
      if (!nextAddress) {
        setError("Wallet connected, but no address was returned.");
        setStatus("idle");
        return null;
      }

      setStatus("idle");
      return nextAddress as `0x${string}`;
    } catch (nextError) {
      setError(getWalletConnectErrorMessage(nextError));
      setStatus("idle");
      return null;
    }
  }

  async function handleRun() {
    if (status !== "idle") return;

    if (!currentProvider) {
      setError("Enable at least one provider first.");
      return;
    }

    setStatus("running");
    setError(null);

    const connectedAddress = await ensureConnectedAddress();
    if (!connectedAddress) {
      return;
    }

    try {
      if (!linkedAddress || linkedAddress !== connectedAddress) {
        await linkWallet(connectedAddress);
      }

      if (!walletClient || !publicClient) {
        setStatus("idle");
        setError("Wallet connected. Click once more to sign the payment request.");
        return;
      }

      const paymentFetch =
        currentProvider.executionMode === "wallet_signed_x402"
          ? createClientWalletPaymentFetch({
              address: connectedAddress,
              signTypedData: (message) =>
                (
                  walletClient as {
                    signTypedData(args: Record<string, unknown>): Promise<`0x${string}`>;
                    account?: { address?: `0x${string}` };
                  }
                ).signTypedData({
                  account: walletClient.account?.address ?? connectedAddress,
                  domain: message.domain,
                  types: message.types,
                  primaryType: message.primaryType,
                  message: message.message
                }),
              publicClient: {
                readContract: (args) => publicClient.readContract(args as never),
                getTransactionCount: (args) => publicClient.getTransactionCount(args),
                estimateFeesPerGas: () => publicClient.estimateFeesPerGas()
              }
            })
          : null;

      const execution = await runClientWalletResearch({
        page,
        thread,
        providerId: currentProvider.id,
        paymentFetch
      });

      const response = await fetch("/api/wallet/research", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          pageId,
          provider: currentProvider.id,
          amountUsdCents: execution.chargedUsdCents,
          paymentRail: execution.paymentRail,
          paymentResponseHeader: execution.paymentResponseHeader,
          result: execution.result
        })
      }).catch(() => null);

      if (!response) {
        setStatus("idle");
        setError("Could not record the wallet research action.");
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

      const payload = (await response.json()) as RecordedResearchResponse;
      setResult(payload);
      setStatus("idle");
    } catch (nextError) {
      setStatus("idle");
      setError(nextError instanceof Error ? nextError.message : "Could not run wallet research.");
    }
  }

  return (
    <div className="stack">
      <label className="stack compact">
        <span className="muted small-copy">Research provider</span>
        <select
          className="input-field"
          onChange={(event) => setProviderId(event.target.value as ManagedWalletProviderId)}
          value={providerId}
        >
          {visibleProviders.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.label + " • " + formatUsd(provider.priceUsdCents)}
            </option>
          ))}
        </select>
      </label>

      {currentProvider ? (
        <>
          <p className="muted small-copy">{currentProvider.description}</p>
          <div className="chip-row">
            <span className="trust-badge soft">
              {currentProvider.executionMode === "wallet_signed_x402" ? "Wallet-signed x402" : "Preview only"}
            </span>
          </div>
        </>
      ) : null}

      <button className="button" disabled={isPending || status !== "idle"} onClick={() => void handleRun()} type="button">
        {status === "connecting"
          ? "Connecting wallet..."
          : status === "running"
            ? "Running research..."
            : "Research this page"}
      </button>

      {error ? <span className="error-message">{error}</span> : null}

      {result ? (
        <div className="wallet-research-result stack">
          <div className="chip-row">
            <span className="pill">Wallet result</span>
            <span className="trust-badge">{result.result.providerLabel}</span>
            <span className="trust-badge soft">
              {result.result.mode === "live"
                ? formatUsd(result.result.priceUsdCents) + " spent"
                : "Free preview"}
            </span>
            <span className="trust-badge soft">
              {formatUsd(result.payment.remainingDailyBudgetUsdCents)} budget left today
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

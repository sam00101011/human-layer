"use client";

import type { ManagedWalletProviderId } from "@human-layer/db";
import { useMemo, useState } from "react";
import { useAccount, useConnect, usePublicClient, useWalletClient } from "wagmi";

import { getWalletConnectErrorMessage } from "../app/lib/wallet-connect-errors";
import {
  createClientWalletPaymentFetch,
  getWalletCommandPresets,
  getWalletResearchProvider,
  parseWalletCommand,
  runClientWalletCommand,
  type WalletResearchResult
} from "../app/lib/wallet-tools";

type ProviderOption = {
  id: ManagedWalletProviderId;
  label: string;
  priceUsdCents: number;
  description: string;
  executionMode: "wallet_signed_x402" | "preview";
};

type WalletCommandConsoleProps = {
  enabledProviders: string[];
  linkedWalletAddress?: string | null;
  providers: ProviderOption[];
};

type RecordedResearchResponse = {
  ok: true;
  payment: {
    eventId: string;
    remainingDailyBudgetUsdCents: number;
  };
  result: WalletResearchResult;
};

function formatUsd(cents: number) {
  return "$" + (cents / 100).toFixed(2);
}

function truncate(value: string, maxLength = 80) {
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "…";
}

export function WalletCommandConsole({
  enabledProviders,
  linkedWalletAddress,
  providers
}: WalletCommandConsoleProps) {
  const presets = getWalletCommandPresets();
  const { address } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [commandInput, setCommandInput] = useState(presets[0]?.example ?? "");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "running">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecordedResearchResponse | null>(null);

  const parsed = useMemo(() => parseWalletCommand(commandInput), [commandInput]);
  const provider =
    parsed && enabledProviders.includes(parsed.providerId)
      ? providers.find((item) => item.id === parsed.providerId) ?? getWalletResearchProvider(parsed.providerId)
      : null;
  const linkedAddress = linkedWalletAddress?.toLowerCase() ?? null;
  const coinbaseConnector = connectors[0] ?? null;

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
    setError(null);

    try {
      const connection = await connectAsync({ connector: coinbaseConnector });
      const nextAddress = connection.accounts[0]?.toLowerCase();
      if (!nextAddress) {
        setStatus("idle");
        setError("Wallet connected, but no address was returned.");
        return null;
      }

      setStatus("idle");
      return nextAddress as `0x${string}`;
    } catch (nextError) {
      setStatus("idle");
      setError(getWalletConnectErrorMessage(nextError));
      return null;
    }
  }

  function handleReview() {
    if (!parsed) {
      setError("Try a preset like StableEnrich / Answer or Twit.sh search, then add your query.");
      return;
    }

    if (!parsed.query) {
      setError("Add a query after the command before you continue.");
      return;
    }

    if (!enabledProviders.includes(parsed.providerId)) {
      setError("Enable that provider in wallet settings first.");
      return;
    }

    setError(null);
    setResult(null);
    setOpen(true);
  }

  async function handleRun() {
    if (!parsed || !provider || status !== "idle") return;

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
        provider.executionMode === "wallet_signed_x402"
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

      const execution = await runClientWalletCommand({
        providerId: parsed.providerId,
        query: parsed.query,
        paymentFetch
      });

      const response = await fetch("/api/wallet/research", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          provider: parsed.providerId,
          amountUsdCents: execution.chargedUsdCents,
          paymentRail: execution.paymentRail,
          paymentResponseHeader: execution.paymentResponseHeader,
          description: provider.label + ": " + truncate(parsed.query),
          metadata: {
            command: parsed.command,
            query: parsed.query
          },
          result: execution.result
        })
      }).catch(() => null);

      if (!response) {
        setStatus("idle");
        setError("Could not record the wallet action.");
        return;
      }

      if (response.status === 401) {
        window.location.href = "/verify?returnUrl=" + encodeURIComponent(window.location.href);
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatus("idle");
        setError(payload?.error ?? "Could not run the wallet command.");
        return;
      }

      const payload = (await response.json()) as RecordedResearchResponse;
      setResult(payload);
      setStatus("idle");
    } catch (nextError) {
      setStatus("idle");
      setError(nextError instanceof Error ? nextError.message : "Could not run the wallet command.");
    }
  }

  return (
    <>
      <section className="card stack">
        <div className="section-header">
          <div className="stack compact">
            <h2>Command line</h2>
            <span className="muted">
              Type a provider command and approve the wallet signature when you are ready.
            </span>
          </div>
        </div>
        <div className="wallet-command-bar">
          <span className="wallet-command-prompt">wallet$</span>
          <input
            className="wallet-command-input"
            list="wallet-command-presets"
            onChange={(event) => setCommandInput(event.target.value)}
            placeholder="StableEnrich / Answer Why does this page matter?"
            value={commandInput}
          />
          <button className="button" onClick={handleReview} type="button">
            Review
          </button>
        </div>
        <datalist id="wallet-command-presets">
          {presets.map((preset) => (
            <option key={preset.id} value={preset.example} />
          ))}
        </datalist>
        <div className="chip-row">
          {presets.map((preset) => (
            <button className="chip" key={preset.id} onClick={() => setCommandInput(preset.example)} type="button">
              {preset.command}
            </button>
          ))}
        </div>
        {error ? <span className="error-message">{error}</span> : null}
      </section>

      {open ? (
        <div aria-modal="true" className="modal-backdrop" onClick={() => setOpen(false)} role="dialog">
          <div className="modal-card stack" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div className="stack compact">
                <div className="chip-row">
                  <span className="pill">Wallet action</span>
                  {provider ? <span className="trust-badge">{provider.label}</span> : null}
                  {provider ? <span className="trust-badge soft">{formatUsd(provider.priceUsdCents)}</span> : null}
                </div>
                <h2>Review this wallet action</h2>
                <p className="muted">
                  Human Layer will run the command below, show the result here, and record the action in your wallet history.
                </p>
              </div>
              <button className="modal-close" onClick={() => setOpen(false)} type="button">
                Close
              </button>
            </div>

            {parsed ? (
              <div className="wallet-meta-card">
                <span className="muted small-copy">Command</span>
                <strong>{parsed.command}</strong>
                <code>{parsed.query}</code>
              </div>
            ) : null}

            {provider ? (
              <div className="trust-card">
                <span className="trust-badge soft">
                  {provider.executionMode === "wallet_signed_x402" ? "Wallet-signed x402" : "Preview"}
                </span>
                <p>{provider.description}</p>
              </div>
            ) : null}

            <div className="action-row">
              <button
                className="button"
                disabled={!parsed || !provider || status !== "idle" || isPending}
                onClick={() => void handleRun()}
                type="button"
              >
                {status === "connecting"
                  ? "Connecting wallet..."
                  : status === "running"
                    ? "Running..."
                    : "Accept, sign with wallet"}
              </button>
            </div>

            {error ? <span className="error-message">{error}</span> : null}

            {result ? (
              <div className="stack">
                <div className="wallet-meta-card">
                  <span className="muted small-copy">Result</span>
                  <strong>{result.result.summary}</strong>
                  <span className="muted">{result.result.whyItMatters}</span>
                </div>
                <ul className="signal-list">
                  {result.result.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                {result.result.citations.length > 0 ? (
                  <div className="link-row">
                    {result.result.citations.map((citation) => (
                      <a className="inline-link" href={citation.url} key={citation.url + citation.label} rel="noreferrer" target="_blank">
                        {citation.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

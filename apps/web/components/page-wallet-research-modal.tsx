"use client";

import type { PageSummary, ThreadSnapshot } from "@human-layer/core";
import type { ManagedWalletProviderId } from "@human-layer/db";
import { useMemo, useState } from "react";
import Link from "next/link";

import { WalletResearchAction } from "./wallet-research-action";

type ProviderOption = {
  id: ManagedWalletProviderId;
  label: string;
  priceUsdCents: number;
  description: string;
  executionMode: "wallet_signed_x402" | "preview";
};

type PageWalletResearchModalProps = {
  pageId: string;
  page: Pick<PageSummary, "id" | "pageKind" | "canonicalUrl" | "host" | "title">;
  thread: ThreadSnapshot;
  linkedWalletAddress?: string | null;
  initialProviderId?: string | null;
  enabledProviders?: string[] | null;
  providers: ProviderOption[];
};

function formatUsd(cents: number) {
  return "$" + (cents / 100).toFixed(2);
}

export function PageWalletResearchModal({
  pageId,
  page,
  thread,
  linkedWalletAddress,
  initialProviderId,
  enabledProviders,
  providers
}: PageWalletResearchModalProps) {
  const [open, setOpen] = useState(false);
  const visibleProviders = useMemo(() => {
    if (!enabledProviders || enabledProviders.length === 0) {
      return providers;
    }

    return providers.filter((provider) => enabledProviders.includes(provider.id));
  }, [enabledProviders, providers]);

  const defaultProvider =
    visibleProviders.find((provider) => provider.id === initialProviderId) ??
    visibleProviders[0] ??
    null;

  return (
    <>
      <button className="button secondary" onClick={() => setOpen(true)} type="button">
        Research with wallet
      </button>
      {open ? (
        <div
          aria-modal="true"
          className="modal-backdrop"
          onClick={() => setOpen(false)}
          role="dialog"
        >
          <div className="modal-card stack" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div className="stack compact">
                <div className="chip-row">
                  <span className="pill">Wallet research</span>
                  {defaultProvider ? (
                    <span className="trust-badge">
                      {defaultProvider.label} • {formatUsd(defaultProvider.priceUsdCents)}
                    </span>
                  ) : null}
                </div>
                <h2>Review this page with your wallet</h2>
                <p className="muted">
                  Human Layer will summarize this page, check the surrounding signal, and record the
                  paid action in your wallet history. You stay in control: the next step is an explicit
                  wallet signature from this browser.
                </p>
              </div>
              <button className="modal-close" onClick={() => setOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className="wallet-meta-card">
              <span className="muted small-copy">Page</span>
              <strong>{page.title}</strong>
              <span className="muted">
                {page.host} • {page.pageKind.replace(/_/g, " ")}
              </span>
            </div>

            {defaultProvider ? (
              <div className="trust-card">
                <span className="trust-badge soft">
                  {defaultProvider.executionMode === "wallet_signed_x402" ? "Wallet-signed x402" : "Preview"}
                </span>
                <p>{defaultProvider.description}</p>
              </div>
            ) : null}

            {enabledProviders && enabledProviders.length > 0 ? (
              <WalletResearchAction
                enabledProviders={enabledProviders}
                initialProviderId={initialProviderId ?? enabledProviders[0] ?? providers[0]?.id ?? "stableenrich_answer"}
                linkedWalletAddress={linkedWalletAddress}
                page={page}
                pageId={pageId}
                providers={providers}
                submitLabel="Accept, sign with wallet"
                thread={thread}
              />
            ) : (
              <div className="stack compact">
                <p className="muted">
                  Link your wallet first, then come back here to sign a page research action.
                </p>
                <div className="action-row">
                  <Link className="button" href={`/wallet?pageId=${encodeURIComponent(pageId)}`}>
                    Open wallet
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

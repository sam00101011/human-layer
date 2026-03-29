import { buildPageContextSummary, type ThreadSnapshot } from "@human-layer/core";
import type { ManagedWalletProviderId, StoredPage } from "@human-layer/db";

export type WalletResearchProvider = {
  id: ManagedWalletProviderId;
  label: string;
  description: string;
  priceUsdCents: number;
};

export type WalletResearchResult = {
  providerId: ManagedWalletProviderId;
  providerLabel: string;
  priceUsdCents: number;
  mode: "preview";
  query: string;
  summary: string;
  whyItMatters: string;
  bullets: string[];
  citations: Array<{ label: string; url: string }>;
};

const providers: Record<ManagedWalletProviderId, WalletResearchProvider> = {
  exa: {
    id: "exa",
    label: "Exa research",
    description: "Fast page-aware research with citations and adjacent context.",
    priceUsdCents: 15
  },
  perplexity: {
    id: "perplexity",
    label: "Perplexity browse",
    description: "Question answering with concise citations for the current page.",
    priceUsdCents: 20
  },
  opus_46: {
    id: "opus_46",
    label: "Opus 4.6 synthesis",
    description: "Deeper synthesis for when a page needs stronger judgment and framing.",
    priceUsdCents: 35
  }
};

function pickDominantVerdict(verdictCounts: ThreadSnapshot["verdictCounts"]) {
  return Object.entries(verdictCounts).sort((left, right) => right[1] - left[1])[0];
}

export function getWalletResearchProviders(): WalletResearchProvider[] {
  return Object.values(providers);
}

export function getWalletResearchProvider(providerId: ManagedWalletProviderId): WalletResearchProvider {
  return providers[providerId];
}

export function buildWalletResearchPreview(params: {
  page: StoredPage;
  thread: ThreadSnapshot;
  providerId: ManagedWalletProviderId;
}): WalletResearchResult {
  const provider = getWalletResearchProvider(params.providerId);
  const context = buildPageContextSummary({
    page: params.page,
    thread: params.thread
  });
  const dominantVerdict = pickDominantVerdict(params.thread.verdictCounts);
  const bullets = [
    "This is a " + params.page.pageKind.replace(/_/g, " ") + " on " + params.page.host + ".",
    dominantVerdict && dominantVerdict[1] > 0
      ? "Verified humans lean " + dominantVerdict[0] + " here with " + dominantVerdict[1] + " recorded verdict" + (dominantVerdict[1] === 1 ? "" : "s") + "."
      : "There is no dominant verdict yet, so the strongest signal is still emerging.",
    params.thread.topHumanTake
      ? "The top take from @" + params.thread.topHumanTake.profileHandle + " has " + params.thread.topHumanTake.helpfulCount + " helpful vote" + (params.thread.topHumanTake.helpfulCount === 1 ? "" : "s") + "."
      : "There is no top take yet, which makes this a good candidate for first-pass research."
  ];

  if (context.tags.length > 0) {
    bullets.push("The page clusters around " + context.tags.slice(0, 3).join(", ") + ".");
  }

  return {
    providerId: provider.id,
    providerLabel: provider.label,
    priceUsdCents: provider.priceUsdCents,
    mode: "preview",
    query:
      "Research why " +
      params.page.title +
      " matters, what a verified human should pay attention to, and what to do next.",
    summary: context.summary,
    whyItMatters:
      params.thread.topHumanTake?.body ??
      "Human Layer can turn this page into a reusable verified-human note instead of a one-off tab.",
    bullets,
    citations: [
      {
        label: "Source page",
        url: params.page.canonicalUrl
      },
      {
        label: "Human Layer thread",
        url: "/pages/" + params.page.id
      }
    ]
  };
}

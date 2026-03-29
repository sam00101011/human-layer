import { buildPageContextSummary, type PageSummary, type ThreadSnapshot } from "@human-layer/core";
import type { ManagedWalletProviderId } from "@human-layer/db";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";

export type WalletResearchPageInput = Pick<
  PageSummary,
  "id" | "pageKind" | "canonicalUrl" | "host" | "title"
>;

export type WalletResearchProvider = {
  id: ManagedWalletProviderId;
  label: string;
  description: string;
  priceUsdCents: number;
  executionMode: "wallet_signed_x402" | "preview";
  hidden?: boolean;
};

export type WalletResearchResult = {
  providerId: ManagedWalletProviderId;
  providerLabel: string;
  priceUsdCents: number;
  mode: "preview" | "live";
  query: string;
  summary: string;
  whyItMatters: string;
  bullets: string[];
  citations: Array<{ label: string; url: string }>;
};

export type WalletResearchExecution = {
  result: WalletResearchResult;
  chargedUsdCents: number;
  paymentRail: "wallet_signed_x402" | "preview";
  paymentResponseHeader: string | null;
};

type WalletPaymentFetch = typeof fetch;
type GenericRecord = Record<string, unknown>;

type ClientWalletPaymentContext = {
  address: `0x${string}`;
  signTypedData(message: {
    domain: Record<string, unknown>;
    types: Record<string, unknown>;
    primaryType: string;
    message: Record<string, unknown>;
  }): Promise<`0x${string}`>;
  publicClient?: {
    readContract(args: {
      address: `0x${string}`;
      abi: readonly unknown[];
      functionName: string;
      args?: readonly unknown[];
    }): Promise<unknown>;
    getTransactionCount?(args: { address: `0x${string}` }): Promise<number>;
    estimateFeesPerGas?(): Promise<{
      maxFeePerGas: bigint;
      maxPriorityFeePerGas: bigint;
    }>;
  };
  network?: `${string}:${string}`;
};

const providers: Record<ManagedWalletProviderId, WalletResearchProvider> = {
  exa: {
    id: "exa",
    label: "Exa / Direct",
    description:
      "Planned direct gateway integration. In the client-owned wallet flow this stays as a preview while native x402 research runs through StableEnrich.",
    priceUsdCents: 15,
    executionMode: "preview"
  },
  perplexity: {
    id: "perplexity",
    label: "Perplexity / Direct",
    description:
      "Planned direct gateway integration. Preview-only for now in the passkey wallet flow.",
    priceUsdCents: 20,
    executionMode: "preview"
  },
  opus_46: {
    id: "opus_46",
    label: "Claude / Opus / Direct",
    description:
      "Planned deep-synthesis gateway integration. Preview-only for now in the passkey wallet flow.",
    priceUsdCents: 35,
    executionMode: "preview"
  },
  stableenrich_answer: {
    id: "stableenrich_answer",
    label: "StableEnrich / Answer",
    description:
      "Wallet-signed x402 answer flow with quick cited synthesis for the page in front of you.",
    priceUsdCents: 1,
    executionMode: "wallet_signed_x402"
  },
  stableenrich_search: {
    id: "stableenrich_search",
    label: "StableEnrich / Search",
    description:
      "Wallet-signed x402 web search for adjacent sources, supporting links, and citations.",
    priceUsdCents: 1,
    executionMode: "wallet_signed_x402"
  },
  stableenrich_contents: {
    id: "stableenrich_contents",
    label: "StableEnrich / Contents",
    description:
      "Wallet-signed x402 page-content extraction tuned to the specific URL you are viewing.",
    priceUsdCents: 1,
    executionMode: "wallet_signed_x402"
  },
  anybrowse_scrape: {
    id: "anybrowse_scrape",
    label: "anybrowse / Scrape",
    description:
      "Wallet-signed x402 scrape-to-markdown for hard pages, rendered apps, and cleaner context.",
    priceUsdCents: 1,
    executionMode: "wallet_signed_x402"
  },
  stableclaude_giga: {
    id: "stableclaude_giga",
    label: "StableClaude / Giga",
    description:
      "Wallet-signed x402 async deep-research run for when a page needs a heavier agent-style pass.",
    priceUsdCents: 100,
    executionMode: "wallet_signed_x402"
  },
  parallel_search: {
    id: "parallel_search",
    label: "Parallel / Search",
    description:
      "MPP session flow planned next. For now this stays preview-only until delegated Tempo sessions are wired.",
    priceUsdCents: 1,
    executionMode: "preview",
    hidden: true
  },
  twitsh_search: {
    id: "twitsh_search",
    label: "twit.sh / Search",
    description:
      "Wallet-signed x402 X/Twitter search for live conversation, launch chatter, and market context.",
    priceUsdCents: 1,
    executionMode: "wallet_signed_x402"
  }
};

function isRecord(value: unknown): value is GenericRecord {
  return typeof value === "object" && value !== null;
}

function pickDominantVerdict(verdictCounts: ThreadSnapshot["verdictCounts"]) {
  return Object.entries(verdictCounts).sort((left, right) => right[1] - left[1])[0];
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength = 220): string {
  const compact = compactWhitespace(value);
  if (compact.length <= maxLength) {
    return compact;
  }

  return compact.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "…";
}

function stripMarkdown(value: string): string {
  return value
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[>#*_~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toBulletList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => compactWhitespace(item))
    .filter(Boolean)
    .slice(0, 4);
}

function toTextBullets(value: string): string[] {
  const stripped = stripMarkdown(value);
  if (!stripped) return [];

  const lineBullets = value
    .split(/\n+/)
    .map((line) => stripMarkdown(line))
    .filter(Boolean)
    .filter((line) => line.length > 20)
    .slice(0, 4);

  if (lineBullets.length > 0) {
    return lineBullets;
  }

  return stripped
    .split(/(?<=[.!?])\s+/)
    .map((item) => compactWhitespace(item))
    .filter(Boolean)
    .slice(0, 4);
}

function toCitationList(value: unknown): Array<{ label: string; url: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === "string" && item.startsWith("http")) {
        return {
          label: "Source " + String(index + 1),
          url: item
        };
      }

      if (!isRecord(item)) return null;

      const url = typeof item.url === "string" ? item.url : null;
      if (!url || !url.startsWith("http")) return null;

      return {
        label:
          typeof item.label === "string"
            ? item.label
            : typeof item.title === "string"
              ? item.title
              : "Source " + String(index + 1),
        url
      };
    })
    .filter((item): item is { label: string; url: string } => Boolean(item))
    .slice(0, 5);
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  const candidate =
    firstBrace >= 0 && lastBrace > firstBrace ? trimmed.slice(firstBrace, lastBrace + 1) : trimmed;

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function deriveStructuredResult(params: {
  provider: WalletResearchProvider;
  query: string;
  rawText: string;
  citations: Array<{ label: string; url: string }>;
}): WalletResearchResult {
  const parsed = parseJsonObject(params.rawText);
  const summary =
    typeof parsed?.summary === "string"
      ? compactWhitespace(parsed.summary)
      : compactWhitespace(params.rawText.split("\n\n")[0] ?? params.rawText);
  const whyItMatters =
    typeof parsed?.whyItMatters === "string"
      ? compactWhitespace(parsed.whyItMatters)
      : compactWhitespace(params.rawText);
  const structuredBullets = toBulletList(parsed?.bullets);
  const bullets =
    structuredBullets.length > 0 ? structuredBullets : toTextBullets(params.rawText).slice(0, 4);
  const citations = params.citations.length > 0 ? params.citations : toCitationList(parsed?.citations);

  return {
    providerId: params.provider.id,
    providerLabel: params.provider.label,
    priceUsdCents: params.provider.priceUsdCents,
    mode: "live",
    query: params.query,
    summary,
    whyItMatters,
    bullets: bullets.length > 0 ? bullets : [whyItMatters],
    citations
  };
}

function extractRecordArray(value: unknown): GenericRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (!isRecord(value)) return [];

  const candidates = [
    value.results,
    value.data,
    value.tweets,
    value.items,
    value.posts,
    value.records,
    value.matches
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  if (isRecord(value.data)) {
    return extractRecordArray(value.data);
  }

  return [];
}

function getRecordSnippet(record: GenericRecord): string {
  if (typeof record.summary === "string") return truncate(record.summary, 240);

  if (Array.isArray(record.highlights)) {
    const firstHighlight = record.highlights.find((item): item is string => typeof item === "string");
    if (firstHighlight) return truncate(firstHighlight, 240);
  }

  if (typeof record.answer === "string") return truncate(record.answer, 240);
  if (typeof record.markdown === "string") return truncate(stripMarkdown(record.markdown), 240);
  if (typeof record.text === "string") return truncate(stripMarkdown(record.text), 240);
  if (typeof record.content === "string") return truncate(stripMarkdown(record.content), 240);
  if (typeof record.title === "string") return compactWhitespace(record.title);

  return "";
}

function getRecordCitation(record: GenericRecord, index: number): { label: string; url: string } | null {
  const directUrl =
    typeof record.url === "string"
      ? record.url
      : typeof record.permalink === "string"
        ? record.permalink
        : typeof record.link === "string"
          ? record.link
          : null;

  if (directUrl && directUrl.startsWith("http")) {
    return {
      label:
        typeof record.title === "string"
          ? record.title
          : typeof record.username === "string"
            ? "@" + record.username
            : typeof record.author_username === "string"
              ? "@" + record.author_username
              : "Source " + String(index + 1),
      url: directUrl
    };
  }

  const username =
    typeof record.username === "string"
      ? record.username
      : typeof record.author_username === "string"
        ? record.author_username
        : null;
  const id = typeof record.id === "string" ? record.id : null;
  if (username && id) {
    return {
      label: "@" + username,
      url: "https://x.com/" + username + "/status/" + id
    };
  }

  return null;
}

function buildSearchLikeResult(params: {
  provider: WalletResearchProvider;
  query: string;
  records: GenericRecord[];
  fallbackSummary: string;
  fallbackWhy: string;
  fallbackUrl: string;
}): WalletResearchResult | null {
  const snippets = params.records.map(getRecordSnippet).filter(Boolean).slice(0, 4);
  const citations = params.records
    .map((record, index) => getRecordCitation(record, index))
    .filter((item): item is { label: string; url: string } => Boolean(item))
    .slice(0, 5);

  const summary = snippets[0] ?? params.fallbackSummary;
  const whyItMatters = snippets[1] ?? params.fallbackWhy;
  const bullets = snippets.length > 0 ? snippets : toTextBullets(params.fallbackWhy);

  if (!summary && bullets.length === 0 && citations.length === 0) {
    return null;
  }

  return {
    providerId: params.provider.id,
    providerLabel: params.provider.label,
    priceUsdCents: params.provider.priceUsdCents,
    mode: "live",
    query: params.query,
    summary,
    whyItMatters,
    bullets: bullets.length > 0 ? bullets : [params.fallbackWhy],
    citations:
      citations.length > 0
        ? citations
        : [
            {
              label: "Source page",
              url: params.fallbackUrl
            }
          ]
  };
}

function buildResearchQuery(params: {
  page: WalletResearchPageInput;
  thread: ThreadSnapshot;
}): string {
  const dominantVerdict = pickDominantVerdict(params.thread.verdictCounts);
  const verdictText =
    dominantVerdict && dominantVerdict[1] > 0
      ? "Current verified-human lean: " +
        dominantVerdict[0] +
        " (" +
        dominantVerdict[1] +
        " verdict" +
        (dominantVerdict[1] === 1 ? "" : "s") +
        ")."
      : "No dominant verified-human verdict yet.";
  const topTake = params.thread.topHumanTake
    ? "Top take from @" +
      params.thread.topHumanTake.profileHandle +
      ": " +
      params.thread.topHumanTake.body
    : "No top take yet.";

  return [
    "Analyze this page for a verified human using Human Layer.",
    "Page title: " + params.page.title,
    "Page URL: " + params.page.canonicalUrl,
    "Page kind: " + params.page.pageKind.replace(/_/g, " "),
    "Host: " + params.page.host,
    verdictText,
    topTake,
    "Return the strongest summary, why it matters, and 3 to 4 practical bullets with citations."
  ].join("\n");
}

function buildSearchKeywordQuery(params: {
  page: WalletResearchPageInput;
  thread: ThreadSnapshot;
}): string {
  const context = buildPageContextSummary({
    page: params.page,
    thread: params.thread
  });

  return compactWhitespace(
    [
      params.page.title,
      params.page.host,
      params.page.pageKind.replace(/_/g, " "),
      context.tags.slice(0, 3).join(" "),
      params.thread.topHumanTake?.body ?? ""
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildExtractionObjective(params: {
  page: WalletResearchPageInput;
  thread: ThreadSnapshot;
}): string {
  return compactWhitespace(
    [
      "Summarize why this page matters for a verified human.",
      params.thread.topHumanTake ? "Existing top take: " + params.thread.topHumanTake.body : "",
      "Call out practical risks, usefulness, and the strongest supporting evidence."
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildSocialSearchPhrase(params: { page: WalletResearchPageInput }): string {
  return truncate(params.page.title, 100);
}

function getPaymentResponseHeader(response: Response): string | null {
  return response.headers.get("payment-response") ?? response.headers.get("x-payment-response");
}

type LiveExecutionResult = {
  result: WalletResearchResult;
  paymentResponseHeader: string | null;
};

async function callStableEnrichAnswer(params: {
  page: WalletResearchPageInput;
  thread: ThreadSnapshot;
  provider: WalletResearchProvider;
  payFetch: WalletPaymentFetch;
}): Promise<LiveExecutionResult | null> {
  const query = buildResearchQuery(params);
  const response = await params.payFetch("https://stableenrich.dev/api/exa/answer", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      query,
      text: true
    })
  }).catch(() => null);

  if (!response?.ok) return null;

  const payload = (await response.json().catch(() => null)) as GenericRecord | null;
  const answer = typeof payload?.answer === "string" ? compactWhitespace(payload.answer) : "";
  if (!answer) return null;

  const citationBullets = Array.isArray(payload?.citations)
    ? payload.citations
        .filter(isRecord)
        .map((item) => {
          if (typeof item.text === "string") return truncate(item.text, 220);
          if (typeof item.title === "string") return compactWhitespace(item.title);
          return "";
        })
        .filter(Boolean)
        .slice(0, 4)
    : [];

  const citations = toCitationList(payload?.citations);

  return {
    paymentResponseHeader: getPaymentResponseHeader(response),
    result: {
      providerId: params.provider.id,
      providerLabel: params.provider.label,
      priceUsdCents: params.provider.priceUsdCents,
      mode: "live",
      query,
      summary: truncate(answer, 220),
      whyItMatters: answer,
      bullets: citationBullets.length > 0 ? citationBullets : toTextBullets(answer),
      citations:
        citations.length > 0
          ? citations
          : [
              {
                label: "Source page",
                url: params.page.canonicalUrl
              }
            ]
    }
  };
}

async function callStableEnrichSearch(params: {
  page: WalletResearchPageInput;
  thread: ThreadSnapshot;
  provider: WalletResearchProvider;
  payFetch: WalletPaymentFetch;
}): Promise<LiveExecutionResult | null> {
  const query = buildSearchKeywordQuery(params);
  const objective = buildExtractionObjective(params);
  const response = await params.payFetch("https://stableenrich.dev/api/exa/search", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      query,
      numResults: 4,
      type: "auto",
      contents: {
        highlights: {
          query: objective,
          numSentences: 2,
          highlightsPerUrl: 1
        },
        summary: {
          query: objective
        }
      }
    })
  }).catch(() => null);

  if (!response?.ok) return null;

  const payload = (await response.json().catch(() => null)) as GenericRecord | null;
  const result = buildSearchLikeResult({
    provider: params.provider,
    query,
    records: extractRecordArray(payload),
    fallbackSummary: "StableEnrich found adjacent sources for this page.",
    fallbackWhy:
      "The surrounding web context is strong enough to help a verified human make a faster judgment.",
    fallbackUrl: params.page.canonicalUrl
  });

  if (!result) return null;

  return {
    paymentResponseHeader: getPaymentResponseHeader(response),
    result
  };
}

async function callStableEnrichContents(params: {
  page: WalletResearchPageInput;
  thread: ThreadSnapshot;
  provider: WalletResearchProvider;
  payFetch: WalletPaymentFetch;
}): Promise<LiveExecutionResult | null> {
  const query = buildExtractionObjective(params);
  const response = await params.payFetch("https://stableenrich.dev/api/exa/contents", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      urls: [params.page.canonicalUrl],
      text: {
        maxCharacters: 1800
      },
      highlights: {
        query,
        numSentences: 2,
        highlightsPerUrl: 3
      },
      summary: {
        query
      },
      livecrawl: "fallback"
    })
  }).catch(() => null);

  if (!response?.ok) return null;

  const payload = (await response.json().catch(() => null)) as GenericRecord | null;
  const result = buildSearchLikeResult({
    provider: params.provider,
    query,
    records: extractRecordArray(payload),
    fallbackSummary: "StableEnrich pulled the page contents directly.",
    fallbackWhy: "This provider is best when the page itself matters more than the surrounding conversation.",
    fallbackUrl: params.page.canonicalUrl
  });

  if (!result) return null;

  return {
    paymentResponseHeader: getPaymentResponseHeader(response),
    result
  };
}

async function callAnybrowseScrape(params: {
  page: WalletResearchPageInput;
  thread: ThreadSnapshot;
  provider: WalletResearchProvider;
  payFetch: WalletPaymentFetch;
}): Promise<LiveExecutionResult | null> {
  const query = buildExtractionObjective(params);
  const response = await params.payFetch("https://anybrowse.dev/scrape", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      url: params.page.canonicalUrl
    })
  }).catch(() => null);

  if (!response?.ok) return null;

  const payload = (await response.json().catch(() => null)) as GenericRecord | null;
  const markdown =
    typeof payload?.markdown === "string"
      ? payload.markdown
      : typeof payload?.content === "string"
        ? payload.content
        : "";
  if (!markdown) return null;

  const bullets = toTextBullets(markdown);
  const summary =
    bullets[0] ?? "anybrowse scraped this page into a cleaner markdown view for research.";
  const whyItMatters = bullets[1] ?? truncate(stripMarkdown(markdown), 320);
  const citationUrl =
    typeof payload?.url === "string" && payload.url.startsWith("http")
      ? payload.url
      : params.page.canonicalUrl;

  return {
    paymentResponseHeader: getPaymentResponseHeader(response),
    result: {
      providerId: params.provider.id,
      providerLabel: params.provider.label,
      priceUsdCents: params.provider.priceUsdCents,
      mode: "live",
      query,
      summary,
      whyItMatters,
      bullets: bullets.length > 0 ? bullets : ["Scraped " + params.page.canonicalUrl],
      citations: [
        {
          label: typeof payload?.title === "string" ? payload.title : "Source page",
          url: citationUrl
        }
      ]
    }
  };
}

async function callStableClaudeRun(params: {
  page: WalletResearchPageInput;
  thread: ThreadSnapshot;
  provider: WalletResearchProvider;
  payFetch: WalletPaymentFetch;
}): Promise<LiveExecutionResult | null> {
  const query = buildResearchQuery(params);
  const response = await params.payFetch("https://stableclaude.dev/api/start", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      prompt: query,
      tier: "$1.00"
    })
  }).catch(() => null);

  if (!response?.ok) return null;

  const payload = (await response.json().catch(() => null)) as GenericRecord | null;
  const runId = typeof payload?.runId === "string" ? payload.runId : "";
  const status = typeof payload?.status === "string" ? payload.status : "running";
  if (!runId) return null;

  return {
    paymentResponseHeader: getPaymentResponseHeader(response),
    result: {
      providerId: params.provider.id,
      providerLabel: params.provider.label,
      priceUsdCents: params.provider.priceUsdCents,
      mode: "live",
      query,
      summary: "Started a deep async Giga run for this page.",
      whyItMatters:
        "This is the heavyweight path when a page needs a longer agent-style run instead of a fast browse result.",
      bullets: [
        "Run " + runId + " is currently " + status + ".",
        "Tier: $1.00 on StableClaude / Giga.",
        "Use this when you want a deeper async pass rather than a quick search answer."
      ],
      citations: [
        {
          label: "Giga API",
          url: "https://stableclaude.dev"
        },
        {
          label: "Source page",
          url: params.page.canonicalUrl
        }
      ]
    }
  };
}

async function callTwitshSearch(params: {
  page: WalletResearchPageInput;
  thread: ThreadSnapshot;
  provider: WalletResearchProvider;
  payFetch: WalletPaymentFetch;
}): Promise<LiveExecutionResult | null> {
  const phrase = buildSocialSearchPhrase(params);
  const requestUrl = new URL("https://twit.sh/tweets/search");
  requestUrl.searchParams.set("phrase", phrase);
  requestUrl.searchParams.set("minLikes", "3");

  const response = await params.payFetch(requestUrl, {
    method: "GET"
  }).catch(() => null);

  if (!response?.ok) return null;

  const payload = (await response.json().catch(() => null)) as GenericRecord | null;
  const records = extractRecordArray(payload);
  const snippets = records
    .map((record) => {
      const text = typeof record.text === "string" ? compactWhitespace(record.text) : "";
      if (!text) return "";

      const author =
        typeof record.username === "string"
          ? "@" + record.username + ": "
          : typeof record.author_username === "string"
            ? "@" + record.author_username + ": "
            : "";

      return truncate(author + text, 220);
    })
    .filter(Boolean)
    .slice(0, 4);

  if (snippets.length === 0) {
    return null;
  }

  const citations = records
    .map((record, index) => getRecordCitation(record, index))
    .filter((item): item is { label: string; url: string } => Boolean(item))
    .slice(0, 5);

  return {
    paymentResponseHeader: getPaymentResponseHeader(response),
    result: {
      providerId: params.provider.id,
      providerLabel: params.provider.label,
      priceUsdCents: params.provider.priceUsdCents,
      mode: "live",
      query: phrase,
      summary: snippets[0],
      whyItMatters:
        snippets[1] ??
        "twit.sh found live X/Twitter conversation around this page title, which is useful for market and launch context.",
      bullets: snippets,
      citations:
        citations.length > 0
          ? citations
          : [
              {
                label: "twit.sh",
                url: "https://twit.sh"
              }
            ]
    }
  };
}

export function getWalletResearchProviders(): WalletResearchProvider[] {
  return Object.values(providers).filter((provider) => !provider.hidden);
}

export function getWalletResearchProvider(providerId: ManagedWalletProviderId): WalletResearchProvider {
  return providers[providerId];
}

export function supportsClientWalletPayments(providerId: ManagedWalletProviderId): boolean {
  return providers[providerId].executionMode === "wallet_signed_x402";
}

export function createClientWalletPaymentFetch(params: ClientWalletPaymentContext): WalletPaymentFetch {
  const signer = toClientEvmSigner(
    {
      address: params.address,
      signTypedData: (message) => params.signTypedData(message)
    },
    params.publicClient
  );

  return wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [
      {
        network: params.network ?? "eip155:8453",
        client: new ExactEvmScheme(signer)
      }
    ]
  });
}

export function buildWalletResearchPreview(params: {
  page: WalletResearchPageInput;
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
      ? "Verified humans lean " +
        dominantVerdict[0] +
        " here with " +
        dominantVerdict[1] +
        " recorded verdict" +
        (dominantVerdict[1] === 1 ? "" : "s") +
        "."
      : "There is no dominant verdict yet, so the strongest signal is still emerging.",
    params.thread.topHumanTake
      ? "The top take from @" +
        params.thread.topHumanTake.profileHandle +
        " has " +
        params.thread.topHumanTake.helpfulCount +
        " helpful vote" +
        (params.thread.topHumanTake.helpfulCount === 1 ? "" : "s") +
        "."
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
    query: buildResearchQuery(params),
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

export async function runClientWalletResearch(params: {
  page: WalletResearchPageInput;
  thread: ThreadSnapshot;
  providerId: ManagedWalletProviderId;
  paymentFetch?: WalletPaymentFetch | null;
}): Promise<WalletResearchExecution> {
  const provider = getWalletResearchProvider(params.providerId);
  const preview = buildWalletResearchPreview(params);

  if (provider.executionMode !== "wallet_signed_x402" || !params.paymentFetch) {
    return {
      result: preview,
      chargedUsdCents: 0,
      paymentRail: "preview",
      paymentResponseHeader: null
    };
  }

  let liveResult: LiveExecutionResult | null = null;

  switch (params.providerId) {
    case "stableenrich_answer":
      liveResult = await callStableEnrichAnswer({
        page: params.page,
        thread: params.thread,
        provider,
        payFetch: params.paymentFetch
      });
      break;
    case "stableenrich_search":
      liveResult = await callStableEnrichSearch({
        page: params.page,
        thread: params.thread,
        provider,
        payFetch: params.paymentFetch
      });
      break;
    case "stableenrich_contents":
      liveResult = await callStableEnrichContents({
        page: params.page,
        thread: params.thread,
        provider,
        payFetch: params.paymentFetch
      });
      break;
    case "anybrowse_scrape":
      liveResult = await callAnybrowseScrape({
        page: params.page,
        thread: params.thread,
        provider,
        payFetch: params.paymentFetch
      });
      break;
    case "stableclaude_giga":
      liveResult = await callStableClaudeRun({
        page: params.page,
        thread: params.thread,
        provider,
        payFetch: params.paymentFetch
      });
      break;
    case "twitsh_search":
      liveResult = await callTwitshSearch({
        page: params.page,
        thread: params.thread,
        provider,
        payFetch: params.paymentFetch
      });
      break;
    default:
      liveResult = null;
  }

  if (liveResult) {
    return {
      result: liveResult.result,
      chargedUsdCents: provider.priceUsdCents,
      paymentRail: "wallet_signed_x402",
      paymentResponseHeader: liveResult.paymentResponseHeader
    };
  }

  return {
    result: preview,
    chargedUsdCents: 0,
    paymentRail: "preview",
    paymentResponseHeader: null
  };
}

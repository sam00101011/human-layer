import {
  buildPageContextSummary,
  DEMO_PROFILE_DEFINITIONS,
  EMPTY_VERDICT_COUNTS,
  getInterestTagDescription,
  getInterestTagLabel,
  getRelatedInterestTags,
  INTEREST_TAGS,
  MAX_PROFILE_INTERESTS,
  SUPPORTED_DOMAIN_RULES,
  summarizeContributorReputation,
  type AtprotoIdentity,
  type AtprotoIdentityStatus,
  type CommentReportReasonCode,
  type ContributorReputation,
  type ContributorReputationMetrics,
  type InterestTag,
  type NormalizedPageCandidate,
  type PageSocialProof,
  type ProfileActivityItem,
  type ProfileSnapshot,
  pickTopHumanTake,
  type PageSummary,
  type SupportedDomainRule,
  type ThreadSnapshot,
  type Verdict
} from "@human-layer/core";
import { and, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

import { db } from "./client";
import {
  atprotoAccounts,
  atprotoSyncEvents,
  blockedProfiles,
  commentHelpfulVotes,
  commentReports,
  comments,
  follows,
  managedWallets,
  messageRequests,
  moderationAuditEvents,
  mutedPages,
  mutedProfiles,
  notificationReads,
  pageAliases,
  pages,
  profiles,
  saves,
  sessions,
  supportedDomains,
  topicFollows,
  verdicts,
  x402Events,
  xmtpBindings,
  worldIdVerifications
} from "./schema";

export type StoredPage = {
  id: string;
  pageKind: NormalizedPageCandidate["pageKind"];
  canonicalUrl: string;
  canonicalKey: string;
  host: string;
  title: string;
};

export type StoredProfile = {
  id: string;
  handle: string;
  interestTags: InterestTag[];
  nullifierHash: string | null;
  atproto: AtprotoIdentity | null;
  createdAt: string;
};

export type BookmarkedPage = PageSummary & {
  savedAt: string;
};

export type NotificationSource = "bookmarked_page" | "followed_profile" | "followed_topic";

export type NotificationItem = {
  commentId: string;
  body: string;
  createdAt: string;
  helpfulCount: number;
  authorProfileId: string;
  authorHandle: string;
  authorReputation?: ContributorReputation;
  pageId: string;
  pageKind: PageSummary["pageKind"];
  pageTitle: string;
  pageCanonicalUrl: string;
  pageHost: string;
  sources: NotificationSource[];
  unread: boolean;
  reason: string;
};

export type NotificationPreferences = {
  bookmarkedPageComments: boolean;
  followedProfileTakes: boolean;
  followedTopicTakes: boolean;
};

export type AtprotoAccountSnapshot = {
  profileId: string;
  profileHandle: string;
  handle: string;
  did: string;
  status: AtprotoIdentityStatus;
  pdsUrl: string;
  accountType: string;
  publicPostingEnabled: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const ATPROTO_MANAGED_DOMAIN = "humanlayer.social";
const ATPROTO_MANAGED_PDS_URL = "https://humanlayer.social";

export const MANAGED_WALLET_PROVIDERS = [
  "exa",
  "perplexity",
  "opus_46",
  "stableenrich_answer",
  "stableenrich_search",
  "stableenrich_contents",
  "anybrowse_scrape",
  "stableclaude_giga",
  "parallel_search",
  "twitsh_search"
] as const;

export type ManagedWalletProviderId = (typeof MANAGED_WALLET_PROVIDERS)[number];
export const DEFAULT_CLIENT_WALLET_PROVIDERS = [
  "stableenrich_answer",
  "stableenrich_search",
  "stableenrich_contents",
  "anybrowse_scrape",
  "stableclaude_giga",
  "twitsh_search"
] as const satisfies readonly ManagedWalletProviderId[];

export type WalletPaymentEvent = {
  id: string;
  kind: string;
  status: string;
  amountUsdCents: number;
  provider: ManagedWalletProviderId | null;
  description: string | null;
  pageId: string | null;
  pageTitle: string | null;
  createdAt: string;
};

export type ManagedWalletSnapshot = {
  walletId: string;
  walletAddress: string;
  walletLabel: string;
  walletProvider: string;
  walletType: string;
  network: string;
  status: string;
  passkeyReady: boolean;
  delegatedSession: Record<string, unknown>;
  spendingEnabled: boolean;
  dailySpendLimitUsdCents: number;
  defaultProvider: ManagedWalletProviderId;
  enabledProviders: ManagedWalletProviderId[];
  lastUsedAt: string | null;
  createdAt: string;
  spentTodayUsdCents: number;
  remainingDailyBudgetUsdCents: number;
  paymentHistory: WalletPaymentEvent[];
};

export type WalletResearchPaymentRecord = {
  eventId: string;
  remainingDailyBudgetUsdCents: number;
};

export type FollowGraphItem = {
  commentId: string;
  body: string;
  createdAt: string;
  helpfulCount: number;
  authorProfileId: string;
  authorHandle: string;
  authorReputation?: ContributorReputation;
  pageId: string;
  pageKind: PageSummary["pageKind"];
  pageTitle: string;
  pageCanonicalUrl: string;
  pageHost: string;
  reason: string;
};

export type PageSocialProofSummary = PageSocialProof;

export type ModerationQueueItem = {
  reportId: string;
  status: string;
  reasonCode: string;
  details: string | null;
  createdAt: string;
  reviewedAt: string | null;
  commentId: string;
  commentBody: string;
  commentCreatedAt: string;
  commentHidden: boolean;
  commentReasonCode: string | null;
  authorProfileId: string;
  authorHandle: string;
  reporterProfileId: string;
  reporterHandle: string;
  pageId: string;
  pageKind: PageSummary["pageKind"];
  pageTitle: string;
  pageHost: string;
  pageCanonicalUrl: string;
  authorReportCount: number;
  authorOpenReportCount: number;
  authorHiddenCommentCount: number;
  authorBlockedAt: string | null;
  repeatOffender: boolean;
  priorityLabel: "low" | "standard" | "high" | "urgent";
  priorityScore: number;
  priorityReasons: string[];
  escalateProfileBlock: boolean;
};

export type ModerationAuditItem = {
  id: string;
  actionType: string;
  reasonCode: string | null;
  note: string | null;
  actorProfileId: string | null;
  actorHandle: string | null;
  targetProfileId: string | null;
  targetHandle: string | null;
  commentId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type DiscoveryPage = PageSummary & {
  verdictCount: number;
  commentCount: number;
  bookmarkCount: number;
  activityScore: number;
  summary: string;
  tags: InterestTag[];
  reason: string;
};

export type DiscoveryTake = {
  commentId: string;
  body: string;
  createdAt: string;
  helpfulCount: number;
  profileId: string;
  profileHandle: string;
  pageId: string;
  pageKind: PageSummary["pageKind"];
  pageTitle: string;
  canonicalUrl: string;
  reputation?: ContributorReputation;
  reason: string;
};

export type DiscoveryProfile = {
  id: string;
  handle: string;
  verifiedHuman: boolean;
  reputation: ContributorReputation;
  interestTags: InterestTag[];
  commentCount: number;
  followerCount: number;
  sharedInterestCount: number;
  reason: string;
};

export type SearchSuggestion = {
  query: string;
  label: string;
};

export type DiscoverySearchResults = {
  pages: DiscoveryPage[];
  takes: DiscoveryTake[];
  profiles: DiscoveryProfile[];
  relatedQueries: SearchSuggestion[];
  queryInsight: string | null;
};

export type TopicSurface = {
  topic: InterestTag;
  label: string;
  description: string;
  clusterTags: InterestTag[];
  relatedTopics: InterestTag[];
  whyNow: string;
  viewerReason: string | null;
  trendingPages: DiscoveryPage[];
  topTakes: DiscoveryTake[];
  topContributors: DiscoveryProfile[];
};

export type PublicMetricsSnapshot = {
  totalVerifiedUsers: number;
  totalComments: number;
  totalPages: number;
  totalBookmarks: number;
  totalHelpfulVotes: number;
  totalProfileFollows: number;
  totalTopicFollows: number;
  totalVerdicts: number;
  pageKindBreakdown: Array<{
    pageKind: PageSummary["pageKind"];
    count: number;
  }>;
  hostBreakdown: Array<{
    host: string;
    count: number;
  }>;
};

export type FollowRecommendedPage = DiscoveryPage & {
  bookmarkedByCount: number;
  bookmarkedByHandles: string[];
  reason: string;
};

export type XmtpBindingSnapshot = {
  id: string;
  inboxId: string;
  createdAt: string;
};

export type MessageRequestPreview = {
  id: string;
  status: string;
  createdAt: string;
  senderProfileId: string;
  senderHandle: string;
  recipientProfileId: string;
  recipientHandle: string;
  peerProfileId: string;
  peerHandle: string;
  peerInboxId: string | null;
  pageId: string | null;
  pageTitle: string | null;
  pageCanonicalUrl: string | null;
  pageHost: string | null;
};

export type MessagingInboxSnapshot = {
  binding: XmtpBindingSnapshot | null;
  incomingPending: MessageRequestPreview[];
  outgoingPending: MessageRequestPreview[];
  accepted: MessageRequestPreview[];
};

export class HandleTakenError extends Error {
  constructor(handle: string) {
    super(`handle ${handle} is already taken`);
    this.name = "HandleTakenError";
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function uniqueInterestTags(interestTags: InterestTag[]): InterestTag[] {
  return [...new Set(interestTags)].filter((tag): tag is InterestTag =>
    INTEREST_TAGS.includes(tag)
  );
}

function coerceInterestTags(value: unknown): InterestTag[] {
  if (!Array.isArray(value)) return [];
  return uniqueInterestTags(value.filter((tag): tag is InterestTag => typeof tag === "string"));
}

function coerceAtprotoIdentity(row: {
  atprotoDid?: string | null;
  atprotoHandle?: string | null;
  atprotoStatus?: string | null;
}): AtprotoIdentity | null {
  if (!row.atprotoDid || !row.atprotoHandle || !row.atprotoStatus) {
    return null;
  }

  return {
    did: row.atprotoDid,
    handle: row.atprotoHandle,
    status: row.atprotoStatus as AtprotoIdentityStatus
  };
}

function mapStoredProfile(row: {
  id: string;
  handle: string;
  interestTags: unknown;
  nullifierHash: string | null;
  atprotoDid?: string | null;
  atprotoHandle?: string | null;
  atprotoStatus?: string | null;
  createdAt: Date;
}): StoredProfile {
  return {
    id: row.id,
    handle: row.handle,
    interestTags: coerceInterestTags(row.interestTags),
    nullifierHash: row.nullifierHash,
    atproto: coerceAtprotoIdentity(row),
    createdAt: row.createdAt.toISOString()
  };
}

function buildManagedAtprotoHandle(handle: string): string {
  return `${handle}.${ATPROTO_MANAGED_DOMAIN}`;
}

function buildManagedAtprotoDid(profileId: string): string {
  return `did:web:${ATPROTO_MANAGED_DOMAIN}:profiles:${profileId}`;
}

function formatInterestList(tags: InterestTag[]) {
  return tags.slice(0, 3).map((tag) => getInterestTagLabel(tag)).join(", ");
}

function defaultContributorReputation() {
  return summarizeContributorReputation({
    publicTakeCount: 0,
    helpfulVoteCount: 0,
    followerCount: 0,
    distinctPageCount: 0,
    verdictCount: 0
  });
}

type RankedPageActivityRow = PageSummary & {
  verdictCount: number;
  commentCount: number;
  bookmarkCount: number;
  helpfulCount: number;
  activityScore: number;
  latestActivityAt: string;
};

type DiscoveryProfileRow = {
  id: string;
  handle: string;
  interestTags: unknown;
  nullifierHash: string | null;
};

function buildInterestCluster(topic: InterestTag, relatedLimit = 5): InterestTag[] {
  return [...new Set([topic, ...getRelatedInterestTags([topic], relatedLimit)])];
}

function hasInterestOverlap(candidateTags: readonly InterestTag[], clusterTags: readonly InterestTag[]): boolean {
  const cluster = new Set(clusterTags);
  return candidateTags.some((tag) => cluster.has(tag));
}

function countSharedInterestTags(candidateTags: readonly InterestTag[], clusterTags: readonly InterestTag[]): number {
  const cluster = new Set(clusterTags);
  return candidateTags.filter((tag) => cluster.has(tag)).length;
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function getSharedInterestPreview(
  candidateTags: readonly InterestTag[],
  clusterTags: readonly InterestTag[],
  limit = 3
): InterestTag[] {
  const cluster = new Set(clusterTags);
  return candidateTags.filter((tag) => cluster.has(tag)).slice(0, limit);
}

async function getViewerInterestContext(viewerProfileId?: string): Promise<{
  viewerInterestTags: InterestTag[];
  followedTopics: InterestTag[];
  viewerCluster: InterestTag[];
}> {
  if (!viewerProfileId) {
    return {
      viewerInterestTags: [],
      followedTopics: [],
      viewerCluster: []
    };
  }

  const [viewerRow, followedTopics] = await Promise.all([
    db.query.profiles.findFirst({
      where: eq(profiles.id, viewerProfileId)
    }),
    getFollowedTopicsForProfile(viewerProfileId)
  ]);

  const viewerInterestTags = viewerRow ? coerceInterestTags(viewerRow.interestTags) : [];
  const viewerCluster = [
    ...new Set([
      ...viewerInterestTags,
      ...followedTopics,
      ...followedTopics.flatMap((topic) => buildInterestCluster(topic, 2))
    ])
  ];

  return {
    viewerInterestTags,
    followedTopics,
    viewerCluster
  };
}

function buildDiscoveryPageReason(page: RankedPageActivityRow, thread: ThreadSnapshot): string {
  const reasons: string[] = [];
  const topTake = thread.topHumanTake;

  if (topTake?.helpfulCount && topTake.helpfulCount > 0) {
    reasons.push(`Top take marked helpful ${topTake.helpfulCount}`);
  }

  if (topTake?.reputation?.level === "consistently_useful") {
    reasons.push("Led by a consistently useful contributor");
  } else if (topTake?.reputation?.level === "steady_contributor") {
    reasons.push("Led by a steady contributor");
  }

  if (page.bookmarkCount > 0) {
    reasons.push(`${pluralize(page.bookmarkCount, "bookmark")}`);
  }

  if (page.commentCount > 0) {
    reasons.push(`${pluralize(page.commentCount, "verified take")}`);
  }

  if (reasons.length === 0 && page.verdictCount > 0) {
    reasons.push(`${pluralize(page.verdictCount, "verdict")}`);
  }

  if (reasons.length === 0) {
    reasons.push("Fresh page signal");
  }

  return reasons.slice(0, 2).join(" • ");
}

function buildViewerOverlapReason(
  tags: readonly InterestTag[],
  viewerCluster: readonly InterestTag[]
): string | null {
  if (viewerCluster.length === 0) {
    return null;
  }

  const overlap = getSharedInterestPreview(tags, viewerCluster, 3);
  if (overlap.length === 0) {
    return null;
  }

  return `Relevant to ${formatInterestList(overlap)}`;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function getSearchMatchScore(candidate: string, query: string): number {
  const normalizedCandidate = normalizeSearchText(candidate);
  if (!normalizedCandidate || !query) {
    return 0;
  }

  if (normalizedCandidate === query) {
    return 120;
  }

  if (normalizedCandidate.startsWith(query)) {
    return 72;
  }

  if (normalizedCandidate.includes(query)) {
    return 36;
  }

  const compactCandidate = normalizedCandidate.replace(/[^a-z0-9]+/g, "");
  const compactQuery = query.replace(/[^a-z0-9]+/g, "");

  if (compactQuery && compactCandidate === compactQuery) {
    return 96;
  }

  if (compactQuery && compactCandidate.includes(compactQuery)) {
    return 24;
  }

  return 0;
}

function getInterestTagMatches(tags: readonly InterestTag[], query: string): InterestTag[] {
  return tags.filter((tag) => {
    const slugScore = getSearchMatchScore(tag, query);
    const labelScore = getSearchMatchScore(getInterestTagLabel(tag), query);
    return slugScore > 0 || labelScore > 0;
  });
}

function getInterestTagSearchScore(tags: readonly InterestTag[], query: string): number {
  return getInterestTagMatches(tags, query).reduce((score, tag) => {
    return Math.max(
      score,
      getSearchMatchScore(tag, query),
      getSearchMatchScore(getInterestTagLabel(tag), query)
    );
  }, 0);
}

function pushSearchSuggestion(
  suggestions: SearchSuggestion[],
  seen: Set<string>,
  query: string,
  label: string,
  sourceQuery: string
) {
  const normalizedCandidate = normalizeSearchText(query);
  const normalizedSource = normalizeSearchText(sourceQuery);

  if (!normalizedCandidate || normalizedCandidate === normalizedSource || seen.has(normalizedCandidate)) {
    return;
  }

  suggestions.push({ query, label });
  seen.add(normalizedCandidate);
}

function findInterestTagFromQuery(query: string): InterestTag | null {
  return (
    INTEREST_TAGS.find((tag) => {
      return (
        normalizeSearchText(tag) === query ||
        normalizeSearchText(getInterestTagLabel(tag)) === query
      );
    }) ?? null
  );
}

function buildSearchInsight(params: {
  query: string;
  matchedTopic: InterestTag | null;
  pages: DiscoveryPage[];
  takes: DiscoveryTake[];
  profiles: DiscoveryProfile[];
}): string | null {
  if (params.matchedTopic) {
    return `Showing the strongest pages, takes, and people clustering around ${getInterestTagLabel(params.matchedTopic)}.`;
  }

  const exactProfile = params.profiles.find(
    (profile) => normalizeSearchText(profile.handle) === normalizeSearchText(params.query)
  );
  if (exactProfile) {
    return `Strongest graph matches for @${exactProfile.handle}, including their profile signal and nearby pages.`;
  }

  const exactPage = params.pages.find((page) => {
    return (
      normalizeSearchText(page.title) === normalizeSearchText(params.query) ||
      normalizeSearchText(page.host) === normalizeSearchText(params.query)
    );
  });
  if (exactPage) {
    return `Prioritizing the strongest live graph signal around ${exactPage.title}.`;
  }

  if (params.pages.length > 0 && params.takes.length > 0) {
    return `Showing page-level matches first, then verified takes with the strongest helpful and reputation signals.`;
  }

  if (params.takes.length > 0) {
    return `Ranking takes by text match, helpful votes, contributor signal, and freshness.`;
  }

  if (params.profiles.length > 0) {
    return `Showing people whose handle, interests, and contributor signal overlap with this search.`;
  }

  return null;
}

function buildDiscoveryTakeReason(params: {
  take: Pick<DiscoveryTake, "helpfulCount" | "createdAt" | "reputation">;
  page?: Pick<DiscoveryPage, "bookmarkCount" | "tags" | "commentCount">;
  viewerCluster?: readonly InterestTag[];
  topicCluster?: readonly InterestTag[];
  topicLabel?: string;
}): string {
  const reasons: string[] = [];

  if (params.take.helpfulCount > 0) {
    reasons.push(`Helpful ${params.take.helpfulCount}`);
  }

  if (params.take.reputation?.level === "consistently_useful") {
    reasons.push("Consistently useful contributor");
  } else if (params.take.reputation?.level === "steady_contributor") {
    reasons.push("Steady contributor");
  } else if (params.take.reputation?.level === "emerging_signal") {
    reasons.push("Emerging signal");
  }

  if (params.page?.bookmarkCount && params.page.bookmarkCount > 0) {
    reasons.push(`${pluralize(params.page.bookmarkCount, "bookmark")}`);
  }

  const overlapSource = params.viewerCluster?.length ? params.viewerCluster : params.topicCluster;
  const overlap = overlapSource && params.page
    ? getSharedInterestPreview(params.page.tags, overlapSource, 3)
    : [];
  if (overlap.length > 0) {
    reasons.push(
      params.topicLabel
        ? `Strong in ${params.topicLabel} via ${formatInterestList(overlap)}`
        : `Relevant to ${formatInterestList(overlap)}`
    );
  }

  if (reasons.length === 0 && getFreshnessBoost(params.take.createdAt) >= 5) {
    reasons.push("Fresh verified take");
  }

  if (reasons.length === 0) {
    reasons.push("Worth a quick read");
  }

  return reasons.slice(0, 3).join(" • ");
}

function buildTopicWhyNow(params: {
  topicLabel: string;
  trendingPages: DiscoveryPage[];
  topTakes: DiscoveryTake[];
  topContributors: DiscoveryProfile[];
}): string {
  const leadingPage = params.trendingPages[0];
  const leadingTake = params.topTakes[0];
  const leadingContributor = params.topContributors[0];

  if (leadingPage && leadingTake) {
    return `${params.topicLabel} is moving because ${leadingPage.title} is active and @${leadingTake.profileHandle} is getting traction.`;
  }

  if (leadingPage) {
    return `${params.topicLabel} has live page momentum around ${leadingPage.title}.`;
  }

  if (leadingContributor) {
    return `${leadingContributor.reason} is helping shape this topic right now.`;
  }

  return `Early verified-human signal is starting to form around ${params.topicLabel}.`;
}

function buildTopicViewerReason(params: {
  topic: InterestTag;
  clusterTags: readonly InterestTag[];
  viewerInterestTags: readonly InterestTag[];
  followedTopics: readonly InterestTag[];
}): string | null {
  if (params.followedTopics.includes(params.topic)) {
    return `Because you already follow ${getInterestTagLabel(params.topic)}, fresh takes here will keep showing up in your graph.`;
  }

  const followedOverlap = getSharedInterestPreview(params.followedTopics, params.clusterTags, 2);
  if (followedOverlap.length > 0) {
    return `Because you follow ${formatInterestList(followedOverlap)}, this topic sits right next to the graph you already track.`;
  }

  const viewerOverlap = getSharedInterestPreview(params.viewerInterestTags, params.clusterTags, 3);
  if (viewerOverlap.length > 0) {
    return `Because your interests overlap on ${formatInterestList(viewerOverlap)}.`;
  }

  return null;
}

function getModerationPriority(params: {
  reasonCode: string;
  status: string;
  authorReportCount: number;
  authorOpenReportCount: number;
  authorHiddenCommentCount: number;
  authorBlockedAt: string | null;
}): {
  priorityLabel: "low" | "standard" | "high" | "urgent";
  priorityScore: number;
  priorityReasons: string[];
  escalateProfileBlock: boolean;
} {
  let priorityScore = 0;
  const priorityReasons: string[] = [];

  if (params.status === "open") {
    priorityScore += 2;
    priorityReasons.push("Open report");
  }

  if (["hate_or_harm", "privacy_doxxing", "scam"].includes(params.reasonCode)) {
    priorityScore += 6;
    priorityReasons.push("Severe report reason");
  } else if (["abuse_harassment", "misleading"].includes(params.reasonCode)) {
    priorityScore += 3;
  }

  if (params.authorOpenReportCount >= 3) {
    priorityScore += 4;
    priorityReasons.push("Multiple open reports");
  } else if (params.authorOpenReportCount >= 2) {
    priorityScore += 2;
  }

  if (params.authorHiddenCommentCount >= 2) {
    priorityScore += 4;
    priorityReasons.push("Hidden comments already exist");
  } else if (params.authorHiddenCommentCount === 1) {
    priorityScore += 2;
  }

  if (params.authorReportCount >= 5) {
    priorityScore += 3;
    priorityReasons.push("High total report volume");
  }

  if (params.authorBlockedAt) {
    priorityScore += 2;
    priorityReasons.push("Author already blocked");
  }

  const priorityLabel =
    priorityScore >= 12 ? "urgent" : priorityScore >= 8 ? "high" : priorityScore >= 4 ? "standard" : "low";
  const escalateProfileBlock =
    !params.authorBlockedAt &&
    (params.authorHiddenCommentCount >= 2 || params.authorOpenReportCount >= 3 || priorityLabel === "urgent");

  return {
    priorityLabel,
    priorityScore,
    priorityReasons: [...new Set(priorityReasons)].slice(0, 3),
    escalateProfileBlock
  };
}

async function getTopicMatchMap(
  profileId: string,
  pageIds: string[]
): Promise<Map<string, InterestTag[]>> {
  const uniquePageIds = [...new Set(pageIds)];
  if (uniquePageIds.length === 0) {
    return new Map();
  }

  const followedTopics = await getFollowedTopicsForProfile(profileId);
  if (followedTopics.length === 0) {
    return new Map();
  }

  const pageMap = await getDiscoveryPagesByIds(uniquePageIds);

  return new Map(
    uniquePageIds.map((pageId) => {
      const page = pageMap.get(pageId);
      if (!page) {
        return [pageId, []] as const;
      }

      const matches = followedTopics.filter((topic) =>
        hasInterestOverlap(page.tags, buildInterestCluster(topic, 2))
      );
      return [pageId, matches] as const;
    })
  );
}

async function getRecentTakeCandidates(limit = 36): Promise<DiscoveryTake[]> {
  const rows = await db
    .select({
      commentId: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      profileId: profiles.id,
      profileHandle: profiles.handle,
      pageId: pages.id,
      pageKind: pages.pageKind,
      pageTitle: pages.title,
      canonicalUrl: pages.canonicalUrl,
      helpfulCount: sql<number>`count(${commentHelpfulVotes.id})::int`
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.id, comments.profileId))
    .innerJoin(pages, eq(pages.id, comments.pageId))
    .leftJoin(commentHelpfulVotes, eq(commentHelpfulVotes.commentId, comments.id))
    .where(eq(comments.hidden, false))
    .groupBy(
      comments.id,
      comments.body,
      comments.createdAt,
      profiles.id,
      profiles.handle,
      pages.id,
      pages.pageKind,
      pages.title,
      pages.canonicalUrl
    )
    .orderBy(desc(comments.createdAt))
    .limit(Math.max(limit * 3, 36));

  const reputationMap = await getContributorReputationMap(rows.map((row) => row.profileId));

  return rows.map((row) => ({
    commentId: row.commentId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    helpfulCount: row.helpfulCount,
    profileId: row.profileId,
    profileHandle: row.profileHandle,
    pageId: row.pageId,
    pageKind: row.pageKind as PageSummary["pageKind"],
    pageTitle: row.pageTitle,
    canonicalUrl: row.canonicalUrl,
    reputation: reputationMap.get(row.profileId) ?? defaultContributorReputation(),
    reason: "Fresh verified take"
  }));
}

async function getRankedPageActivityRows(): Promise<RankedPageActivityRow[]> {
  const [verdictRows, commentRows, bookmarkRows, helpfulRows, latestCommentRows, latestSaveRows, latestVerdictRows] =
    await Promise.all([
    db
      .select({
        pageId: verdicts.pageId,
        count: sql<number>`count(*)::int`
      })
      .from(verdicts)
      .groupBy(verdicts.pageId),
    db
      .select({
        pageId: comments.pageId,
        count: sql<number>`count(*)::int`
      })
      .from(comments)
      .where(eq(comments.hidden, false))
      .groupBy(comments.pageId),
    db
      .select({
        pageId: saves.pageId,
        count: sql<number>`count(*)::int`
      })
      .from(saves)
      .groupBy(saves.pageId),
    db
      .select({
        pageId: comments.pageId,
        count: sql<number>`count(${commentHelpfulVotes.id})::int`
      })
      .from(comments)
      .leftJoin(commentHelpfulVotes, eq(commentHelpfulVotes.commentId, comments.id))
      .where(eq(comments.hidden, false))
      .groupBy(comments.pageId),
    db
      .select({
        pageId: comments.pageId,
        latestActivityAt: sql<Date>`max(${comments.createdAt})`
      })
      .from(comments)
      .where(eq(comments.hidden, false))
      .groupBy(comments.pageId),
    db
      .select({
        pageId: saves.pageId,
        latestActivityAt: sql<Date>`max(${saves.createdAt})`
      })
      .from(saves)
      .groupBy(saves.pageId),
    db
      .select({
        pageId: verdicts.pageId,
        latestActivityAt: sql<Date>`max(${verdicts.createdAt})`
      })
      .from(verdicts)
      .groupBy(verdicts.pageId)
  ]);

  const verdictMap = new Map(verdictRows.map((row) => [row.pageId, row.count]));
  const commentMap = new Map(commentRows.map((row) => [row.pageId, row.count]));
  const bookmarkMap = new Map(bookmarkRows.map((row) => [row.pageId, row.count]));
  const helpfulMap = new Map(helpfulRows.map((row) => [row.pageId, row.count]));
  const latestActivityRows = [...latestCommentRows, ...latestSaveRows, ...latestVerdictRows];
  const latestActivityMap = new Map<string, Date | string>();
  for (const row of latestActivityRows) {
    const current = latestActivityMap.get(row.pageId);
    if (!current || row.latestActivityAt > current) {
      latestActivityMap.set(row.pageId, row.latestActivityAt);
    }
  }

  const pageIds = [
    ...new Set([
      ...verdictMap.keys(),
      ...commentMap.keys(),
      ...bookmarkMap.keys(),
      ...helpfulMap.keys()
    ])
  ];

  if (pageIds.length === 0) return [];

  const pageRows = await db
    .select({
      id: pages.id,
      pageKind: pages.pageKind,
      canonicalUrl: pages.canonicalUrl,
      canonicalKey: pages.canonicalKey,
      host: pages.host,
      title: pages.title
    })
    .from(pages)
    .where(inArray(pages.id, pageIds));

  return pageRows
    .map((row) => {
      const verdictCount = verdictMap.get(row.id) ?? 0;
      const commentCount = commentMap.get(row.id) ?? 0;
      const bookmarkCount = bookmarkMap.get(row.id) ?? 0;
      const helpfulCount = helpfulMap.get(row.id) ?? 0;
      const latestActivityAt = toIsoDateString(latestActivityMap.get(row.id) ?? new Date(0));

      return {
        id: row.id,
        pageKind: row.pageKind as PageSummary["pageKind"],
        canonicalUrl: row.canonicalUrl,
        canonicalKey: row.canonicalKey,
        host: row.host,
        title: row.title,
        verdictCount,
        commentCount,
        bookmarkCount,
        helpfulCount,
        activityScore:
          verdictCount * 3 +
          commentCount * 4 +
          bookmarkCount * 2 +
          helpfulCount * 3 +
          getFreshnessBoost(latestActivityAt) * 2,
        latestActivityAt
      } satisfies RankedPageActivityRow;
    })
    .sort((left, right) => right.activityScore - left.activityScore || right.commentCount - left.commentCount);
}

async function hydrateDiscoveryPages(rows: RankedPageActivityRow[]): Promise<DiscoveryPage[]> {
  return Promise.all(
    rows.map(async (page) => {
      const thread = await getPageThreadSnapshot(page.id);
      const context = buildPageContextSummary({
        page: {
          pageKind: page.pageKind,
          host: page.host,
          title: page.title
        },
        thread
      });

      return {
        id: page.id,
        pageKind: page.pageKind,
        canonicalUrl: page.canonicalUrl,
        canonicalKey: page.canonicalKey,
        host: page.host,
        title: page.title,
        verdictCount: page.verdictCount,
        commentCount: page.commentCount,
        bookmarkCount: page.bookmarkCount,
        activityScore: page.activityScore,
        summary: context.summary,
        tags: context.tags,
        reason: buildDiscoveryPageReason(page, thread)
      } satisfies DiscoveryPage;
    })
  );
}

async function getDiscoveryPagesByIds(pageIds: string[]): Promise<Map<string, DiscoveryPage>> {
  const uniquePageIds = [...new Set(pageIds)];
  if (uniquePageIds.length === 0) {
    return new Map();
  }

  const rankedRows = await getRankedPageActivityRows();
  const rankedRowMap = new Map(rankedRows.map((row) => [row.id, row]));
  const missingPageIds = uniquePageIds.filter((pageId) => !rankedRowMap.has(pageId));

  const missingRows =
    missingPageIds.length === 0
      ? []
      : (
          await db
            .select({
              id: pages.id,
              pageKind: pages.pageKind,
              canonicalUrl: pages.canonicalUrl,
              canonicalKey: pages.canonicalKey,
              host: pages.host,
              title: pages.title
            })
            .from(pages)
            .where(inArray(pages.id, missingPageIds))
        ).map((row) => ({
          id: row.id,
          pageKind: row.pageKind as PageSummary["pageKind"],
          canonicalUrl: row.canonicalUrl,
          canonicalKey: row.canonicalKey,
          host: row.host,
          title: row.title,
          verdictCount: 0,
          commentCount: 0,
          bookmarkCount: 0,
          helpfulCount: 0,
          activityScore: 0,
          latestActivityAt: new Date(0).toISOString()
        }) satisfies RankedPageActivityRow);

  const targetRows = uniquePageIds
    .map((pageId) => rankedRowMap.get(pageId) ?? missingRows.find((row) => row.id === pageId))
    .filter((row): row is RankedPageActivityRow => Boolean(row));

  const discoveryPages = await hydrateDiscoveryPages(targetRows);
  return new Map(discoveryPages.map((page) => [page.id, page]));
}

async function getRankedTakeCandidates(limit = 24): Promise<DiscoveryTake[]> {
  const rows = await db
    .select({
      commentId: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      profileId: profiles.id,
      profileHandle: profiles.handle,
      pageId: pages.id,
      pageKind: pages.pageKind,
      pageTitle: pages.title,
      canonicalUrl: pages.canonicalUrl,
      helpfulCount: sql<number>`count(${commentHelpfulVotes.id})::int`
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.id, comments.profileId))
    .innerJoin(pages, eq(pages.id, comments.pageId))
    .leftJoin(commentHelpfulVotes, eq(commentHelpfulVotes.commentId, comments.id))
    .where(eq(comments.hidden, false))
    .groupBy(
      comments.id,
      comments.body,
      comments.createdAt,
      profiles.id,
      profiles.handle,
      pages.id,
      pages.pageKind,
      pages.title,
      pages.canonicalUrl
    )
    .orderBy(desc(sql<number>`count(${commentHelpfulVotes.id})::int`), desc(comments.createdAt))
    .limit(Math.max(limit * 2, 24));

  const reputationMap = await getContributorReputationMap(rows.map((row) => row.profileId));

  return rows
    .map((row) => ({
      commentId: row.commentId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      helpfulCount: row.helpfulCount,
      profileId: row.profileId,
      profileHandle: row.profileHandle,
      pageId: row.pageId,
      pageKind: row.pageKind as PageSummary["pageKind"],
      pageTitle: row.pageTitle,
      canonicalUrl: row.canonicalUrl,
      reputation: reputationMap.get(row.profileId) ?? defaultContributorReputation(),
      reason: "Recommended verified take"
    }))
    .sort(
      (left, right) =>
        rankTakeLikeSignal({
          helpfulCount: right.helpfulCount,
          createdAt: right.createdAt,
          reputationLevel: right.reputation?.level
        }) -
          rankTakeLikeSignal({
            helpfulCount: left.helpfulCount,
            createdAt: left.createdAt,
            reputationLevel: left.reputation?.level
          }) ||
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, limit);
}

async function getProfileDiscoveryRows(
  viewerProfileId?: string
): Promise<{
  profileRows: DiscoveryProfileRow[];
  commentCountMap: Map<string, number>;
  followerCountMap: Map<string, number>;
  reputationMap: Map<string, ContributorReputation>;
}> {
  const [profileRows, commentRows, followerRows, blockedRows] = await Promise.all([
    db
      .select({
        id: profiles.id,
        handle: profiles.handle,
        interestTags: profiles.interestTags,
        nullifierHash: profiles.nullifierHash
      })
      .from(profiles)
      .where(viewerProfileId ? ne(profiles.id, viewerProfileId) : undefined),
    db
      .select({
        profileId: comments.profileId,
        count: sql<number>`count(*)::int`
      })
      .from(comments)
      .where(eq(comments.hidden, false))
      .groupBy(comments.profileId),
    db
      .select({
        profileId: follows.followeeProfileId,
        count: sql<number>`count(*)::int`
      })
      .from(follows)
      .groupBy(follows.followeeProfileId),
    viewerProfileId
      ? db
          .select({
            blockedProfileId: blockedProfiles.blockedProfileId
          })
          .from(blockedProfiles)
          .where(eq(blockedProfiles.profileId, viewerProfileId))
      : Promise.resolve([])
  ]);

  const blockedProfileIds = new Set(blockedRows.map((row) => row.blockedProfileId));
  const visibleProfileRows = profileRows.filter((row) => !blockedProfileIds.has(row.id));

  return {
    profileRows: visibleProfileRows,
    commentCountMap: new Map(commentRows.map((row) => [row.profileId, row.count])),
    followerCountMap: new Map(followerRows.map((row) => [row.profileId, row.count])),
    reputationMap: await getContributorReputationMap(visibleProfileRows.map((row) => row.id))
  };
}

function buildNotificationReason(sources: NotificationSource[]): string {
  if (
    sources.includes("bookmarked_page") &&
    sources.includes("followed_profile") &&
    sources.includes("followed_topic")
  ) {
    return "Someone you follow posted on a bookmarked page that matches a topic you follow.";
  }

  if (sources.includes("bookmarked_page") && sources.includes("followed_profile")) {
    return "Someone you follow posted on a page you bookmarked.";
  }

  if (sources.includes("bookmarked_page") && sources.includes("followed_topic")) {
    return "A bookmarked page lit up inside one of your followed topics.";
  }

  if (sources.includes("followed_profile") && sources.includes("followed_topic")) {
    return "Someone you follow published a take inside one of your topics.";
  }

  if (sources.includes("followed_profile")) {
    return "A followed profile published a new take.";
  }

  if (sources.includes("followed_topic")) {
    return "A followed topic has a new take worth checking.";
  }

  return "A bookmarked page has new activity.";
}

function isRepeatOffender(stats: {
  authorReportCount: number;
  authorOpenReportCount: number;
  authorHiddenCommentCount: number;
}) {
  return (
    stats.authorHiddenCommentCount >= 2 ||
    stats.authorOpenReportCount >= 2 ||
    stats.authorReportCount >= 4
  );
}

function getReputationWeight(level: ContributorReputation["level"] | undefined): number {
  if (level === "consistently_useful") return 12;
  if (level === "steady_contributor") return 8;
  if (level === "emerging_signal") return 4;
  if (level === "new_voice") return 1;
  return 0;
}

function getFreshnessBoost(createdAt: Date | string): number {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const ageHours = Math.max(0, (Date.now() - created.getTime()) / (1000 * 60 * 60));
  return Math.max(0, 10 - ageHours / 12);
}

function toIsoDateString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function sanitizeManagedWalletProvider(
  provider: string | null | undefined
): ManagedWalletProviderId {
  if (provider && MANAGED_WALLET_PROVIDERS.includes(provider as ManagedWalletProviderId)) {
    return provider as ManagedWalletProviderId;
  }

  return DEFAULT_CLIENT_WALLET_PROVIDERS[0];
}

function sanitizeManagedWalletProviders(
  input: string[] | null | undefined
): ManagedWalletProviderId[] {
  const values = Array.isArray(input) ? input : [];
  const unique = [...new Set(values)]
    .map((value) => sanitizeManagedWalletProvider(value))
    .filter((value, index, array) => array.indexOf(value) === index);

  return unique.length > 0 ? unique : [...DEFAULT_CLIENT_WALLET_PROVIDERS];
}

function rankTakeLikeSignal(params: {
  helpfulCount: number;
  createdAt: Date | string;
  reputationLevel?: ContributorReputation["level"];
}): number {
  return (
    params.helpfulCount * 6 +
    getReputationWeight(params.reputationLevel) +
    getFreshnessBoost(params.createdAt)
  );
}

async function getContributorReputationMap(profileIds: string[]): Promise<Map<string, ContributorReputation>> {
  const uniqueProfileIds = [...new Set(profileIds)];
  if (uniqueProfileIds.length === 0) {
    return new Map();
  }

  const [commentRows, helpfulRows, distinctPageRows, followerRows, verdictRows] = await Promise.all([
    db
      .select({
        profileId: comments.profileId,
        count: sql<number>`count(*)::int`
      })
      .from(comments)
      .where(and(inArray(comments.profileId, uniqueProfileIds), eq(comments.hidden, false)))
      .groupBy(comments.profileId),
    db
      .select({
        profileId: comments.profileId,
        count: sql<number>`count(${commentHelpfulVotes.id})::int`
      })
      .from(comments)
      .leftJoin(commentHelpfulVotes, eq(commentHelpfulVotes.commentId, comments.id))
      .where(and(inArray(comments.profileId, uniqueProfileIds), eq(comments.hidden, false)))
      .groupBy(comments.profileId),
    db
      .select({
        profileId: comments.profileId,
        count: sql<number>`count(distinct ${comments.pageId})::int`
      })
      .from(comments)
      .where(and(inArray(comments.profileId, uniqueProfileIds), eq(comments.hidden, false)))
      .groupBy(comments.profileId),
    db
      .select({
        profileId: follows.followeeProfileId,
        count: sql<number>`count(*)::int`
      })
      .from(follows)
      .where(inArray(follows.followeeProfileId, uniqueProfileIds))
      .groupBy(follows.followeeProfileId),
    db
      .select({
        profileId: verdicts.profileId,
        count: sql<number>`count(*)::int`
      })
      .from(verdicts)
      .where(inArray(verdicts.profileId, uniqueProfileIds))
      .groupBy(verdicts.profileId)
  ]);

  const commentMap = new Map(commentRows.map((row) => [row.profileId, row.count]));
  const helpfulMap = new Map(helpfulRows.map((row) => [row.profileId, row.count]));
  const distinctPageMap = new Map(distinctPageRows.map((row) => [row.profileId, row.count]));
  const followerMap = new Map(followerRows.map((row) => [row.profileId, row.count]));
  const verdictMap = new Map(verdictRows.map((row) => [row.profileId, row.count]));

  return new Map(
    uniqueProfileIds.map((profileId) => {
      const metrics: ContributorReputationMetrics = {
        publicTakeCount: commentMap.get(profileId) ?? 0,
        helpfulVoteCount: helpfulMap.get(profileId) ?? 0,
        followerCount: followerMap.get(profileId) ?? 0,
        distinctPageCount: distinctPageMap.get(profileId) ?? 0,
        verdictCount: verdictMap.get(profileId) ?? 0
      };

      return [profileId, summarizeContributorReputation(metrics)];
    })
  );
}

export async function seedSupportedDomainsManifest(): Promise<void> {
  for (const rule of SUPPORTED_DOMAIN_RULES) {
    await db
      .insert(supportedDomains)
      .values({
        id: rule.id,
        enabled: rule.enabled,
        hosts: rule.hosts,
        pageKind: rule.pageKind,
        matchStrategy: rule.matchStrategy,
        normalizer: rule.normalizer,
        rolloutStage: rule.rolloutStage
      })
      .onConflictDoUpdate({
        target: supportedDomains.id,
        set: {
          enabled: rule.enabled,
          hosts: rule.hosts,
          pageKind: rule.pageKind,
          matchStrategy: rule.matchStrategy,
          normalizer: rule.normalizer,
          rolloutStage: rule.rolloutStage
        }
      });
  }
}

export async function getStoredSupportedDomains(): Promise<SupportedDomainRule[]> {
  const rows = await db.select().from(supportedDomains);
  if (rows.length === 0) return SUPPORTED_DOMAIN_RULES;
  return rows as SupportedDomainRule[];
}

export async function findPageByCanonicalKey(canonicalKey: string): Promise<StoredPage | null> {
  const row = await db.query.pages.findFirst({
    where: eq(pages.canonicalKey, canonicalKey)
  });

  if (!row) return null;

  return {
    id: row.id,
    pageKind: row.pageKind as StoredPage["pageKind"],
    canonicalUrl: row.canonicalUrl,
    canonicalKey: row.canonicalKey,
    host: row.host,
    title: row.title
  };
}

export async function findPageById(pageId: string): Promise<StoredPage | null> {
  const row = await db.query.pages.findFirst({
    where: eq(pages.id, pageId)
  });

  if (!row) return null;

  return {
    id: row.id,
    pageKind: row.pageKind as StoredPage["pageKind"],
    canonicalUrl: row.canonicalUrl,
    canonicalKey: row.canonicalKey,
    host: row.host,
    title: row.title
  };
}

export async function upsertPageFromCandidate(
  candidate: NormalizedPageCandidate,
  aliasUrl?: string,
  seeded = false
): Promise<StoredPage> {
  const existing = await findPageByCanonicalKey(candidate.canonicalKey);
  if (existing) {
    if (aliasUrl) {
      await db
        .insert(pageAliases)
        .values({
          pageId: existing.id,
          aliasUrl
        })
        .onConflictDoNothing({ target: pageAliases.aliasUrl });
    }

    return existing;
  }

  const [inserted] = await db
    .insert(pages)
    .values({
      pageKind: candidate.pageKind,
      canonicalKey: candidate.canonicalKey,
      canonicalUrl: candidate.canonicalUrl,
      host: candidate.host,
      title: candidate.title,
      seeded
    })
    .returning();

  await db
    .insert(pageAliases)
    .values({
      pageId: inserted.id,
      aliasUrl: aliasUrl ?? candidate.canonicalUrl
    })
    .onConflictDoNothing({ target: pageAliases.aliasUrl });

  return {
    id: inserted.id,
    pageKind: inserted.pageKind as StoredPage["pageKind"],
    canonicalUrl: inserted.canonicalUrl,
    canonicalKey: inserted.canonicalKey,
    host: inserted.host,
    title: inserted.title
  };
}

export async function getPageThreadSnapshot(
  pageId: string,
  viewerProfileId?: string
): Promise<ThreadSnapshot> {
  const verdictRows = await db
    .select({
      verdict: verdicts.verdict,
      count: sql<number>`count(*)::int`
    })
    .from(verdicts)
    .where(eq(verdicts.pageId, pageId))
    .groupBy(verdicts.verdict);

  const verdictCounts = { ...EMPTY_VERDICT_COUNTS };
  for (const row of verdictRows) {
    verdictCounts[row.verdict as Verdict] = row.count;
  }

  const recentComments = viewerProfileId
    ? await db
        .select({
          commentId: comments.id,
          profileId: profiles.id,
          profileHandle: profiles.handle,
          body: comments.body,
          mediaTimestampSeconds: comments.mediaTimestampSeconds,
          createdAt: comments.createdAt
        })
        .from(comments)
        .innerJoin(profiles, eq(profiles.id, comments.profileId))
        .leftJoin(
          mutedProfiles,
          and(
            eq(mutedProfiles.mutedProfileId, comments.profileId),
            eq(mutedProfiles.profileId, viewerProfileId)
          )
        )
        .leftJoin(
          blockedProfiles,
          and(
            eq(blockedProfiles.blockedProfileId, comments.profileId),
            eq(blockedProfiles.profileId, viewerProfileId)
          )
        )
        .where(
          and(
            eq(comments.pageId, pageId),
            eq(comments.hidden, false),
            sql`${mutedProfiles.id} is null`,
            sql`${blockedProfiles.id} is null`
          )
        )
        .orderBy(desc(comments.createdAt))
        .limit(10)
    : await db
        .select({
          commentId: comments.id,
          profileId: profiles.id,
          profileHandle: profiles.handle,
          body: comments.body,
          mediaTimestampSeconds: comments.mediaTimestampSeconds,
          createdAt: comments.createdAt
        })
        .from(comments)
        .innerJoin(profiles, eq(profiles.id, comments.profileId))
        .where(and(eq(comments.pageId, pageId), eq(comments.hidden, false)))
        .orderBy(desc(comments.createdAt))
        .limit(10);

  const commentIds = recentComments.map((comment) => comment.commentId);

  const helpfulRows =
    commentIds.length === 0
      ? []
      : await db
          .select({
            commentId: commentHelpfulVotes.commentId,
            count: sql<number>`count(*)::int`
          })
          .from(commentHelpfulVotes)
          .where(inArray(commentHelpfulVotes.commentId, commentIds))
          .groupBy(commentHelpfulVotes.commentId);

  const helpfulCountMap = new Map(helpfulRows.map((row) => [row.commentId, row.count]));
  const reputationMap = await getContributorReputationMap(recentComments.map((comment) => comment.profileId));

  const projectedComments = recentComments.map((comment) => ({
    commentId: comment.commentId,
    profileId: comment.profileId,
    profileHandle: comment.profileHandle,
    body: comment.body,
    helpfulCount: helpfulCountMap.get(comment.commentId) ?? 0,
    mediaTimestampSeconds: comment.mediaTimestampSeconds,
    createdAt: comment.createdAt.toISOString(),
    reputation: reputationMap.get(comment.profileId) ?? defaultContributorReputation()
  }));

  return {
    verdictCounts,
    recentComments: projectedComments,
    topHumanTake: pickTopHumanTake(projectedComments)
  };
}

export async function getTrendingPages(
  limit = 6,
  viewerProfileId?: string
): Promise<DiscoveryPage[]> {
  const [rankedPages, viewerContext] = await Promise.all([
    getRankedPageActivityRows(),
    getViewerInterestContext(viewerProfileId)
  ]);
  const hydratedPages = await hydrateDiscoveryPages(rankedPages.slice(0, Math.max(limit * 8, 48)));

  return hydratedPages
    .map((page) => {
      const viewerOverlap = countSharedInterestTags(page.tags, viewerContext.viewerCluster);
      const score = page.activityScore + viewerOverlap * 6 + page.bookmarkCount;
      const viewerReason = buildViewerOverlapReason(page.tags, viewerContext.viewerCluster);
      return {
        ...page,
        reason: viewerReason ? `${page.reason} • ${viewerReason}` : page.reason,
        score
      };
    })
    .sort((left, right) => right.score - left.score || right.commentCount - left.commentCount)
    .slice(0, limit)
    .map(({ score: _score, ...page }) => page);
}

export async function getRecommendedTakes(
  limit = 6,
  viewerProfileId?: string
): Promise<DiscoveryTake[]> {
  const [takeCandidates, viewerContext] = await Promise.all([
    getRankedTakeCandidates(Math.max(limit * 6, 36)),
    getViewerInterestContext(viewerProfileId)
  ]);
  const pageMap = await getDiscoveryPagesByIds(takeCandidates.map((take) => take.pageId));

  return takeCandidates
    .map((take) => {
      const page = pageMap.get(take.pageId);
      const viewerOverlap = page ? countSharedInterestTags(page.tags, viewerContext.viewerCluster) : 0;
      const score =
        rankTakeLikeSignal({
          helpfulCount: take.helpfulCount,
          createdAt: take.createdAt,
          reputationLevel: take.reputation?.level
        }) +
        (page?.bookmarkCount ?? 0) * 2 +
        viewerOverlap * 6 +
        (page?.commentCount ?? 0);

      return {
        ...take,
        reason: buildDiscoveryTakeReason({
          take,
          page,
          viewerCluster: viewerContext.viewerCluster
        }),
        score
      };
    })
    .sort((left, right) => right.score - left.score || right.helpfulCount - left.helpfulCount)
    .slice(0, limit)
    .map(({ score: _score, ...take }) => take);
}

export async function getPeopleToFollow(limit = 6, viewerProfileId?: string): Promise<DiscoveryProfile[]> {
  const [profileRows, commentRows, followerRows, followedRows, viewerRow] = await Promise.all([
    db
      .select({
        id: profiles.id,
        handle: profiles.handle,
        interestTags: profiles.interestTags,
        nullifierHash: profiles.nullifierHash
      })
      .from(profiles)
      .where(viewerProfileId ? ne(profiles.id, viewerProfileId) : undefined),
    db
      .select({
        profileId: comments.profileId,
        count: sql<number>`count(*)::int`
      })
      .from(comments)
      .where(eq(comments.hidden, false))
      .groupBy(comments.profileId),
    db
      .select({
        profileId: follows.followeeProfileId,
        count: sql<number>`count(*)::int`
      })
      .from(follows)
      .groupBy(follows.followeeProfileId),
    viewerProfileId
      ? db
          .select({
            followeeProfileId: follows.followeeProfileId
          })
          .from(follows)
          .where(eq(follows.followerProfileId, viewerProfileId))
      : Promise.resolve([]),
    viewerProfileId
      ? db.query.profiles.findFirst({
          where: eq(profiles.id, viewerProfileId)
        })
      : Promise.resolve(null)
  ]);

  const commentCountMap = new Map(commentRows.map((row) => [row.profileId, row.count]));
  const followerCountMap = new Map(followerRows.map((row) => [row.profileId, row.count]));
  const followedIds = new Set(followedRows.map((row) => row.followeeProfileId));
  const viewerInterestTags = viewerRow ? coerceInterestTags(viewerRow.interestTags) : [];

  const reputationMap = await getContributorReputationMap(profileRows.map((row) => row.id));

  return profileRows
    .filter((row) => Boolean(row.nullifierHash))
    .filter((row) => !followedIds.has(row.id))
    .map((row) => {
      const interestTags = coerceInterestTags(row.interestTags);
      const sharedInterestCount = viewerInterestTags.filter((tag) => interestTags.includes(tag)).length;
      const commentCount = commentCountMap.get(row.id) ?? 0;
      const followerCount = followerCountMap.get(row.id) ?? 0;
      const verifiedHuman = Boolean(row.nullifierHash);
      const reputation = reputationMap.get(row.id) ?? defaultContributorReputation();
      const score =
        (verifiedHuman ? 6 : 0) +
        commentCount * 3 +
        followerCount * 2 +
        sharedInterestCount * 4 +
        getReputationWeight(reputation.level) * 2;
      const reasonParts = [];

      if (sharedInterestCount > 0) {
        reasonParts.push(`Shared interests in ${formatInterestList(interestTags)}`);
      }

      if (followerCount > 0) {
        reasonParts.push(`${pluralize(followerCount, "follower")}`);
      }

      reasonParts.push(reputation.description);

      return {
        id: row.id,
        handle: row.handle,
        verifiedHuman,
        reputation,
        interestTags,
        commentCount,
        followerCount,
        sharedInterestCount,
        score,
        reason: reasonParts.join(" • ")
      };
    })
    .sort((left, right) => right.score - left.score || right.commentCount - left.commentCount)
    .slice(0, limit)
    .map(({ score: _score, ...profile }) => profile);
}

export async function searchDiscovery(query: string, limit = 6): Promise<DiscoverySearchResults> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      pages: [],
      takes: [],
      profiles: [],
      relatedQueries: [],
      queryInsight: null
    };
  }

  const normalizedQuery = normalizeSearchText(trimmed);
  const pattern = `%${trimmed}%`;
  const candidateLimit = Math.max(limit * 4, 24);

  const [pageRows, takeRows, profileRows, commentRows, followerRows] = await Promise.all([
    db
      .select({
        id: pages.id,
        pageKind: pages.pageKind,
        canonicalUrl: pages.canonicalUrl,
        canonicalKey: pages.canonicalKey,
        host: pages.host,
        title: pages.title
      })
      .from(pages)
      .where(or(ilike(pages.title, pattern), ilike(pages.host, pattern), ilike(pages.canonicalUrl, pattern)))
      .limit(candidateLimit),
    db
      .select({
        commentId: comments.id,
        body: comments.body,
        createdAt: comments.createdAt,
        profileId: profiles.id,
        profileHandle: profiles.handle,
        pageId: pages.id,
        pageKind: pages.pageKind,
        pageTitle: pages.title,
        canonicalUrl: pages.canonicalUrl,
        helpfulCount: sql<number>`count(${commentHelpfulVotes.id})::int`
      })
      .from(comments)
      .innerJoin(profiles, eq(profiles.id, comments.profileId))
      .innerJoin(pages, eq(pages.id, comments.pageId))
      .leftJoin(commentHelpfulVotes, eq(commentHelpfulVotes.commentId, comments.id))
      .where(and(eq(comments.hidden, false), or(ilike(comments.body, pattern), ilike(pages.title, pattern))))
      .groupBy(
        comments.id,
        comments.body,
        comments.createdAt,
        profiles.id,
        profiles.handle,
        pages.id,
        pages.pageKind,
        pages.title,
        pages.canonicalUrl
      )
      .orderBy(desc(sql<number>`count(${commentHelpfulVotes.id})::int`), desc(comments.createdAt))
      .limit(candidateLimit),
    db
      .select({
        id: profiles.id,
        handle: profiles.handle,
        interestTags: profiles.interestTags,
        nullifierHash: profiles.nullifierHash
      })
      .from(profiles)
      .where(
        or(
          ilike(profiles.handle, pattern),
          sql<boolean>`CAST(${profiles.interestTags} AS text) ILIKE ${pattern}`
        )
      )
      .limit(candidateLimit),
    db
      .select({
        profileId: comments.profileId,
        count: sql<number>`count(*)::int`
      })
      .from(comments)
      .where(eq(comments.hidden, false))
      .groupBy(comments.profileId),
    db
      .select({
        profileId: follows.followeeProfileId,
        count: sql<number>`count(*)::int`
      })
      .from(follows)
      .groupBy(follows.followeeProfileId)
  ]);

  const commentCountMap = new Map(commentRows.map((row) => [row.profileId, row.count]));
  const followerCountMap = new Map(followerRows.map((row) => [row.profileId, row.count]));
  const [pageMap, takeReputationMap, searchProfileReputationMap] = await Promise.all([
    getDiscoveryPagesByIds(pageRows.map((row) => row.id)),
    getContributorReputationMap(takeRows.map((row) => row.profileId)),
    getContributorReputationMap(profileRows.map((row) => row.id))
  ]);
  const matchedTopic = findInterestTagFromQuery(normalizedQuery);

  const pagesWithContext = pageRows
    .map((row) => pageMap.get(row.id))
    .filter((page): page is DiscoveryPage => Boolean(page))
    .map((page) => {
      const titleScore = getSearchMatchScore(page.title, normalizedQuery);
      const hostScore = getSearchMatchScore(page.host, normalizedQuery);
      const urlScore = getSearchMatchScore(page.canonicalUrl, normalizedQuery);
      const tagMatches = getInterestTagMatches(page.tags, normalizedQuery);
      const tagScore = getInterestTagSearchScore(page.tags, normalizedQuery);
      const reasonLead =
        titleScore >= 120
          ? "Exact title match"
          : hostScore >= 120
            ? "Exact host match"
            : tagMatches.length > 0
              ? `Matches ${formatInterestList(tagMatches.slice(0, 2))}`
              : null;

      return {
        ...page,
        reason: [reasonLead, page.reason].filter((value): value is string => Boolean(value)).join(" • "),
        score:
          titleScore * 4 +
          hostScore * 3 +
          urlScore +
          tagScore * 3 +
          page.activityScore * 2 +
          page.bookmarkCount * 3 +
          page.verdictCount
      };
    })
    .sort((left, right) => right.score - left.score || right.activityScore - left.activityScore)
    .slice(0, limit)
    .map(({ score: _score, ...page }) => page);

  const takePageMap = await getDiscoveryPagesByIds(takeRows.map((row) => row.pageId));
  const takes = takeRows
    .map((row) => {
      const page = takePageMap.get(row.pageId);
      const reputation = takeReputationMap.get(row.profileId) ?? defaultContributorReputation();
      const take = {
        commentId: row.commentId,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        helpfulCount: row.helpfulCount,
        profileId: row.profileId,
        profileHandle: row.profileHandle,
        pageId: row.pageId,
        pageKind: row.pageKind as PageSummary["pageKind"],
        pageTitle: row.pageTitle,
        canonicalUrl: row.canonicalUrl,
        reputation
      } satisfies Omit<DiscoveryTake, "reason">;

      const bodyScore = getSearchMatchScore(row.body, normalizedQuery);
      const titleScore = getSearchMatchScore(row.pageTitle, normalizedQuery);
      const handleScore = getSearchMatchScore(row.profileHandle, normalizedQuery);
      const tagMatches = page ? getInterestTagMatches(page.tags, normalizedQuery) : [];
      const reasonLead =
        titleScore >= 120
          ? "Exact page match"
          : handleScore >= 120
            ? `Exact handle match for @${row.profileHandle}`
            : bodyScore >= 72
              ? "Strong text match"
              : tagMatches.length > 0
                ? `Matches ${formatInterestList(tagMatches.slice(0, 2))}`
                : null;

      return {
        ...take,
        reason: [
          reasonLead,
          buildDiscoveryTakeReason({
            take,
            page
          })
        ]
          .filter((value): value is string => Boolean(value))
          .join(" • "),
        score:
          titleScore * 4 +
          bodyScore * 3 +
          handleScore * 2 +
          (page ? getInterestTagSearchScore(page.tags, normalizedQuery) * 2 : 0) +
          rankTakeLikeSignal({
            helpfulCount: row.helpfulCount,
            createdAt: row.createdAt,
            reputationLevel: reputation.level
          }) *
            2 +
          (page?.bookmarkCount ?? 0)
      };
    })
    .sort((left, right) => right.score - left.score || right.helpfulCount - left.helpfulCount)
    .slice(0, limit)
    .map(({ score: _score, ...take }) => take);

  const profilesWithScores = profileRows
    .map((row) => {
      const interestTags = coerceInterestTags(row.interestTags);
      const commentCount = commentCountMap.get(row.id) ?? 0;
      const followerCount = followerCountMap.get(row.id) ?? 0;
      const reputation = searchProfileReputationMap.get(row.id) ?? defaultContributorReputation();
      const tagMatches = getInterestTagMatches(interestTags, normalizedQuery);
      const handleScore = getSearchMatchScore(row.handle, normalizedQuery);
      const tagScore = getInterestTagSearchScore(interestTags, normalizedQuery);
      const reasonLead =
        handleScore >= 120
          ? `Exact handle match for @${row.handle}`
          : tagMatches.length > 0
            ? `Active around ${formatInterestList(tagMatches.slice(0, 3))}`
            : null;

      return {
        id: row.id,
        handle: row.handle,
        verifiedHuman: Boolean(row.nullifierHash),
        reputation,
        interestTags,
        commentCount,
        followerCount,
        sharedInterestCount: tagMatches.length,
        reason: [reasonLead, interestTags.length ? `${reputation.description} • Active around ${formatInterestList(interestTags)}` : reputation.description]
          .filter((value): value is string => Boolean(value))
          .join(" • "),
        score:
          handleScore * 5 +
          tagScore * 4 +
          commentCount * 2 +
          followerCount * 3 +
          getReputationWeight(reputation.level) * 2
      } satisfies DiscoveryProfile & { score: number };
    })
    .sort((left, right) => right.score - left.score || right.followerCount - left.followerCount);

  const profilesWithContext = profilesWithScores
    .slice(0, limit)
    .map(({ score: _score, ...profile }) => profile);

  const relatedQueries: SearchSuggestion[] = [];
  const relatedQuerySet = new Set<string>();

  if (matchedTopic) {
    for (const relatedTag of getRelatedInterestTags([matchedTopic], 4)) {
      pushSearchSuggestion(
        relatedQueries,
        relatedQuerySet,
        relatedTag,
        getInterestTagLabel(relatedTag),
        trimmed
      );
    }
  }

  for (const page of pagesWithContext.slice(0, 4)) {
    for (const tag of page.tags.slice(0, 2)) {
      pushSearchSuggestion(relatedQueries, relatedQuerySet, tag, getInterestTagLabel(tag), trimmed);
    }
    pushSearchSuggestion(relatedQueries, relatedQuerySet, page.host, page.host, trimmed);
  }

  for (const profile of profilesWithContext.slice(0, 3)) {
    pushSearchSuggestion(
      relatedQueries,
      relatedQuerySet,
      profile.handle,
      `@${profile.handle}`,
      trimmed
    );
  }

  return {
    pages: pagesWithContext,
    takes,
    profiles: profilesWithContext,
    relatedQueries: relatedQueries.slice(0, 6),
    queryInsight: buildSearchInsight({
      query: trimmed,
      matchedTopic,
      pages: pagesWithContext,
      takes,
      profiles: profilesWithContext
    })
  };
}

export async function getTopicSurface(
  topic: InterestTag,
  limit = 6,
  viewerProfileId?: string
): Promise<TopicSurface> {
  const clusterTags = buildInterestCluster(topic, 5);
  const clusterSet = new Set(clusterTags);
  const [rankedPages, takeCandidates, profileData, viewerContext] = await Promise.all([
    getRankedPageActivityRows(),
    getRankedTakeCandidates(Math.max(limit * 10, 60)),
    getProfileDiscoveryRows(),
    getViewerInterestContext(viewerProfileId)
  ]);

  const trendingPages = (await hydrateDiscoveryPages(rankedPages.slice(0, Math.max(limit * 12, 72))))
    .filter((page) => hasInterestOverlap(page.tags, clusterTags))
    .map((page) => {
      const pageClusterOverlap = countSharedInterestTags(page.tags, clusterTags);
      const viewerOverlap = countSharedInterestTags(page.tags, viewerContext.viewerCluster);
      return {
        ...page,
        score: page.activityScore + pageClusterOverlap * 5 + viewerOverlap * 3
      };
    })
    .sort((left, right) => right.score - left.score || right.commentCount - left.commentCount)
    .slice(0, limit)
    .map(({ score: _score, ...page }) => page);

  const takePageMap = await getDiscoveryPagesByIds(takeCandidates.map((take) => take.pageId));
  const topicTakeCandidates = takeCandidates.filter((take) => {
    const page = takePageMap.get(take.pageId);
    return page ? hasInterestOverlap(page.tags, clusterTags) : false;
  });
  const topTakes = topicTakeCandidates
    .map((take) => {
      const page = takePageMap.get(take.pageId);
      const pageClusterOverlap = page ? countSharedInterestTags(page.tags, clusterTags) : 0;
      return {
        ...take,
        reason: buildDiscoveryTakeReason({
          take,
          page,
          topicCluster: clusterTags,
          topicLabel: getInterestTagLabel(topic)
        }),
        score:
          rankTakeLikeSignal({
            helpfulCount: take.helpfulCount,
            createdAt: take.createdAt,
            reputationLevel: take.reputation?.level
          }) +
          pageClusterOverlap * 5 +
          (page?.bookmarkCount ?? 0)
      };
    })
    .sort((left, right) => right.score - left.score || right.helpfulCount - left.helpfulCount)
    .slice(0, limit)
    .map(({ score: _score, ...take }) => take);

  const topicTakeStats = new Map<string, { takeCount: number; helpfulCount: number }>();
  for (const take of topTakes) {
    const current = topicTakeStats.get(take.profileId) ?? { takeCount: 0, helpfulCount: 0 };
    current.takeCount += 1;
    current.helpfulCount += take.helpfulCount;
    topicTakeStats.set(take.profileId, current);
  }

  const topContributors = profileData.profileRows
    .filter((row) => Boolean(row.nullifierHash))
    .map((row) => {
      const interestTags = coerceInterestTags(row.interestTags);
      const sharedInterestCount = countSharedInterestTags(interestTags, clusterTags);
      const commentCount = profileData.commentCountMap.get(row.id) ?? 0;
      const followerCount = profileData.followerCountMap.get(row.id) ?? 0;
      const reputation = profileData.reputationMap.get(row.id) ?? defaultContributorReputation();
      const topicStats = topicTakeStats.get(row.id) ?? { takeCount: 0, helpfulCount: 0 };

      if (sharedInterestCount === 0 && topicStats.takeCount === 0) {
        return null;
      }

      const reasonParts = [];
      if (sharedInterestCount > 0) {
        reasonParts.push(`Signals in ${formatInterestList(interestTags.filter((tag) => clusterSet.has(tag)))}`);
      }
      if (topicStats.takeCount > 0) {
        reasonParts.push(
          `${topicStats.takeCount} high-signal take${topicStats.takeCount === 1 ? "" : "s"} in this cluster`
        );
      }
      reasonParts.push(reputation.description);

      return {
        id: row.id,
        handle: row.handle,
        verifiedHuman: true,
        reputation,
        interestTags,
        commentCount,
        followerCount,
        sharedInterestCount,
        reason: reasonParts.join(" • "),
        score:
          sharedInterestCount * 6 +
          topicStats.takeCount * 8 +
          topicStats.helpfulCount * 2 +
          followerCount * 2 +
          getReputationWeight(reputation.level)
      };
    })
    .filter((profile): profile is DiscoveryProfile & { score: number } => Boolean(profile))
    .sort((left, right) => right.score - left.score || right.commentCount - left.commentCount)
    .slice(0, limit)
    .map(({ score: _score, ...profile }) => profile);

  return {
    topic,
    label: getInterestTagLabel(topic),
    description: getInterestTagDescription(topic),
    clusterTags,
    relatedTopics: getRelatedInterestTags([topic], 6),
    whyNow: buildTopicWhyNow({
      topicLabel: getInterestTagLabel(topic),
      trendingPages,
      topTakes,
      topContributors
    }),
    viewerReason: buildTopicViewerReason({
      topic,
      clusterTags,
      viewerInterestTags: viewerContext.viewerInterestTags,
      followedTopics: viewerContext.followedTopics
    }),
    trendingPages,
    topTakes,
    topContributors
  };
}

export async function getRecentTakesForTopic(
  topic: InterestTag,
  limit = 8
): Promise<DiscoveryTake[]> {
  const clusterTags = buildInterestCluster(topic, 5);
  const takeCandidates = await getRecentTakeCandidates(Math.max(limit * 6, 48));
  const takePageMap = await getDiscoveryPagesByIds(takeCandidates.map((take) => take.pageId));

  return takeCandidates
    .filter((take) => {
      const page = takePageMap.get(take.pageId);
      return page ? hasInterestOverlap(page.tags, clusterTags) : false;
    })
    .map((take) => {
      const page = takePageMap.get(take.pageId);
      return {
        ...take,
        reason: buildDiscoveryTakeReason({
          take,
          page,
          topicCluster: clusterTags,
          topicLabel: getInterestTagLabel(topic)
        }),
        score:
          getFreshnessBoost(take.createdAt) * 1.5 +
          rankTakeLikeSignal({
            helpfulCount: take.helpfulCount,
            createdAt: take.createdAt,
            reputationLevel: take.reputation?.level
          }) +
          (page?.bookmarkCount ?? 0)
      };
    })
    .sort((left, right) => right.score - left.score || right.helpfulCount - left.helpfulCount)
    .slice(0, limit)
    .map(({ score: _score, ...take }) => take);
}

export async function getTopicFeedFromFollowedProfiles(
  profileId: string,
  topic: InterestTag,
  limit = 6
): Promise<FollowGraphItem[]> {
  const viewerContext = await getViewerInterestContext(profileId);
  const rows = await db
    .select({
      commentId: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      helpfulCount: sql<number>`count(${commentHelpfulVotes.id})::int`,
      authorProfileId: profiles.id,
      authorHandle: profiles.handle,
      pageId: pages.id,
      pageKind: pages.pageKind,
      pageTitle: pages.title,
      pageCanonicalUrl: pages.canonicalUrl,
      pageHost: pages.host
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.id, comments.profileId))
    .innerJoin(pages, eq(pages.id, comments.pageId))
    .innerJoin(
      follows,
      and(eq(follows.followeeProfileId, comments.profileId), eq(follows.followerProfileId, profileId))
    )
    .leftJoin(commentHelpfulVotes, eq(commentHelpfulVotes.commentId, comments.id))
    .leftJoin(
      mutedPages,
      and(eq(mutedPages.pageId, comments.pageId), eq(mutedPages.profileId, profileId))
    )
    .leftJoin(
      mutedProfiles,
      and(eq(mutedProfiles.mutedProfileId, comments.profileId), eq(mutedProfiles.profileId, profileId))
    )
    .leftJoin(
      blockedProfiles,
      and(
        eq(blockedProfiles.blockedProfileId, comments.profileId),
        eq(blockedProfiles.profileId, profileId)
      )
    )
    .where(
      and(
        eq(comments.hidden, false),
        ne(comments.profileId, profileId),
        sql`${mutedPages.id} is null`,
        sql`${mutedProfiles.id} is null`,
        sql`${blockedProfiles.id} is null`
      )
    )
    .groupBy(
      comments.id,
      comments.body,
      comments.createdAt,
      profiles.id,
      profiles.handle,
      pages.id,
      pages.pageKind,
      pages.title,
      pages.canonicalUrl,
      pages.host
    )
    .orderBy(desc(comments.createdAt))
    .limit(Math.max(limit * 8, 48));

  const reputationMap = await getContributorReputationMap(rows.map((row) => row.authorProfileId));
  const pageMap = await getDiscoveryPagesByIds(rows.map((row) => row.pageId));
  const clusterTags = buildInterestCluster(topic, 5);

  return rows
    .filter((row) => {
      const page = pageMap.get(row.pageId);
      return page ? hasInterestOverlap(page.tags, clusterTags) : false;
    })
    .map((row) => {
      const page = pageMap.get(row.pageId);
      const matchingTags = page ? getSharedInterestPreview(page.tags, clusterTags, 3) : [];
      const viewerOverlap = page ? buildViewerOverlapReason(page.tags, viewerContext.viewerCluster) : null;
      return {
        commentId: row.commentId,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        helpfulCount: row.helpfulCount,
        authorProfileId: row.authorProfileId,
        authorHandle: row.authorHandle,
        authorReputation: reputationMap.get(row.authorProfileId) ?? defaultContributorReputation(),
        pageId: row.pageId,
        pageKind: row.pageKind as PageSummary["pageKind"],
        pageTitle: row.pageTitle,
        pageCanonicalUrl: row.pageCanonicalUrl,
        pageHost: row.pageHost,
        reason: [
          `Because you follow @${row.authorHandle}`,
          matchingTags.length > 0 ? `Strong in ${formatInterestList(matchingTags)}` : null,
          viewerOverlap
        ]
          .filter((value): value is string => Boolean(value))
          .join(" • "),
        score:
          rankTakeLikeSignal({
            helpfulCount: row.helpfulCount,
            createdAt: row.createdAt,
            reputationLevel: reputationMap.get(row.authorProfileId)?.level
          }) +
          (page?.bookmarkCount ?? 0)
      } satisfies FollowGraphItem & { score: number };
    })
    .sort((left, right) => right.score - left.score || right.helpfulCount - left.helpfulCount)
    .slice(0, limit)
    .map(({ score: _score, ...item }) => item);
}

export async function getPeopleSimilarToFollowing(
  profileId: string,
  limit = 6
): Promise<DiscoveryProfile[]> {
  const [viewerRow, followedRows, profileData] = await Promise.all([
    db.query.profiles.findFirst({
      where: eq(profiles.id, profileId)
    }),
    db
      .select({
        followeeProfileId: follows.followeeProfileId
      })
      .from(follows)
      .where(eq(follows.followerProfileId, profileId)),
    getProfileDiscoveryRows(profileId)
  ]);

  if (!viewerRow || followedRows.length === 0) {
    return [];
  }

  const followedIds = new Set(followedRows.map((row) => row.followeeProfileId));
  const followedInterestRows = profileData.profileRows.filter((row) => followedIds.has(row.id));
  const viewerInterestTags = coerceInterestTags(viewerRow.interestTags);
  const followedInterestWeights = new Map<InterestTag, number>();

  for (const followed of followedInterestRows) {
    for (const tag of coerceInterestTags(followed.interestTags)) {
      followedInterestWeights.set(tag, (followedInterestWeights.get(tag) ?? 0) + 1);
    }
  }

  return profileData.profileRows
    .filter((row) => Boolean(row.nullifierHash))
    .filter((row) => !followedIds.has(row.id))
    .map((row) => {
      const interestTags = coerceInterestTags(row.interestTags);
      const sharedViewerInterestCount = viewerInterestTags.filter((tag) => interestTags.includes(tag)).length;
      const overlapScore = interestTags.reduce((sum, tag) => sum + (followedInterestWeights.get(tag) ?? 0), 0);
      const commentCount = profileData.commentCountMap.get(row.id) ?? 0;
      const followerCount = profileData.followerCountMap.get(row.id) ?? 0;
      const reputation = profileData.reputationMap.get(row.id) ?? defaultContributorReputation();

      if (overlapScore === 0 && sharedViewerInterestCount === 0) {
        return null;
      }

      const matchingTags = interestTags.filter((tag) => followedInterestWeights.has(tag)).slice(0, 3);
      const reasonParts = [];
      if (matchingTags.length > 0) {
        reasonParts.push(`Similar to who you follow on ${formatInterestList(matchingTags)}`);
      }
      if (sharedViewerInterestCount > 0) {
        reasonParts.push("Also overlaps with your interests");
      }
      reasonParts.push(reputation.description);

      return {
        id: row.id,
        handle: row.handle,
        verifiedHuman: true,
        reputation,
        interestTags,
        commentCount,
        followerCount,
        sharedInterestCount: sharedViewerInterestCount,
        reason: reasonParts.join(" • "),
        score:
          overlapScore * 4 +
          sharedViewerInterestCount * 3 +
          commentCount * 2 +
          followerCount * 2 +
          getReputationWeight(reputation.level)
      };
    })
    .filter((profile): profile is DiscoveryProfile & { score: number } => Boolean(profile))
    .sort((left, right) => right.score - left.score || right.commentCount - left.commentCount)
    .slice(0, limit)
    .map(({ score: _score, ...profile }) => profile);
}

export async function getPagesBookmarkedByFollowedProfiles(
  profileId: string,
  limit = 6
): Promise<FollowRecommendedPage[]> {
  const [rows, mutedRows, blockedRows, viewerContext] = await Promise.all([
    db
      .select({
        pageId: saves.pageId,
        profileId: profiles.id,
        handle: profiles.handle
      })
      .from(saves)
      .innerJoin(
        follows,
        and(eq(follows.followeeProfileId, saves.profileId), eq(follows.followerProfileId, profileId))
      )
      .innerJoin(profiles, eq(profiles.id, saves.profileId)),
    db
      .select({
        pageId: mutedPages.pageId
      })
      .from(mutedPages)
      .where(eq(mutedPages.profileId, profileId)),
    db
      .select({
        blockedProfileId: blockedProfiles.blockedProfileId
      })
      .from(blockedProfiles)
      .where(eq(blockedProfiles.profileId, profileId)),
    getViewerInterestContext(profileId)
  ]);

  const mutedPageIds = new Set(mutedRows.map((row) => row.pageId));
  const blockedProfileIds = new Set(blockedRows.map((row) => row.blockedProfileId));
  const pageSignals = new Map<string, { count: number; handles: string[] }>();

  for (const row of rows) {
    if (mutedPageIds.has(row.pageId)) continue;
    if (blockedProfileIds.has(row.profileId)) continue;
    const current = pageSignals.get(row.pageId) ?? { count: 0, handles: [] };
    current.count += 1;
    if (!current.handles.includes(row.handle)) {
      current.handles.push(row.handle);
    }
    pageSignals.set(row.pageId, current);
  }

  if (pageSignals.size === 0) {
    return [];
  }

  const pageMap = await getDiscoveryPagesByIds([...pageSignals.keys()]);

  return [...pageSignals.entries()]
    .map(([pageId, signal]) => {
      const page = pageMap.get(pageId);
      if (!page) return null;

      const handlePreview = signal.handles.slice(0, 3).map((handle) => `@${handle}`).join(", ");
      const viewerReason = buildViewerOverlapReason(page.tags, viewerContext.viewerCluster);

      return {
        ...page,
        bookmarkedByCount: signal.count,
        bookmarkedByHandles: signal.handles.slice(0, 5),
        reason:
          [
            signal.count === 1
              ? `Bookmarked by ${handlePreview}.`
              : `Bookmarked by ${handlePreview}${signal.handles.length > 3 ? " and more" : ""}.`,
            viewerReason
          ]
            .filter((value): value is string => Boolean(value))
            .join(" • "),
        score: signal.count * 8 + page.activityScore + countSharedInterestTags(page.tags, viewerContext.viewerCluster) * 4
      };
    })
    .filter((page): page is FollowRecommendedPage & { score: number } => Boolean(page))
    .sort((left, right) => right.score - left.score || right.bookmarkedByCount - left.bookmarkedByCount)
    .slice(0, limit)
    .map(({ score: _score, ...page }) => page);
}

export async function getContributorsActiveInViewerInterests(
  profileId: string,
  limit = 6
): Promise<DiscoveryProfile[]> {
  const [viewerRow, followedRows, takeCandidates, profileData] = await Promise.all([
    db.query.profiles.findFirst({
      where: eq(profiles.id, profileId)
    }),
    db
      .select({
        followeeProfileId: follows.followeeProfileId
      })
      .from(follows)
      .where(eq(follows.followerProfileId, profileId)),
    getRankedTakeCandidates(Math.max(limit * 12, 72)),
    getProfileDiscoveryRows(profileId)
  ]);

  if (!viewerRow) {
    return [];
  }

  const viewerInterests = coerceInterestTags(viewerRow.interestTags);
  if (viewerInterests.length === 0) {
    return [];
  }

  const interestCluster = [...new Set(viewerInterests.flatMap((tag) => buildInterestCluster(tag, 2)))];
  const followedIds = new Set(followedRows.map((row) => row.followeeProfileId));
  const takePageMap = await getDiscoveryPagesByIds(takeCandidates.map((take) => take.pageId));
  const interestTakeStats = new Map<string, { takeCount: number; helpfulCount: number }>();

  for (const take of takeCandidates) {
    const page = takePageMap.get(take.pageId);
    if (!page || !hasInterestOverlap(page.tags, interestCluster)) {
      continue;
    }

    const current = interestTakeStats.get(take.profileId) ?? { takeCount: 0, helpfulCount: 0 };
    current.takeCount += 1;
    current.helpfulCount += take.helpfulCount;
    interestTakeStats.set(take.profileId, current);
  }

  return profileData.profileRows
    .filter((row) => Boolean(row.nullifierHash))
    .filter((row) => !followedIds.has(row.id))
    .map((row) => {
      const interestTags = coerceInterestTags(row.interestTags);
      const sharedInterestCount = countSharedInterestTags(interestTags, interestCluster);
      const topicStats = interestTakeStats.get(row.id) ?? { takeCount: 0, helpfulCount: 0 };
      const commentCount = profileData.commentCountMap.get(row.id) ?? 0;
      const followerCount = profileData.followerCountMap.get(row.id) ?? 0;
      const reputation = profileData.reputationMap.get(row.id) ?? defaultContributorReputation();

      if (sharedInterestCount === 0 && topicStats.takeCount === 0) {
        return null;
      }

      const reasonParts = [];
      if (sharedInterestCount > 0) {
        reasonParts.push(`Declared interests overlap on ${formatInterestList(interestTags.filter((tag) => interestCluster.includes(tag)).slice(0, 3))}`);
      }
      if (topicStats.takeCount > 0) {
        reasonParts.push(`Active with ${topicStats.takeCount} recent take${topicStats.takeCount === 1 ? "" : "s"} in your graph`);
      }
      reasonParts.push(reputation.description);

      return {
        id: row.id,
        handle: row.handle,
        verifiedHuman: true,
        reputation,
        interestTags,
        commentCount,
        followerCount,
        sharedInterestCount,
        reason: reasonParts.join(" • "),
        score:
          sharedInterestCount * 5 +
          topicStats.takeCount * 8 +
          topicStats.helpfulCount * 2 +
          followerCount * 2 +
          getReputationWeight(reputation.level)
      };
    })
    .filter((profile): profile is DiscoveryProfile & { score: number } => Boolean(profile))
    .sort((left, right) => right.score - left.score || right.commentCount - left.commentCount)
    .slice(0, limit)
    .map(({ score: _score, ...profile }) => profile);
}

export async function getOrCreateDevProfile(): Promise<{ id: string; handle: string }> {
  const handle = "demo_builder";
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.handle, handle)
  });

  if (existing) return { id: existing.id, handle: existing.handle };

  const [inserted] = await db
    .insert(profiles)
    .values({
      handle
    })
    .returning();

  return { id: inserted.id, handle: inserted.handle };
}

export async function createSessionForProfile(profileId: string): Promise<string> {
  const rawToken = randomBytes(24).toString("hex");
  await db.insert(sessions).values({
    profileId,
    sessionTokenHash: sha256(rawToken),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
  });
  return rawToken;
}

export async function ensureManagedWalletForProfile(params: {
  profileId: string;
  handle?: string | null;
}): Promise<ManagedWalletSnapshot> {
  const snapshot = await getManagedWalletSnapshot(params.profileId);
  if (!snapshot) {
    throw new Error("wallet not linked");
  }

  return snapshot;
}

export async function linkManagedWalletToProfile(params: {
  profileId: string;
  handle?: string | null;
  walletAddress: string;
  walletProvider?: string | null;
  walletType?: string | null;
  network?: string | null;
  delegatedSession?: Record<string, unknown> | null;
}): Promise<ManagedWalletSnapshot> {
  const walletAddress = params.walletAddress.trim().toLowerCase();
  const walletProvider = params.walletProvider?.trim() || "coinbase_smart_wallet";
  const walletType = params.walletType?.trim() || "passkey_smart_wallet";
  const network = params.network?.trim() || "base";
  const delegatedSession = params.delegatedSession ?? {};
  const walletLabel = params.handle ? "@" + params.handle + " wallet" : "Human Layer Wallet";
  const defaultProvider = DEFAULT_CLIENT_WALLET_PROVIDERS[0];
  const enabledProviders = [...DEFAULT_CLIENT_WALLET_PROVIDERS];

  const existing = await db.query.managedWallets.findFirst({
    where: eq(managedWallets.profileId, params.profileId)
  });

  if (existing) {
    await db
      .update(managedWallets)
      .set({
        walletAddress,
        walletLabel,
        walletProvider,
        walletType,
        network,
        status: "linked",
        passkeyReady: true,
        delegatedSession,
        defaultProvider,
        enabledProviders,
        updatedAt: new Date()
      })
      .where(eq(managedWallets.id, existing.id));
  } else {
    await db.insert(managedWallets).values({
      profileId: params.profileId,
      walletAddress,
      walletLabel,
      walletProvider,
      walletType,
      network,
      status: "linked",
      passkeyReady: true,
      delegatedSession,
      defaultProvider,
      enabledProviders
    });
  }

  const snapshot = await getManagedWalletSnapshot(params.profileId);
  if (!snapshot) {
    throw new Error("wallet link failed");
  }

  return snapshot;
}

export async function getManagedWalletSnapshot(
  profileId: string
): Promise<ManagedWalletSnapshot | null> {
  const wallet = await db.query.managedWallets.findFirst({
    where: eq(managedWallets.profileId, profileId)
  });

  if (!wallet) return null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [spentTodayRows, paymentRows] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(${x402Events.amountUsdCents}), 0)::int`
      })
      .from(x402Events)
      .where(
        and(
          eq(x402Events.profileId, profileId),
          ne(x402Events.status, "failed"),
          sql`${x402Events.createdAt} >= ${startOfDay.toISOString()}::timestamptz`
        )
      ),
    db
      .select({
        id: x402Events.id,
        kind: x402Events.kind,
        status: x402Events.status,
        amountUsdCents: x402Events.amountUsdCents,
        provider: x402Events.provider,
        description: x402Events.description,
        pageId: x402Events.pageId,
        pageTitle: pages.title,
        createdAt: x402Events.createdAt
      })
      .from(x402Events)
      .leftJoin(pages, eq(pages.id, x402Events.pageId))
      .where(eq(x402Events.profileId, profileId))
      .orderBy(desc(x402Events.createdAt))
      .limit(12)
  ]);

  const spentTodayUsdCents = spentTodayRows[0]?.total ?? 0;

  return {
    walletId: wallet.id,
    walletAddress: wallet.walletAddress,
    walletLabel: wallet.walletLabel,
    walletProvider: wallet.walletProvider,
    walletType: wallet.walletType,
    network: wallet.network,
    status: wallet.status,
    passkeyReady: wallet.passkeyReady,
    delegatedSession: wallet.delegatedSession,
    spendingEnabled: wallet.spendingEnabled,
    dailySpendLimitUsdCents: wallet.dailySpendLimitUsdCents,
    defaultProvider: sanitizeManagedWalletProvider(wallet.defaultProvider),
    enabledProviders: sanitizeManagedWalletProviders(wallet.enabledProviders),
    lastUsedAt: wallet.lastUsedAt ? toIsoDateString(wallet.lastUsedAt) : null,
    createdAt: toIsoDateString(wallet.createdAt),
    spentTodayUsdCents,
    remainingDailyBudgetUsdCents: Math.max(0, wallet.dailySpendLimitUsdCents - spentTodayUsdCents),
    paymentHistory: paymentRows.map((row) => ({
      id: row.id,
      kind: row.kind,
      status: row.status,
      amountUsdCents: row.amountUsdCents,
      provider: row.provider ? sanitizeManagedWalletProvider(row.provider) : null,
      description: row.description,
      pageId: row.pageId,
      pageTitle: row.pageTitle,
      createdAt: toIsoDateString(row.createdAt)
    }))
  };
}

export async function updateManagedWalletSettings(params: {
  profileId: string;
  spendingEnabled: boolean;
  dailySpendLimitUsdCents: number;
  defaultProvider: ManagedWalletProviderId;
  enabledProviders: ManagedWalletProviderId[];
}): Promise<ManagedWalletSnapshot> {
  const wallet = await getManagedWalletSnapshot(params.profileId);
  if (!wallet) {
    throw new Error("wallet not linked");
  }
  const enabledProviders = sanitizeManagedWalletProviders(params.enabledProviders);
  const defaultProvider = enabledProviders.includes(params.defaultProvider)
    ? params.defaultProvider
    : enabledProviders[0];

  await db
    .update(managedWallets)
    .set({
      spendingEnabled: params.spendingEnabled,
      dailySpendLimitUsdCents: Math.max(100, params.dailySpendLimitUsdCents),
      defaultProvider,
      enabledProviders,
      updatedAt: new Date()
    })
    .where(eq(managedWallets.id, wallet.walletId));

  return ensureManagedWalletForProfile({ profileId: params.profileId });
}

export async function recordWalletResearchPayment(params: {
  profileId: string;
  pageId?: string | null;
  provider: ManagedWalletProviderId;
  amountUsdCents: number;
  description: string;
  status: string;
  metadata?: Record<string, unknown>;
}): Promise<WalletResearchPaymentRecord> {
  const wallet = await getManagedWalletSnapshot(params.profileId);
  if (!wallet) {
    throw new Error("wallet not linked");
  }

  await db.transaction(async (tx) => {
    await tx.insert(x402Events).values({
      profileId: params.profileId,
      walletId: wallet.walletId,
      pageId: params.pageId ?? null,
      kind: "wallet_research",
      provider: params.provider,
      description: params.description,
      status: params.status,
      amountUsdCents: params.amountUsdCents,
      metadata: params.metadata ?? {}
    });

    await tx
      .update(managedWallets)
      .set({
        lastUsedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(managedWallets.id, wallet.walletId));
  });

  const updated = await getManagedWalletSnapshot(params.profileId);
  if (!updated) {
    throw new Error("wallet payment record missing");
  }

  return {
    eventId: updated.paymentHistory[0]?.id ?? "",
    remainingDailyBudgetUsdCents: updated.remainingDailyBudgetUsdCents
  };
}

export async function getSessionProfileByRawToken(rawToken: string): Promise<{
  id: string;
  handle: string;
} | null> {
  const sessionHash = sha256(rawToken);
  const row = await db
    .select({
      id: profiles.id,
      handle: profiles.handle
    })
    .from(sessions)
    .innerJoin(profiles, eq(profiles.id, sessions.profileId))
    .where(and(eq(sessions.sessionTokenHash, sessionHash), sql`${sessions.expiresAt} > now()`))
    .limit(1);

  return row[0] ?? null;
}

export async function getProfileById(profileId: string): Promise<{
  id: string;
  handle: string;
  blockedAt: string | null;
  blockedReasonCode: string | null;
} | null> {
  const row = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId)
  });

  if (!row) return null;

  return {
    id: row.id,
    handle: row.handle,
    blockedAt: row.blockedAt ? row.blockedAt.toISOString() : null,
    blockedReasonCode: row.blockedReasonCode ?? null
  };
}

export async function blockProfileForProfile(params: {
  profileId: string;
  blockedProfileId: string;
}): Promise<void> {
  await db
    .insert(blockedProfiles)
    .values({
      profileId: params.profileId,
      blockedProfileId: params.blockedProfileId
    })
    .onConflictDoNothing();
}

export async function isProfileBlockedForProfile(params: {
  profileId: string;
  blockedProfileId: string;
}): Promise<boolean> {
  const row = await db.query.blockedProfiles.findFirst({
    where: and(
      eq(blockedProfiles.profileId, params.profileId),
      eq(blockedProfiles.blockedProfileId, params.blockedProfileId)
    )
  });

  return Boolean(row);
}

export async function getStoredProfileByHandle(handle: string): Promise<StoredProfile | null> {
  const row = await db.query.profiles.findFirst({
    where: eq(profiles.handle, handle)
  });

  if (!row) return null;

  return mapStoredProfile(row);
}

export async function getStoredProfileByNullifier(
  nullifierHash: string
): Promise<StoredProfile | null> {
  const row = await db.query.profiles.findFirst({
    where: eq(profiles.nullifierHash, nullifierHash)
  });

  if (!row) return null;

  return mapStoredProfile(row);
}

export async function upsertVerifiedProfile(params: {
  nullifierHash: string;
  handle: string;
  interestTags: InterestTag[];
  verificationLevel: "orb" | "device";
  signal?: string | null;
}): Promise<{ created: boolean; profile: StoredProfile }> {
  const interestTags = uniqueInterestTags(params.interestTags).slice(0, MAX_PROFILE_INTERESTS);

  return db.transaction(async (tx) => {
    const existingProfile = await tx.query.profiles.findFirst({
      where: eq(profiles.nullifierHash, params.nullifierHash)
    });

    if (existingProfile) {
      const conflictingHandle = await tx.query.profiles.findFirst({
        where: eq(profiles.handle, params.handle)
      });

      if (conflictingHandle && conflictingHandle.id !== existingProfile.id) {
        throw new HandleTakenError(params.handle);
      }

      const [updatedProfile] = await tx
        .update(profiles)
        .set({
          handle: params.handle,
          interestTags,
          nullifierHash: params.nullifierHash
        })
        .where(eq(profiles.id, existingProfile.id))
        .returning();

      await tx
        .insert(worldIdVerifications)
        .values({
          profileId: updatedProfile.id,
          nullifierHash: params.nullifierHash,
          verificationLevel: params.verificationLevel,
          signal: params.signal ?? null
        })
        .onConflictDoUpdate({
          target: worldIdVerifications.nullifierHash,
          set: {
            profileId: updatedProfile.id,
            verificationLevel: params.verificationLevel,
            signal: params.signal ?? null
          }
        });

      return {
        created: false,
        profile: mapStoredProfile(updatedProfile)
      };
    }

    const conflictingHandle = await tx.query.profiles.findFirst({
      where: eq(profiles.handle, params.handle)
    });

    if (conflictingHandle) {
      throw new HandleTakenError(params.handle);
    }

    const [insertedProfile] = await tx
      .insert(profiles)
      .values({
        handle: params.handle,
        nullifierHash: params.nullifierHash,
        interestTags
      })
      .returning();

    await tx
      .insert(worldIdVerifications)
      .values({
        profileId: insertedProfile.id,
        nullifierHash: params.nullifierHash,
        verificationLevel: params.verificationLevel,
        signal: params.signal ?? null
      })
      .onConflictDoUpdate({
        target: worldIdVerifications.nullifierHash,
        set: {
          profileId: insertedProfile.id,
          verificationLevel: params.verificationLevel,
          signal: params.signal ?? null
        }
      });

    return {
      created: true,
      profile: mapStoredProfile(insertedProfile)
    };
  });
}

export async function ensureManagedAtprotoIdentityForProfile(params: {
  profileId: string;
  handle: string;
}): Promise<AtprotoIdentity> {
  return db.transaction(async (tx) => {
    const atprotoHandle = buildManagedAtprotoHandle(params.handle);
    const atprotoDid = buildManagedAtprotoDid(params.profileId);
    const atprotoStatus: AtprotoIdentityStatus = "reserved";

    await tx
      .update(profiles)
      .set({
        atprotoDid,
        atprotoHandle,
        atprotoStatus
      })
      .where(eq(profiles.id, params.profileId));

    const [account] = await tx
      .insert(atprotoAccounts)
      .values({
        profileId: params.profileId,
        did: atprotoDid,
        handle: atprotoHandle,
        pdsUrl: ATPROTO_MANAGED_PDS_URL,
        accountType: "managed",
        status: atprotoStatus,
        publicPostingEnabled: false,
        metadata: {
          domain: ATPROTO_MANAGED_DOMAIN,
          provisioningMode: "reserved_identity"
        },
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: atprotoAccounts.profileId,
        set: {
          did: atprotoDid,
          handle: atprotoHandle,
          pdsUrl: ATPROTO_MANAGED_PDS_URL,
          status: atprotoStatus,
          metadata: {
            domain: ATPROTO_MANAGED_DOMAIN,
            provisioningMode: "reserved_identity"
          },
          updatedAt: new Date()
        }
      })
      .returning({
        id: atprotoAccounts.id
      });

    await tx.insert(atprotoSyncEvents).values({
      profileId: params.profileId,
      accountId: account?.id ?? null,
      eventType: "identity_reserved",
      status: "completed",
      payload: {
        did: atprotoDid,
        handle: atprotoHandle,
        domain: ATPROTO_MANAGED_DOMAIN
      },
      completedAt: new Date()
    });

    return {
      did: atprotoDid,
      handle: atprotoHandle,
      status: atprotoStatus
    };
  });
}

export async function getAtprotoAccountSnapshot(
  profileId: string
): Promise<AtprotoAccountSnapshot | null> {
  const row = await db.query.atprotoAccounts.findFirst({
    where: eq(atprotoAccounts.profileId, profileId)
  });

  if (!row) {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId)
    });

    if (!profile?.atprotoDid || !profile.atprotoHandle || !profile.atprotoStatus) {
      return null;
    }

    return {
      profileId: profile.id,
      profileHandle: profile.handle,
      handle: profile.atprotoHandle,
      did: profile.atprotoDid,
      status: profile.atprotoStatus as AtprotoIdentityStatus,
      pdsUrl: ATPROTO_MANAGED_PDS_URL,
      accountType: "managed",
      publicPostingEnabled: false,
      metadata: {
        domain: ATPROTO_MANAGED_DOMAIN,
        provisioningMode: "reserved_identity"
      },
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.createdAt.toISOString()
    };
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    columns: {
      id: true,
      handle: true
    }
  });

  if (!profile) {
    return null;
  }

  return {
    profileId: profile.id,
    profileHandle: profile.handle,
    handle: row.handle,
    did: row.did,
    status: row.status as AtprotoIdentityStatus,
    pdsUrl: row.pdsUrl,
    accountType: row.accountType,
    publicPostingEnabled: row.publicPostingEnabled,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function finalizeManagedAtprotoIdentityForProfile(params: {
  profileId: string;
  handle: string;
  did: string;
  status: AtprotoIdentityStatus;
  pdsUrl: string;
  publicPostingEnabled?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<AtprotoAccountSnapshot> {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .update(profiles)
      .set({
        atprotoDid: params.did,
        atprotoHandle: params.handle,
        atprotoStatus: params.status
      })
      .where(eq(profiles.id, params.profileId))
      .returning({
        id: profiles.id,
        handle: profiles.handle
      });

    const [account] = await tx
      .insert(atprotoAccounts)
      .values({
        profileId: params.profileId,
        did: params.did,
        handle: params.handle,
        pdsUrl: params.pdsUrl,
        accountType: "managed",
        status: params.status,
        publicPostingEnabled: params.publicPostingEnabled ?? false,
        metadata: params.metadata ?? {},
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: atprotoAccounts.profileId,
        set: {
          did: params.did,
          handle: params.handle,
          pdsUrl: params.pdsUrl,
          status: params.status,
          publicPostingEnabled: params.publicPostingEnabled ?? false,
          metadata: params.metadata ?? {},
          updatedAt: new Date()
        }
      })
      .returning();

    await tx.insert(atprotoSyncEvents).values({
      profileId: params.profileId,
      accountId: account.id,
      eventType: "identity_provisioned",
      status: "completed",
      payload: {
        did: params.did,
        handle: params.handle,
        pdsUrl: params.pdsUrl,
        status: params.status
      },
      completedAt: new Date()
    });

    return {
      profileId: profile.id,
      profileHandle: profile.handle,
      handle: account.handle,
      did: account.did,
      status: account.status as AtprotoIdentityStatus,
      pdsUrl: account.pdsUrl,
      accountType: account.accountType,
      publicPostingEnabled: account.publicPostingEnabled,
      metadata: (account.metadata as Record<string, unknown>) ?? {},
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString()
    };
  });
}

export async function updateAtprotoAccountSettings(params: {
  profileId: string;
  publicPostingEnabled: boolean;
}): Promise<AtprotoAccountSnapshot> {
  const [account] = await db
    .update(atprotoAccounts)
    .set({
      publicPostingEnabled: params.publicPostingEnabled,
      updatedAt: new Date()
    })
    .where(eq(atprotoAccounts.profileId, params.profileId))
    .returning();

  if (!account) {
    throw new Error("atproto account not linked");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, params.profileId),
    columns: {
      id: true,
      handle: true
    }
  });

  if (!profile) {
    throw new Error("profile not found");
  }

  return {
    profileId: profile.id,
    profileHandle: profile.handle,
    handle: account.handle,
    did: account.did,
    status: account.status as AtprotoIdentityStatus,
    pdsUrl: account.pdsUrl,
    accountType: account.accountType,
    publicPostingEnabled: account.publicPostingEnabled,
    metadata: (account.metadata as Record<string, unknown>) ?? {},
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString()
  };
}

async function getProfileCounts(profileId: string) {
  const [commentCountRow] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(comments)
    .where(and(eq(comments.profileId, profileId), eq(comments.hidden, false)));

  const [saveCountRow] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(saves)
    .where(eq(saves.profileId, profileId));

  const [followersCountRow] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(follows)
    .where(eq(follows.followeeProfileId, profileId));

  const [followingCountRow] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(follows)
    .where(eq(follows.followerProfileId, profileId));

  return {
    comments: commentCountRow?.count ?? 0,
    saves: saveCountRow?.count ?? 0,
    followers: followersCountRow?.count ?? 0,
    following: followingCountRow?.count ?? 0
  };
}

async function getRecentProfileComments(profileId: string): Promise<ProfileSnapshot["recentComments"]> {
  const rows = await db
    .select({
      commentId: comments.id,
      profileId: profiles.id,
      profileHandle: profiles.handle,
      body: comments.body,
      createdAt: comments.createdAt,
      pageId: pages.id,
      pageKind: pages.pageKind,
      pageTitle: pages.title,
      canonicalUrl: pages.canonicalUrl
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.id, comments.profileId))
    .innerJoin(pages, eq(pages.id, comments.pageId))
    .where(and(eq(comments.profileId, profileId), eq(comments.hidden, false)))
    .orderBy(desc(comments.createdAt))
    .limit(10);

  const commentIds = rows.map((row) => row.commentId);
  const helpfulRows =
    commentIds.length === 0
      ? []
      : await db
          .select({
            commentId: commentHelpfulVotes.commentId,
            count: sql<number>`count(*)::int`
          })
          .from(commentHelpfulVotes)
          .where(inArray(commentHelpfulVotes.commentId, commentIds))
          .groupBy(commentHelpfulVotes.commentId);

  const helpfulCountMap = new Map(helpfulRows.map((row) => [row.commentId, row.count]));

  return rows.map((row) => ({
    commentId: row.commentId,
    profileId: row.profileId,
    profileHandle: row.profileHandle,
    body: row.body,
    helpfulCount: helpfulCountMap.get(row.commentId) ?? 0,
    createdAt: row.createdAt.toISOString(),
    pageId: row.pageId,
    pageKind: row.pageKind as PageSummary["pageKind"],
    pageTitle: row.pageTitle,
    canonicalUrl: row.canonicalUrl
  }));
}

async function getProfileActivity(profileId: string): Promise<ProfileActivityItem[]> {
  const [commentRows, verdictRows, bookmarkRows] = await Promise.all([
    db
      .select({
        id: comments.id,
        createdAt: comments.createdAt,
        body: comments.body,
        pageId: pages.id,
        pageKind: pages.pageKind,
        pageTitle: pages.title,
        canonicalUrl: pages.canonicalUrl
      })
      .from(comments)
      .innerJoin(pages, eq(pages.id, comments.pageId))
      .where(and(eq(comments.profileId, profileId), eq(comments.hidden, false)))
      .orderBy(desc(comments.createdAt))
      .limit(8),
    db
      .select({
        id: verdicts.id,
        createdAt: verdicts.createdAt,
        verdict: verdicts.verdict,
        pageId: pages.id,
        pageKind: pages.pageKind,
        pageTitle: pages.title,
        canonicalUrl: pages.canonicalUrl
      })
      .from(verdicts)
      .innerJoin(pages, eq(pages.id, verdicts.pageId))
      .where(eq(verdicts.profileId, profileId))
      .orderBy(desc(verdicts.createdAt))
      .limit(8),
    db
      .select({
        id: saves.id,
        createdAt: saves.createdAt,
        pageId: pages.id,
        pageKind: pages.pageKind,
        pageTitle: pages.title,
        canonicalUrl: pages.canonicalUrl
      })
      .from(saves)
      .innerJoin(pages, eq(pages.id, saves.pageId))
      .where(eq(saves.profileId, profileId))
      .orderBy(desc(saves.createdAt))
      .limit(8)
  ]);

  const activity: ProfileActivityItem[] = [
    ...commentRows.map((row) => ({
      id: row.id,
      type: "comment" as const,
      createdAt: row.createdAt.toISOString(),
      pageId: row.pageId,
      pageKind: row.pageKind as PageSummary["pageKind"],
      pageTitle: row.pageTitle,
      canonicalUrl: row.canonicalUrl,
      summary: row.body,
      commentId: row.id
    })),
    ...verdictRows.map((row) => ({
      id: row.id,
      type: "verdict" as const,
      createdAt: row.createdAt.toISOString(),
      pageId: row.pageId,
      pageKind: row.pageKind as PageSummary["pageKind"],
      pageTitle: row.pageTitle,
      canonicalUrl: row.canonicalUrl,
      summary: `Marked this page as ${row.verdict}.`,
      verdict: row.verdict as Verdict
    })),
    ...bookmarkRows.map((row) => ({
      id: row.id,
      type: "bookmark" as const,
      createdAt: row.createdAt.toISOString(),
      pageId: row.pageId,
      pageKind: row.pageKind as PageSummary["pageKind"],
      pageTitle: row.pageTitle,
      canonicalUrl: row.canonicalUrl,
      summary: "Bookmarked this page to come back to it later."
    }))
  ];

  return activity
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 12);
}

async function getSavedPages(profileId: string): Promise<PageSummary[]> {
  const rows = await db
    .select({
      id: pages.id,
      pageKind: pages.pageKind,
      canonicalUrl: pages.canonicalUrl,
      canonicalKey: pages.canonicalKey,
      host: pages.host,
      title: pages.title,
      savedAt: saves.createdAt
    })
    .from(saves)
    .innerJoin(pages, eq(pages.id, saves.pageId))
    .where(eq(saves.profileId, profileId))
    .orderBy(desc(saves.createdAt))
    .limit(10);

  return rows.map((row) => ({
    id: row.id,
    pageKind: row.pageKind as PageSummary["pageKind"],
    canonicalUrl: row.canonicalUrl,
    canonicalKey: row.canonicalKey,
    host: row.host,
    title: row.title
  }));
}

export async function getBookmarkedPagesForProfile(
  profileId: string,
  limit = 50
): Promise<BookmarkedPage[]> {
  const rows = await db
    .select({
      id: pages.id,
      pageKind: pages.pageKind,
      canonicalUrl: pages.canonicalUrl,
      canonicalKey: pages.canonicalKey,
      host: pages.host,
      title: pages.title,
      savedAt: saves.createdAt
    })
    .from(saves)
    .innerJoin(pages, eq(pages.id, saves.pageId))
    .where(eq(saves.profileId, profileId))
    .orderBy(desc(saves.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    pageKind: row.pageKind as PageSummary["pageKind"],
    canonicalUrl: row.canonicalUrl,
    canonicalKey: row.canonicalKey,
    host: row.host,
    title: row.title,
    savedAt: row.savedAt.toISOString()
  }));
}

async function getUnreadNotificationCommentIds(profileId: string): Promise<string[]> {
  const notifications = await getNotificationsForProfile(profileId, 500);
  return notifications.filter((item) => item.unread).map((item) => item.commentId);
}

export async function getUnreadNotificationCount(profileId: string): Promise<number> {
  const notifications = await getNotificationsForProfile(profileId, 500);
  return notifications.filter((item) => item.unread).length;
}

export async function getPublicMetricsSnapshot(): Promise<PublicMetricsSnapshot> {
  const [
    verifiedUserRows,
    commentRows,
    pageRows,
    bookmarkRows,
    helpfulVoteRows,
    profileFollowRows,
    topicFollowRows,
    verdictRows,
    pageKindRows,
    hostRows
  ] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(worldIdVerifications),
    db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(comments)
      .where(eq(comments.hidden, false)),
    db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(pages),
    db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(saves),
    db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(commentHelpfulVotes),
    db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(follows),
    db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(topicFollows),
    db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(verdicts),
    db
      .select({
        pageKind: pages.pageKind,
        count: sql<number>`count(*)::int`
      })
      .from(pages)
      .groupBy(pages.pageKind)
      .orderBy(desc(sql<number>`count(*)::int`), pages.pageKind)
      .limit(12),
    db
      .select({
        host: pages.host,
        count: sql<number>`count(*)::int`
      })
      .from(pages)
      .groupBy(pages.host)
      .orderBy(desc(sql<number>`count(*)::int`), pages.host)
      .limit(12)
  ]);

  return {
    totalVerifiedUsers: verifiedUserRows[0]?.count ?? 0,
    totalComments: commentRows[0]?.count ?? 0,
    totalPages: pageRows[0]?.count ?? 0,
    totalBookmarks: bookmarkRows[0]?.count ?? 0,
    totalHelpfulVotes: helpfulVoteRows[0]?.count ?? 0,
    totalProfileFollows: profileFollowRows[0]?.count ?? 0,
    totalTopicFollows: topicFollowRows[0]?.count ?? 0,
    totalVerdicts: verdictRows[0]?.count ?? 0,
    pageKindBreakdown: pageKindRows.map((row) => ({
      pageKind: row.pageKind as PageSummary["pageKind"],
      count: row.count
    })),
    hostBreakdown: hostRows.map((row) => ({
      host: row.host,
      count: row.count
    }))
  };
}

export async function markNotificationsRead(params: {
  profileId: string;
  commentIds: string[];
}): Promise<number> {
  const commentIds = [...new Set(params.commentIds)];
  if (commentIds.length === 0) {
    return 0;
  }

  await db
    .insert(notificationReads)
    .values(
      commentIds.map((commentId) => ({
        profileId: params.profileId,
        commentId
      }))
    )
    .onConflictDoNothing();

  return commentIds.length;
}

export async function markAllNotificationsRead(profileId: string): Promise<number> {
  const commentIds = await getUnreadNotificationCommentIds(profileId);
  return markNotificationsRead({
    profileId,
    commentIds
  });
}

export async function getNotificationsForProfile(
  profileId: string,
  limit = 50
): Promise<NotificationItem[]> {
  const preferences = await getNotificationPreferencesForProfile(profileId);
  if (
    !preferences.bookmarkedPageComments &&
    !preferences.followedProfileTakes &&
    !preferences.followedTopicTakes
  ) {
    return [];
  }

  const rows = await db
    .select({
      commentId: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      helpfulCount: sql<number>`count(${commentHelpfulVotes.id})::int`,
      authorProfileId: profiles.id,
      authorHandle: profiles.handle,
      pageId: pages.id,
      pageKind: pages.pageKind,
      pageTitle: pages.title,
      pageCanonicalUrl: pages.canonicalUrl,
      pageHost: pages.host,
      fromBookmarkedPage: sql<boolean>`bool_or(${saves.id} is not null)`,
      fromFollowedProfile: sql<boolean>`bool_or(${follows.id} is not null)`,
      readAt: sql<Date | null>`max(${notificationReads.createdAt})`
    })
    .from(comments)
    .innerJoin(pages, eq(pages.id, comments.pageId))
    .innerJoin(profiles, eq(profiles.id, comments.profileId))
    .leftJoin(commentHelpfulVotes, eq(commentHelpfulVotes.commentId, comments.id))
    .leftJoin(
      saves,
      and(eq(saves.pageId, comments.pageId), eq(saves.profileId, profileId))
    )
    .leftJoin(
      follows,
      and(eq(follows.followeeProfileId, comments.profileId), eq(follows.followerProfileId, profileId))
    )
    .leftJoin(
      notificationReads,
      and(eq(notificationReads.commentId, comments.id), eq(notificationReads.profileId, profileId))
    )
    .leftJoin(
      mutedPages,
      and(eq(mutedPages.pageId, comments.pageId), eq(mutedPages.profileId, profileId))
    )
    .leftJoin(
      mutedProfiles,
      and(eq(mutedProfiles.mutedProfileId, comments.profileId), eq(mutedProfiles.profileId, profileId))
    )
    .leftJoin(
      blockedProfiles,
      and(
        eq(blockedProfiles.blockedProfileId, comments.profileId),
        eq(blockedProfiles.profileId, profileId)
      )
    )
    .where(
      and(
        eq(comments.hidden, false),
        ne(comments.profileId, profileId),
        sql`${mutedPages.id} is null`,
        sql`${mutedProfiles.id} is null`,
        sql`${blockedProfiles.id} is null`
      )
    )
    .groupBy(
      comments.id,
      comments.body,
      comments.createdAt,
      profiles.id,
      profiles.handle,
      pages.id,
      pages.pageKind,
      pages.title,
      pages.canonicalUrl,
      pages.host
    )
    .orderBy(desc(comments.createdAt))
    .limit(Math.max(limit * 8, 120));

  const [reputationMap, topicMatchMap] = await Promise.all([
    getContributorReputationMap(rows.map((row) => row.authorProfileId)),
    getTopicMatchMap(
      profileId,
      rows.map((row) => row.pageId)
    )
  ]);

  return rows
    .map((row) => {
      const sources: NotificationSource[] = [];
      if (preferences.bookmarkedPageComments && row.fromBookmarkedPage) sources.push("bookmarked_page");
      if (preferences.followedProfileTakes && row.fromFollowedProfile) sources.push("followed_profile");
      if (preferences.followedTopicTakes && (topicMatchMap.get(row.pageId)?.length ?? 0) > 0) {
        sources.push("followed_topic");
      }

      const authorReputation =
        reputationMap.get(row.authorProfileId) ?? defaultContributorReputation();

      return {
        commentId: row.commentId,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        helpfulCount: row.helpfulCount,
        authorProfileId: row.authorProfileId,
        authorHandle: row.authorHandle,
        authorReputation,
        pageId: row.pageId,
        pageKind: row.pageKind as PageSummary["pageKind"],
        pageTitle: row.pageTitle,
        pageCanonicalUrl: row.pageCanonicalUrl,
        pageHost: row.pageHost,
        sources,
        unread: row.readAt === null,
        reason: buildNotificationReason(sources)
      };
    })
    .filter((item) => item.sources.length > 0)
    .sort(
      (left, right) =>
        Number(right.unread) - Number(left.unread) ||
        rankTakeLikeSignal({
          helpfulCount: right.helpfulCount,
          createdAt: right.createdAt,
          reputationLevel: right.authorReputation?.level
        }) -
          rankTakeLikeSignal({
            helpfulCount: left.helpfulCount,
            createdAt: left.createdAt,
            reputationLevel: left.authorReputation?.level
          }) ||
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, limit);
}

export async function getFollowedProfileActivity(
  profileId: string,
  limit = 12
): Promise<FollowGraphItem[]> {
  const preferences = await getNotificationPreferencesForProfile(profileId);
  if (!preferences.followedProfileTakes) {
    return [];
  }

  const viewerContext = await getViewerInterestContext(profileId);
  const rows = await db
    .select({
      commentId: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      helpfulCount: sql<number>`count(${commentHelpfulVotes.id})::int`,
      authorProfileId: profiles.id,
      authorHandle: profiles.handle,
      pageId: pages.id,
      pageKind: pages.pageKind,
      pageTitle: pages.title,
      pageCanonicalUrl: pages.canonicalUrl,
      pageHost: pages.host
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.id, comments.profileId))
    .innerJoin(pages, eq(pages.id, comments.pageId))
    .innerJoin(
      follows,
      and(eq(follows.followeeProfileId, comments.profileId), eq(follows.followerProfileId, profileId))
    )
    .leftJoin(commentHelpfulVotes, eq(commentHelpfulVotes.commentId, comments.id))
    .leftJoin(
      mutedPages,
      and(eq(mutedPages.pageId, comments.pageId), eq(mutedPages.profileId, profileId))
    )
    .leftJoin(
      mutedProfiles,
      and(eq(mutedProfiles.mutedProfileId, comments.profileId), eq(mutedProfiles.profileId, profileId))
    )
    .leftJoin(
      blockedProfiles,
      and(
        eq(blockedProfiles.blockedProfileId, comments.profileId),
        eq(blockedProfiles.profileId, profileId)
      )
    )
    .where(
      and(
        eq(comments.hidden, false),
        ne(comments.profileId, profileId),
        sql`${mutedPages.id} is null`,
        sql`${mutedProfiles.id} is null`,
        sql`${blockedProfiles.id} is null`
      )
    )
    .groupBy(
      comments.id,
      comments.body,
      comments.createdAt,
      profiles.id,
      profiles.handle,
      pages.id,
      pages.pageKind,
      pages.title,
      pages.canonicalUrl,
      pages.host
    )
    .orderBy(desc(comments.createdAt))
    .limit(Math.max(limit * 3, 24));

  const reputationMap = await getContributorReputationMap(rows.map((row) => row.authorProfileId));
  const pageMap = await getDiscoveryPagesByIds(rows.map((row) => row.pageId));

  return rows
    .map((row) => {
      const page = pageMap.get(row.pageId);
      const viewerReason = page ? buildViewerOverlapReason(page.tags, viewerContext.viewerCluster) : null;
      return {
        commentId: row.commentId,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        helpfulCount: row.helpfulCount,
        authorProfileId: row.authorProfileId,
        authorHandle: row.authorHandle,
        authorReputation: reputationMap.get(row.authorProfileId) ?? defaultContributorReputation(),
        pageId: row.pageId,
        pageKind: row.pageKind as PageSummary["pageKind"],
        pageTitle: row.pageTitle,
        pageCanonicalUrl: row.pageCanonicalUrl,
        pageHost: row.pageHost,
        reason: [
          "New take from someone you follow.",
          viewerReason
        ]
          .filter((value): value is string => Boolean(value))
          .join(" • "),
        score:
          rankTakeLikeSignal({
            helpfulCount: row.helpfulCount,
            createdAt: row.createdAt,
            reputationLevel: reputationMap.get(row.authorProfileId)?.level
          }) +
          (page?.bookmarkCount ?? 0)
      } satisfies FollowGraphItem & { score: number };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, limit)
    .map(({ score: _score, ...item }) => item);
}

export async function getNotificationPreferencesForProfile(
  profileId: string
): Promise<NotificationPreferences> {
  const row = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    columns: {
      notifyBookmarkedPageComments: true,
      notifyFollowedProfileTakes: true,
      notifyFollowedTopicTakes: true
    }
  });

  return {
    bookmarkedPageComments: row?.notifyBookmarkedPageComments ?? true,
    followedProfileTakes: row?.notifyFollowedProfileTakes ?? true,
    followedTopicTakes: row?.notifyFollowedTopicTakes ?? true
  };
}

export async function updateNotificationPreferences(params: {
  profileId: string;
  bookmarkedPageComments: boolean;
  followedProfileTakes: boolean;
  followedTopicTakes: boolean;
}): Promise<NotificationPreferences> {
  await db
    .update(profiles)
    .set({
      notifyBookmarkedPageComments: params.bookmarkedPageComments,
      notifyFollowedProfileTakes: params.followedProfileTakes,
      notifyFollowedTopicTakes: params.followedTopicTakes
    })
    .where(eq(profiles.id, params.profileId));

  return {
    bookmarkedPageComments: params.bookmarkedPageComments,
    followedProfileTakes: params.followedProfileTakes,
    followedTopicTakes: params.followedTopicTakes
  };
}

async function buildProfileSnapshot(profile: StoredProfile): Promise<ProfileSnapshot> {
  const [counts, recentComments, savedPages, activity, reputationMap] = await Promise.all([
    getProfileCounts(profile.id),
    getRecentProfileComments(profile.id),
    getSavedPages(profile.id),
    getProfileActivity(profile.id),
    getContributorReputationMap([profile.id])
  ]);

  const reputation = reputationMap.get(profile.id) ?? defaultContributorReputation();

  return {
    id: profile.id,
    handle: profile.handle,
    verifiedHuman: Boolean(profile.nullifierHash),
    atproto: profile.atproto,
    reputation,
    interestTags: profile.interestTags,
    counts,
    recentComments: recentComments.map((comment) => ({
      ...comment,
      reputation
    })),
    savedPages,
    activity,
    createdAt: profile.createdAt
  };
}

export async function getProfileSnapshotByHandle(handle: string): Promise<ProfileSnapshot | null> {
  const profile = await getStoredProfileByHandle(handle);
  if (!profile) return null;
  return buildProfileSnapshot(profile);
}

export async function getProfileSnapshotById(profileId: string): Promise<ProfileSnapshot | null> {
  const row = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId)
  });

  if (!row) return null;

  return buildProfileSnapshot(mapStoredProfile(row));
}

export async function ensureSeedProfiles(): Promise<{
  builderId: string;
  researcherId: string;
}> {
  const [builder] = await db
    .insert(profiles)
    .values({
      handle: "demo_builder",
      interestTags: ["devtools", "oss", "infra"]
    })
    .onConflictDoUpdate({
      target: profiles.handle,
      set: {
        handle: "demo_builder",
        interestTags: ["devtools", "oss", "infra"]
      }
    })
    .returning();

  const [researcher] = await db
    .insert(profiles)
    .values({
      handle: "demo_researcher",
      interestTags: ["research", "ai", "markets"]
    })
    .onConflictDoUpdate({
      target: profiles.handle,
      set: {
        handle: "demo_researcher",
        interestTags: ["research", "ai", "markets"]
      }
    })
    .returning();

  return {
    builderId: builder.id,
    researcherId: researcher.id
  };
}

export async function ensureDemoProfiles(): Promise<Array<{
  id: string;
  handle: string;
  interestTags: InterestTag[];
}>> {
  const rows: Array<{
    id: string;
    handle: string;
    interestTags: InterestTag[];
  }> = [];

  for (const profile of DEMO_PROFILE_DEFINITIONS) {
    const [inserted] = await db
      .insert(profiles)
      .values({
        handle: profile.handle,
        interestTags: profile.interestTags,
        nullifierHash: profile.nullifierHash
      })
      .onConflictDoUpdate({
        target: profiles.handle,
        set: {
          interestTags: profile.interestTags,
          nullifierHash: profile.nullifierHash
        }
      })
      .returning({
        id: profiles.id,
        handle: profiles.handle,
        interestTags: profiles.interestTags
      });

    await db
      .insert(worldIdVerifications)
      .values({
        profileId: inserted.id,
        nullifierHash: profile.nullifierHash,
        verificationLevel: profile.verificationLevel,
        signal: "demo-profile"
      })
      .onConflictDoUpdate({
        target: worldIdVerifications.nullifierHash,
        set: {
          profileId: inserted.id,
          verificationLevel: profile.verificationLevel,
          signal: "demo-profile"
        }
      });

    rows.push(inserted);
  }

  return rows;
}

export async function createSeedComment(params: {
  pageId: string;
  profileId: string;
  body: string;
  helpfulProfileId?: string;
  createdAt?: Date;
}): Promise<void> {
  const existing = await db.query.comments.findFirst({
    where: and(
      eq(comments.pageId, params.pageId),
      eq(comments.profileId, params.profileId),
      eq(comments.body, params.body)
    )
  });

  if (existing) {
    if (params.helpfulProfileId) {
      await db
        .insert(commentHelpfulVotes)
        .values({
          commentId: existing.id,
          profileId: params.helpfulProfileId
        })
        .onConflictDoNothing();
    }
    return;
  }

  const [comment] = await db
    .insert(comments)
    .values({
      pageId: params.pageId,
      profileId: params.profileId,
      body: params.body,
      createdAt: params.createdAt ?? new Date()
    })
    .onConflictDoNothing()
    .returning();

  if (!comment) return;

  if (params.helpfulProfileId) {
    await db
      .insert(commentHelpfulVotes)
      .values({
        commentId: comment.id,
        profileId: params.helpfulProfileId
      })
      .onConflictDoNothing();
  }
}

export async function seedPageVerdict(params: {
  pageId: string;
  profileId: string;
  verdict: Verdict;
}): Promise<void> {
  await db
    .insert(verdicts)
    .values({
      pageId: params.pageId,
      profileId: params.profileId,
      verdict: params.verdict
    })
    .onConflictDoNothing();
}

export async function seedFollowAndSave(params: {
  pageId: string;
  followerProfileId: string;
  followeeProfileId: string;
}): Promise<void> {
  await db
    .insert(saves)
    .values({
      pageId: params.pageId,
      profileId: params.followerProfileId
    })
    .onConflictDoNothing();

  await db
    .insert(follows)
    .values({
      followerProfileId: params.followerProfileId,
      followeeProfileId: params.followeeProfileId
    })
    .onConflictDoNothing();
}

export async function upsertVerdictForPage(params: {
  pageId: string;
  profileId: string;
  verdict: Verdict;
}): Promise<void> {
  await db
    .insert(verdicts)
    .values({
      pageId: params.pageId,
      profileId: params.profileId,
      verdict: params.verdict
    })
    .onConflictDoUpdate({
      target: [verdicts.pageId, verdicts.profileId],
      set: {
        verdict: params.verdict
      }
    });
}

export async function createCommentForPage(params: {
  pageId: string;
  profileId: string;
  body: string;
  mediaTimestampSeconds?: number | null;
}): Promise<{
  id: string;
}> {
  const [inserted] = await db
    .insert(comments)
    .values({
      pageId: params.pageId,
      profileId: params.profileId,
      body: params.body,
      mediaTimestampSeconds: params.mediaTimestampSeconds ?? null
    })
    .returning({
      id: comments.id
    });

  return inserted;
}

export async function findCommentById(commentId: string): Promise<{
  id: string;
  pageId: string;
  profileId: string;
  body: string;
  hidden: boolean;
  reasonCode: string | null;
} | null> {
  const row = await db.query.comments.findFirst({
    where: eq(comments.id, commentId)
  });

  if (!row) return null;

  return {
    id: row.id,
    pageId: row.pageId,
    profileId: row.profileId,
    body: row.body,
    hidden: row.hidden,
    reasonCode: row.reasonCode
  };
}

export async function markCommentHelpful(params: {
  commentId: string;
  profileId: string;
}): Promise<{ created: boolean; helpfulCount: number }> {
  const inserted = await db
    .insert(commentHelpfulVotes)
    .values({
      commentId: params.commentId,
      profileId: params.profileId
    })
    .onConflictDoNothing()
    .returning({
      id: commentHelpfulVotes.id
    });

  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(commentHelpfulVotes)
    .where(eq(commentHelpfulVotes.commentId, params.commentId));

  return {
    created: inserted.length > 0,
    helpfulCount: row?.count ?? 0
  };
}

export async function hasProfileSavedPage(params: {
  pageId: string;
  profileId: string;
}): Promise<boolean> {
  const row = await db.query.saves.findFirst({
    where: and(eq(saves.pageId, params.pageId), eq(saves.profileId, params.profileId))
  });

  return Boolean(row);
}

export async function getPageSocialProof(params: {
  pageId: string;
  profileId: string;
}): Promise<PageSocialProofSummary> {
  const rows = await db
    .select({
      profileId: profiles.id,
      handle: profiles.handle
    })
    .from(saves)
    .innerJoin(
      follows,
      and(eq(follows.followeeProfileId, saves.profileId), eq(follows.followerProfileId, params.profileId))
    )
    .innerJoin(profiles, eq(profiles.id, saves.profileId))
    .leftJoin(
      mutedProfiles,
      and(eq(mutedProfiles.mutedProfileId, saves.profileId), eq(mutedProfiles.profileId, params.profileId))
    )
    .leftJoin(
      blockedProfiles,
      and(eq(blockedProfiles.blockedProfileId, saves.profileId), eq(blockedProfiles.profileId, params.profileId))
    )
    .where(
      and(
        eq(saves.pageId, params.pageId),
        sql`${mutedProfiles.id} is null`,
        sql`${blockedProfiles.id} is null`
      )
    );

  const handles: string[] = [];
  const seenProfileIds = new Set<string>();

  for (const row of rows) {
    if (seenProfileIds.has(row.profileId)) continue;
    seenProfileIds.add(row.profileId);
    handles.push(row.handle);
  }

  return {
    followedBookmarkCount: seenProfileIds.size,
    followedBookmarkHandles: handles.slice(0, 3)
  };
}

export async function savePageForProfile(params: {
  pageId: string;
  profileId: string;
}): Promise<void> {
  await db
    .insert(saves)
    .values({
      pageId: params.pageId,
      profileId: params.profileId
    })
    .onConflictDoNothing();
}

export async function mutePageForProfile(params: {
  pageId: string;
  profileId: string;
}): Promise<void> {
  await db
    .insert(mutedPages)
    .values({
      pageId: params.pageId,
      profileId: params.profileId
    })
    .onConflictDoNothing();
}

export async function hasMutedPageForProfile(params: {
  pageId: string;
  profileId: string;
}): Promise<boolean> {
  const row = await db.query.mutedPages.findFirst({
    where: and(eq(mutedPages.pageId, params.pageId), eq(mutedPages.profileId, params.profileId))
  });

  return Boolean(row);
}

export async function muteProfileForProfile(params: {
  mutedProfileId: string;
  profileId: string;
}): Promise<void> {
  await db
    .insert(mutedProfiles)
    .values({
      mutedProfileId: params.mutedProfileId,
      profileId: params.profileId
    })
    .onConflictDoNothing();
}

export async function createCommentReport(params: {
  commentId: string;
  reporterProfileId: string;
  reasonCode: CommentReportReasonCode | string;
  details?: string | null;
}): Promise<void> {
  await db
    .insert(commentReports)
    .values({
      commentId: params.commentId,
      reporterProfileId: params.reporterProfileId,
      reasonCode: params.reasonCode,
      details: params.details ?? null,
      status: "open",
      reviewedAt: null,
      reviewedByProfileId: null
    })
    .onConflictDoUpdate({
      target: [commentReports.commentId, commentReports.reporterProfileId],
      set: {
        reasonCode: params.reasonCode,
        details: params.details ?? null,
        status: "open",
        reviewedAt: null,
        reviewedByProfileId: null
      }
    });
}

export async function getModerationAuditHistory(limit = 50): Promise<ModerationAuditItem[]> {
  const rows = await db
    .select({
      id: moderationAuditEvents.id,
      actionType: moderationAuditEvents.actionType,
      reasonCode: moderationAuditEvents.reasonCode,
      note: moderationAuditEvents.note,
      actorProfileId: moderationAuditEvents.actorProfileId,
      targetProfileId: moderationAuditEvents.targetProfileId,
      commentId: moderationAuditEvents.commentId,
      metadata: moderationAuditEvents.metadata,
      createdAt: moderationAuditEvents.createdAt
    })
    .from(moderationAuditEvents)
    .orderBy(desc(moderationAuditEvents.createdAt))
    .limit(limit);

  const profileIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.actorProfileId, row.targetProfileId])
        .filter((value): value is string => Boolean(value))
    )
  ];

  const profileRows =
    profileIds.length === 0
      ? []
      : await db
          .select({
            id: profiles.id,
            handle: profiles.handle
          })
          .from(profiles)
          .where(inArray(profiles.id, profileIds));

  const handleMap = new Map(profileRows.map((row) => [row.id, row.handle]));

  return rows.map((row) => ({
    id: row.id,
    actionType: row.actionType,
    reasonCode: row.reasonCode,
    note: row.note,
    actorProfileId: row.actorProfileId,
    actorHandle: row.actorProfileId ? handleMap.get(row.actorProfileId) ?? null : null,
    targetProfileId: row.targetProfileId,
    targetHandle: row.targetProfileId ? handleMap.get(row.targetProfileId) ?? null : null,
    commentId: row.commentId,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString()
  }));
}

export async function getModerationQueue(limit = 100): Promise<ModerationQueueItem[]> {
  const rows = await db
    .select({
      reportId: commentReports.id,
      status: commentReports.status,
      reasonCode: commentReports.reasonCode,
      details: commentReports.details,
      createdAt: commentReports.createdAt,
      reviewedAt: commentReports.reviewedAt,
      commentId: comments.id,
      commentBody: comments.body,
      commentCreatedAt: comments.createdAt,
      commentHidden: comments.hidden,
      commentReasonCode: comments.reasonCode,
      authorProfileId: profiles.id,
      authorHandle: profiles.handle,
      reporterProfileId: commentReports.reporterProfileId,
      pageId: pages.id,
      pageKind: pages.pageKind,
      pageTitle: pages.title,
      pageHost: pages.host,
      pageCanonicalUrl: pages.canonicalUrl
    })
    .from(commentReports)
    .innerJoin(comments, eq(comments.id, commentReports.commentId))
    .innerJoin(profiles, eq(profiles.id, comments.profileId))
    .innerJoin(pages, eq(pages.id, comments.pageId))
    .orderBy(desc(commentReports.createdAt))
    .limit(limit);

  const reporterIds = [...new Set(rows.map((row) => row.reporterProfileId))];
  const authorIds = [...new Set(rows.map((row) => row.authorProfileId))];
  const reporterRows =
    reporterIds.length === 0
      ? []
      : await db
          .select({
            id: profiles.id,
            handle: profiles.handle
          })
          .from(profiles)
          .where(inArray(profiles.id, reporterIds));

  const [authorReportRows, hiddenCountRows, blockedRows] = await Promise.all([
    authorIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            profileId: comments.profileId,
            reportCount: sql<number>`count(${commentReports.id})::int`,
            openReportCount: sql<number>`count(case when ${commentReports.status} = 'open' then 1 end)::int`
          })
          .from(comments)
          .leftJoin(commentReports, eq(commentReports.commentId, comments.id))
          .where(inArray(comments.profileId, authorIds))
          .groupBy(comments.profileId),
    authorIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            profileId: comments.profileId,
            hiddenCommentCount: sql<number>`count(*)::int`
          })
          .from(comments)
          .where(and(inArray(comments.profileId, authorIds), eq(comments.hidden, true)))
          .groupBy(comments.profileId),
    authorIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: profiles.id,
            blockedAt: profiles.blockedAt
          })
          .from(profiles)
          .where(inArray(profiles.id, authorIds))
  ]);

  const reporterHandleMap = new Map(reporterRows.map((row) => [row.id, row.handle]));
  const authorReportMap = new Map(
    authorReportRows.map((row) => [
      row.profileId,
      {
        reportCount: row.reportCount,
        openReportCount: row.openReportCount
      }
    ])
  );
  const hiddenCountMap = new Map(hiddenCountRows.map((row) => [row.profileId, row.hiddenCommentCount]));
  const blockedAtMap = new Map(
    blockedRows.map((row) => [row.id, row.blockedAt ? row.blockedAt.toISOString() : null])
  );

  return rows
    .map((row) => {
      const reportStats = authorReportMap.get(row.authorProfileId) ?? {
        reportCount: 0,
        openReportCount: 0
      };
      const authorHiddenCommentCount = hiddenCountMap.get(row.authorProfileId) ?? 0;
      const authorBlockedAt = blockedAtMap.get(row.authorProfileId) ?? null;
      const repeatOffender = isRepeatOffender({
        authorReportCount: reportStats.reportCount,
        authorOpenReportCount: reportStats.openReportCount,
        authorHiddenCommentCount
      });
      const priority = getModerationPriority({
        reasonCode: row.reasonCode,
        status: row.status,
        authorReportCount: reportStats.reportCount,
        authorOpenReportCount: reportStats.openReportCount,
        authorHiddenCommentCount,
        authorBlockedAt
      });

      return {
        authorReportCount: reportStats.reportCount,
        authorOpenReportCount: reportStats.openReportCount,
        authorHiddenCommentCount,
        authorBlockedAt,
        repeatOffender,
        ...priority,
        reportId: row.reportId,
        status: row.status,
        reasonCode: row.reasonCode,
        details: row.details,
        createdAt: row.createdAt.toISOString(),
        reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
        commentId: row.commentId,
        commentBody: row.commentBody,
        commentCreatedAt: row.commentCreatedAt.toISOString(),
        commentHidden: row.commentHidden,
        commentReasonCode: row.commentReasonCode,
        authorProfileId: row.authorProfileId,
        authorHandle: row.authorHandle,
        reporterProfileId: row.reporterProfileId,
        reporterHandle: reporterHandleMap.get(row.reporterProfileId) ?? "unknown",
        pageId: row.pageId,
        pageKind: row.pageKind as PageSummary["pageKind"],
        pageTitle: row.pageTitle,
        pageHost: row.pageHost,
        pageCanonicalUrl: row.pageCanonicalUrl
      } satisfies ModerationQueueItem;
    })
    .sort(
      (left, right) =>
        right.priorityScore - left.priorityScore ||
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
}

export async function reviewCommentReports(params: {
  commentId: string;
  adminProfileId: string;
  action: "hide" | "dismiss" | "restore" | "block_profile" | "unblock_profile";
  reasonCode?: string | null;
  note?: string | null;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [commentRow] = await tx
      .select({
        commentId: comments.id,
        authorProfileId: comments.profileId
      })
      .from(comments)
      .where(eq(comments.id, params.commentId))
      .limit(1);

    if (!commentRow) {
      return;
    }

    const reviewedAt = new Date();

    if (params.action === "hide") {
      await tx
        .update(comments)
        .set({
          hidden: true,
          reasonCode: params.reasonCode ?? "reported_abuse"
        })
        .where(eq(comments.id, params.commentId));
    }

    if (params.action === "restore") {
      await tx
        .update(comments)
        .set({
          hidden: false,
          reasonCode: null
        })
        .where(eq(comments.id, params.commentId));
    }

    if (params.action === "block_profile") {
      await tx
        .update(profiles)
        .set({
          blockedAt: reviewedAt,
          blockedReasonCode: params.reasonCode ?? "repeat_offender",
          blockedNote: params.note ?? null,
          blockedByProfileId: params.adminProfileId
        })
        .where(eq(profiles.id, commentRow.authorProfileId));

      await tx
        .update(comments)
        .set({
          hidden: true,
          reasonCode: params.reasonCode ?? "blocked_profile"
        })
        .where(eq(comments.profileId, commentRow.authorProfileId));
    }

    if (params.action === "unblock_profile") {
      await tx
        .update(profiles)
        .set({
          blockedAt: null,
          blockedReasonCode: null,
          blockedNote: null,
          blockedByProfileId: null
        })
        .where(eq(profiles.id, commentRow.authorProfileId));
    }

    if (params.action === "block_profile") {
      const authorCommentRows = await tx
        .select({
          id: comments.id
        })
        .from(comments)
        .where(eq(comments.profileId, commentRow.authorProfileId));

      const authorCommentIds = authorCommentRows.map((row) => row.id);
      if (authorCommentIds.length > 0) {
        await tx
          .update(commentReports)
          .set({
            status: "blocked_profile",
            reviewedAt,
            reviewedByProfileId: params.adminProfileId
          })
          .where(
            and(
              inArray(commentReports.commentId, authorCommentIds),
              eq(commentReports.status, "open")
            )
          );
      }
    } else {
      await tx
        .update(commentReports)
        .set({
          status:
            params.action === "hide"
              ? "hidden"
              : params.action === "restore"
                ? "restored"
                : params.action === "unblock_profile"
                  ? "dismissed"
                  : "dismissed",
          reviewedAt,
          reviewedByProfileId: params.adminProfileId
        })
        .where(eq(commentReports.commentId, params.commentId));
    }

    await tx.insert(moderationAuditEvents).values({
      actorProfileId: params.adminProfileId,
      targetProfileId: commentRow.authorProfileId,
      commentId: params.commentId,
      actionType: params.action,
      reasonCode: params.reasonCode ?? null,
      note: params.note ?? null,
      metadata:
        params.action === "block_profile"
          ? {
              affectedProfileId: commentRow.authorProfileId,
              escalatedFromCommentId: params.commentId
            }
          : {
              reviewedCommentId: params.commentId
            }
    });
  });
}

export async function getProfileModerationState(profileId: string): Promise<{
  blocked: boolean;
  blockedAt: string | null;
  blockedReasonCode: string | null;
}> {
  const row = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    columns: {
      blockedAt: true,
      blockedReasonCode: true
    }
  });

  return {
    blocked: Boolean(row?.blockedAt),
    blockedAt: row?.blockedAt ? row.blockedAt.toISOString() : null,
    blockedReasonCode: row?.blockedReasonCode ?? null
  };
}

export async function followProfile(params: {
  followerProfileId: string;
  followeeProfileId: string;
}): Promise<void> {
  await db
    .insert(follows)
    .values({
      followerProfileId: params.followerProfileId,
      followeeProfileId: params.followeeProfileId
    })
    .onConflictDoNothing();
}

export async function getFollowedTopicsForProfile(profileId: string): Promise<InterestTag[]> {
  const rows = await db
    .select({
      topicTag: topicFollows.topicTag
    })
    .from(topicFollows)
    .where(eq(topicFollows.profileId, profileId))
    .orderBy(desc(topicFollows.createdAt));

  return rows
    .map((row) => row.topicTag)
    .filter((tag): tag is InterestTag => INTEREST_TAGS.includes(tag));
}

export async function hasProfileFollowedTopic(params: {
  profileId: string;
  topic: InterestTag;
}): Promise<boolean> {
  const row = await db.query.topicFollows.findFirst({
    where: and(eq(topicFollows.profileId, params.profileId), eq(topicFollows.topicTag, params.topic))
  });

  return Boolean(row);
}

export async function followTopicForProfile(params: {
  profileId: string;
  topic: InterestTag;
}): Promise<void> {
  await db
    .insert(topicFollows)
    .values({
      profileId: params.profileId,
      topicTag: params.topic
    })
    .onConflictDoNothing();
}

export async function getXmtpBindingForProfile(
  profileId: string
): Promise<XmtpBindingSnapshot | null> {
  const row = await db.query.xmtpBindings.findFirst({
    where: eq(xmtpBindings.profileId, profileId)
  });

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    inboxId: row.inboxId,
    createdAt: toIsoDateString(row.createdAt)
  };
}

export async function linkXmtpBindingToProfile(params: {
  profileId: string;
  inboxId: string;
}): Promise<XmtpBindingSnapshot> {
  const inboxId = params.inboxId.trim();
  if (!inboxId) {
    throw new Error("inbox id required");
  }

  const existing = await db.query.xmtpBindings.findFirst({
    where: eq(xmtpBindings.profileId, params.profileId)
  });

  if (existing) {
    await db
      .update(xmtpBindings)
      .set({
        inboxId
      })
      .where(eq(xmtpBindings.id, existing.id));
  } else {
    await db.insert(xmtpBindings).values({
      profileId: params.profileId,
      inboxId
    });
  }

  const binding = await getXmtpBindingForProfile(params.profileId);
  if (!binding) {
    throw new Error("xmtp bind failed");
  }

  return binding;
}

type MessageRequestRow = {
  id: string;
  status: string;
  createdAt: Date;
  senderProfileId: string;
  recipientProfileId: string;
  pageId: string | null;
  pageTitle: string | null;
  pageCanonicalUrl: string | null;
  pageHost: string | null;
};

async function enrichMessageRequests(
  rows: MessageRequestRow[],
  viewerProfileId: string
): Promise<MessageRequestPreview[]> {
  if (rows.length === 0) {
    return [];
  }

  const profileIds = [...new Set(rows.flatMap((row) => [row.senderProfileId, row.recipientProfileId]))];
  const [profileRows, bindingRows] = await Promise.all([
    db
      .select({
        id: profiles.id,
        handle: profiles.handle
      })
      .from(profiles)
      .where(inArray(profiles.id, profileIds)),
    db
      .select({
        profileId: xmtpBindings.profileId,
        inboxId: xmtpBindings.inboxId
      })
      .from(xmtpBindings)
      .where(inArray(xmtpBindings.profileId, profileIds))
  ]);

  const handleMap = new Map(profileRows.map((row) => [row.id, row.handle]));
  const inboxMap = new Map(bindingRows.map((row) => [row.profileId, row.inboxId]));

  return rows.map((row) => {
    const senderHandle = handleMap.get(row.senderProfileId) ?? "unknown";
    const recipientHandle = handleMap.get(row.recipientProfileId) ?? "unknown";
    const peerProfileId =
      row.senderProfileId === viewerProfileId ? row.recipientProfileId : row.senderProfileId;
    const peerHandle = handleMap.get(peerProfileId) ?? "unknown";

    return {
      id: row.id,
      status: row.status,
      createdAt: toIsoDateString(row.createdAt),
      senderProfileId: row.senderProfileId,
      senderHandle,
      recipientProfileId: row.recipientProfileId,
      recipientHandle,
      peerProfileId,
      peerHandle,
      peerInboxId: inboxMap.get(peerProfileId) ?? null,
      pageId: row.pageId,
      pageTitle: row.pageTitle,
      pageCanonicalUrl: row.pageCanonicalUrl,
      pageHost: row.pageHost
    };
  });
}

export async function createProfileMessageRequest(params: {
  senderProfileId: string;
  recipientProfileId: string;
  pageId?: string | null;
}): Promise<{ id: string; existing: boolean }> {
  if (params.senderProfileId === params.recipientProfileId) {
    throw new Error("cannot message yourself");
  }

  const profileRows = await db
    .select({
      id: profiles.id,
      handle: profiles.handle,
      nullifierHash: profiles.nullifierHash,
      blockedAt: profiles.blockedAt
    })
    .from(profiles)
    .where(inArray(profiles.id, [params.senderProfileId, params.recipientProfileId]));

  const sender = profileRows.find((row) => row.id === params.senderProfileId) ?? null;
  const recipient = profileRows.find((row) => row.id === params.recipientProfileId) ?? null;

  if (!sender || !recipient) {
    throw new Error("profile not found");
  }

  if (!sender.nullifierHash || !recipient.nullifierHash) {
    throw new Error("verified humans only");
  }

  if (sender.blockedAt) {
    throw new Error("account restricted");
  }

  if (recipient.blockedAt) {
    throw new Error("recipient unavailable");
  }

  const blocked = await db.query.blockedProfiles.findFirst({
    where: or(
      and(
        eq(blockedProfiles.profileId, params.senderProfileId),
        eq(blockedProfiles.blockedProfileId, params.recipientProfileId)
      ),
      and(
        eq(blockedProfiles.profileId, params.recipientProfileId),
        eq(blockedProfiles.blockedProfileId, params.senderProfileId)
      )
    )
  });

  if (blocked) {
    throw new Error("messaging unavailable between these profiles");
  }

  const [senderBinding, recipientBinding] = await Promise.all([
    getXmtpBindingForProfile(params.senderProfileId),
    getXmtpBindingForProfile(params.recipientProfileId)
  ]);

  if (!senderBinding) {
    throw new Error("link your XMTP inbox first");
  }

  if (!recipientBinding) {
    throw new Error("recipient has not linked XMTP yet");
  }

  const existingAccepted = await db.query.messageRequests.findFirst({
    where: and(
      or(
        and(
          eq(messageRequests.senderProfileId, params.senderProfileId),
          eq(messageRequests.recipientProfileId, params.recipientProfileId)
        ),
        and(
          eq(messageRequests.senderProfileId, params.recipientProfileId),
          eq(messageRequests.recipientProfileId, params.senderProfileId)
        )
      ),
      eq(messageRequests.status, "accepted"),
      eq(messageRequests.hidden, false)
    )
  });

  if (existingAccepted) {
    throw new Error("message channel already open");
  }

  const reversePending = await db.query.messageRequests.findFirst({
    where: and(
      eq(messageRequests.senderProfileId, params.recipientProfileId),
      eq(messageRequests.recipientProfileId, params.senderProfileId),
      eq(messageRequests.status, "pending"),
      eq(messageRequests.hidden, false)
    )
  });

  if (reversePending) {
    throw new Error("this person has already sent you a request");
  }

  const existingPending = await db.query.messageRequests.findFirst({
    where: and(
      eq(messageRequests.senderProfileId, params.senderProfileId),
      eq(messageRequests.recipientProfileId, params.recipientProfileId),
      eq(messageRequests.status, "pending"),
      eq(messageRequests.hidden, false)
    )
  });

  if (existingPending) {
    return {
      id: existingPending.id,
      existing: true
    };
  }

  const [inserted] = await db
    .insert(messageRequests)
    .values({
      senderProfileId: params.senderProfileId,
      recipientProfileId: params.recipientProfileId,
      pageId: params.pageId ?? null,
      reasonCode: params.pageId ? "page_context" : "direct_profile",
      status: "pending"
    })
    .returning({
      id: messageRequests.id
    });

  return {
    id: inserted.id,
    existing: false
  };
}

export async function respondToMessageRequest(params: {
  profileId: string;
  requestId: string;
  action: "accept" | "ignore";
}): Promise<void> {
  const row = await db.query.messageRequests.findFirst({
    where: eq(messageRequests.id, params.requestId)
  });

  if (!row) {
    throw new Error("message request not found");
  }

  if (row.recipientProfileId !== params.profileId) {
    throw new Error("not allowed");
  }

  if (row.status !== "pending") {
    return;
  }

  await db
    .update(messageRequests)
    .set({
      status: params.action === "accept" ? "accepted" : "ignored",
      hidden: params.action === "ignore"
    })
    .where(eq(messageRequests.id, params.requestId));
}

export async function getMessagingInboxForProfile(
  profileId: string
): Promise<MessagingInboxSnapshot> {
  const [binding, rows] = await Promise.all([
    getXmtpBindingForProfile(profileId),
    db
      .select({
        id: messageRequests.id,
        status: messageRequests.status,
        createdAt: messageRequests.createdAt,
        senderProfileId: messageRequests.senderProfileId,
        recipientProfileId: messageRequests.recipientProfileId,
        pageId: messageRequests.pageId,
        pageTitle: pages.title,
        pageCanonicalUrl: pages.canonicalUrl,
        pageHost: pages.host
      })
      .from(messageRequests)
      .leftJoin(pages, eq(pages.id, messageRequests.pageId))
      .where(
        and(
          or(
            eq(messageRequests.senderProfileId, profileId),
            eq(messageRequests.recipientProfileId, profileId)
          ),
          eq(messageRequests.hidden, false)
        )
      )
      .orderBy(desc(messageRequests.createdAt))
      .limit(100)
  ]);

  const previews = await enrichMessageRequests(rows, profileId);

  return {
    binding,
    incomingPending: previews.filter(
      (item) => item.status === "pending" && item.recipientProfileId === profileId
    ),
    outgoingPending: previews.filter(
      (item) => item.status === "pending" && item.senderProfileId === profileId
    ),
    accepted: previews.filter((item) => item.status === "accepted")
  };
}

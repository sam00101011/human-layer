import {
  buildPageContextSummary,
  EMPTY_VERDICT_COUNTS,
  getInterestTagDescription,
  getInterestTagLabel,
  getRelatedInterestTags,
  INTEREST_TAGS,
  MAX_PROFILE_INTERESTS,
  SUPPORTED_DOMAIN_RULES,
  summarizeContributorReputation,
  type CommentReportReasonCode,
  type ContributorReputation,
  type ContributorReputationMetrics,
  type InterestTag,
  type NormalizedPageCandidate,
  type ProfileActivityItem,
  type ProfileSnapshot,
  pickTopHumanTake,
  type PageSummary,
  type SupportedDomainRule,
  type ThreadSnapshot,
  type Verdict
} from "@human-layer/core";
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

import { db } from "./client";
import {
  blockedProfiles,
  commentHelpfulVotes,
  commentReports,
  comments,
  follows,
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

export type DiscoverySearchResults = {
  pages: DiscoveryPage[];
  takes: DiscoveryTake[];
  profiles: DiscoveryProfile[];
};

export type TopicSurface = {
  topic: InterestTag;
  label: string;
  description: string;
  clusterTags: InterestTag[];
  relatedTopics: InterestTag[];
  trendingPages: DiscoveryPage[];
  topTakes: DiscoveryTake[];
  topContributors: DiscoveryProfile[];
};

export type FollowRecommendedPage = DiscoveryPage & {
  bookmarkedByCount: number;
  bookmarkedByHandles: string[];
  reason: string;
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

function mapStoredProfile(row: {
  id: string;
  handle: string;
  interestTags: unknown;
  nullifierHash: string | null;
  createdAt: Date;
}): StoredProfile {
  return {
    id: row.id,
    handle: row.handle,
    interestTags: coerceInterestTags(row.interestTags),
    nullifierHash: row.nullifierHash,
    createdAt: row.createdAt.toISOString()
  };
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
  activityScore: number;
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
    reputation: reputationMap.get(row.profileId) ?? defaultContributorReputation()
  }));
}

async function getRankedPageActivityRows(): Promise<RankedPageActivityRow[]> {
  const [verdictRows, commentRows, bookmarkRows] = await Promise.all([
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
      .groupBy(saves.pageId)
  ]);

  const verdictMap = new Map(verdictRows.map((row) => [row.pageId, row.count]));
  const commentMap = new Map(commentRows.map((row) => [row.pageId, row.count]));
  const bookmarkMap = new Map(bookmarkRows.map((row) => [row.pageId, row.count]));
  const pageIds = [...new Set([...verdictMap.keys(), ...commentMap.keys(), ...bookmarkMap.keys()])];

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
        activityScore: verdictCount * 3 + commentCount * 4 + bookmarkCount * 2
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
        tags: context.tags
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
          activityScore: 0
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
      reputation: reputationMap.get(row.profileId) ?? defaultContributorReputation()
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
    createdAt: comment.createdAt.toISOString(),
    reputation: reputationMap.get(comment.profileId) ?? defaultContributorReputation()
  }));

  return {
    verdictCounts,
    recentComments: projectedComments,
    topHumanTake: pickTopHumanTake(projectedComments)
  };
}

export async function getTrendingPages(limit = 6): Promise<DiscoveryPage[]> {
  const rankedPages = await getRankedPageActivityRows();
  return hydrateDiscoveryPages(rankedPages.slice(0, limit));
}

export async function getRecommendedTakes(limit = 6): Promise<DiscoveryTake[]> {
  return (await getRankedTakeCandidates(Math.max(limit * 4, 24))).slice(0, limit);
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
      const score = (verifiedHuman ? 6 : 0) + commentCount * 3 + followerCount * 2 + sharedInterestCount * 4;
      const reasonParts = [];

      if (sharedInterestCount > 0) {
        reasonParts.push(`Shared interests in ${formatInterestList(interestTags)}`);
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
      profiles: []
    };
  }

  const pattern = `%${trimmed}%`;

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
      .limit(limit),
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
      .limit(limit),
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
      .limit(limit),
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
  const searchProfileReputationMap = await getContributorReputationMap(
    profileRows.map((row) => row.id)
  );

  const pagesWithContext = await Promise.all(
    pageRows.map(async (page) => {
      const thread = await getPageThreadSnapshot(page.id);
      const context = buildPageContextSummary({
        page: {
          pageKind: page.pageKind as PageSummary["pageKind"],
          host: page.host,
          title: page.title
        },
        thread
      });

      return {
        id: page.id,
        pageKind: page.pageKind as PageSummary["pageKind"],
        canonicalUrl: page.canonicalUrl,
        canonicalKey: page.canonicalKey,
        host: page.host,
        title: page.title,
        verdictCount: Object.values(thread.verdictCounts).reduce((sum, count) => sum + count, 0),
        commentCount: thread.recentComments.length,
        bookmarkCount: 0,
        activityScore: Object.values(thread.verdictCounts).reduce((sum, count) => sum + count, 0) + thread.recentComments.length,
        summary: context.summary,
        tags: context.tags
      } satisfies DiscoveryPage;
    })
  );

  return {
    pages: pagesWithContext,
    takes: takeRows.map((row) => ({
      commentId: row.commentId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      helpfulCount: row.helpfulCount,
      profileId: row.profileId,
      profileHandle: row.profileHandle,
      pageId: row.pageId,
      pageKind: row.pageKind as PageSummary["pageKind"],
      pageTitle: row.pageTitle,
      canonicalUrl: row.canonicalUrl
    })),
    profiles: profileRows.map((row) => {
      const interestTags = coerceInterestTags(row.interestTags);
      const commentCount = commentCountMap.get(row.id) ?? 0;
      const followerCount = followerCountMap.get(row.id) ?? 0;
      const reputation = searchProfileReputationMap.get(row.id) ?? defaultContributorReputation();
      return {
        id: row.id,
        handle: row.handle,
        verifiedHuman: Boolean(row.nullifierHash),
        reputation,
        interestTags,
        commentCount,
        followerCount,
        sharedInterestCount: 0,
        reason: interestTags.length
          ? `${reputation.description} • Active around ${formatInterestList(interestTags)}`
          : reputation.description
      } satisfies DiscoveryProfile;
    })
  };
}

export async function getTopicSurface(
  topic: InterestTag,
  limit = 6
): Promise<TopicSurface> {
  const clusterTags = buildInterestCluster(topic, 5);
  const clusterSet = new Set(clusterTags);
  const [rankedPages, takeCandidates, profileData] = await Promise.all([
    getRankedPageActivityRows(),
    getRankedTakeCandidates(Math.max(limit * 10, 60)),
    getProfileDiscoveryRows()
  ]);

  const trendingPages = (await hydrateDiscoveryPages(rankedPages.slice(0, Math.max(limit * 12, 72))))
    .filter((page) => hasInterestOverlap(page.tags, clusterTags))
    .slice(0, limit);

  const takePageMap = await getDiscoveryPagesByIds(takeCandidates.map((take) => take.pageId));
  const topicTakeCandidates = takeCandidates.filter((take) => {
    const page = takePageMap.get(take.pageId);
    return page ? hasInterestOverlap(page.tags, clusterTags) : false;
  });
  const topTakes = topicTakeCandidates.slice(0, limit);

  const topicTakeStats = new Map<string, { takeCount: number; helpfulCount: number }>();
  for (const take of topicTakeCandidates) {
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
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime() ||
        right.helpfulCount - left.helpfulCount
    )
    .slice(0, limit);
}

export async function getTopicFeedFromFollowedProfiles(
  profileId: string,
  topic: InterestTag,
  limit = 6
): Promise<FollowGraphItem[]> {
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
    .map((row) => ({
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
      reason: `New take from someone you follow in ${getInterestTagLabel(topic)}.`
    }))
    .slice(0, limit);
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
  const [rows, mutedRows, blockedRows] = await Promise.all([
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
      .where(eq(blockedProfiles.profileId, profileId))
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

      return {
        ...page,
        bookmarkedByCount: signal.count,
        bookmarkedByHandles: signal.handles.slice(0, 5),
        reason:
          signal.count === 1
            ? `Bookmarked by ${handlePreview}.`
            : `Bookmarked by ${handlePreview}${signal.handles.length > 3 ? " and more" : ""}.`,
        score: signal.count * 8 + page.activityScore
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

  return rows
    .map((row) => ({
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
      reason: "New take from someone you follow."
    }))
    .sort(
      (left, right) =>
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

export async function createSeedComment(params: {
  pageId: string;
  profileId: string;
  body: string;
  helpfulProfileId?: string;
}): Promise<void> {
  const [comment] = await db
    .insert(comments)
    .values({
      pageId: params.pageId,
      profileId: params.profileId,
      body: params.body
    })
    .onConflictDoNothing()
    .returning();

  if (!comment) return;

  if (params.helpfulProfileId) {
    await db.insert(commentHelpfulVotes).values({
      commentId: comment.id,
      profileId: params.helpfulProfileId
    });
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
}): Promise<{
  id: string;
}> {
  const [inserted] = await db
    .insert(comments)
    .values({
      pageId: params.pageId,
      profileId: params.profileId,
      body: params.body
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

  return rows.map((row) => ({
    ...(function buildAuthorStats() {
      const reportStats = authorReportMap.get(row.authorProfileId) ?? {
        reportCount: 0,
        openReportCount: 0
      };
      const authorHiddenCommentCount = hiddenCountMap.get(row.authorProfileId) ?? 0;
      const authorBlockedAt = blockedAtMap.get(row.authorProfileId) ?? null;
      return {
        authorReportCount: reportStats.reportCount,
        authorOpenReportCount: reportStats.openReportCount,
        authorHiddenCommentCount,
        authorBlockedAt,
        repeatOffender: isRepeatOffender({
          authorReportCount: reportStats.reportCount,
          authorOpenReportCount: reportStats.openReportCount,
          authorHiddenCommentCount
        })
      };
    })(),
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
  }));
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

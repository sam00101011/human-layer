import {
  buildPageContextSummary,
  EMPTY_VERDICT_COUNTS,
  getInterestTagLabel,
  INTEREST_TAGS,
  MAX_PROFILE_INTERESTS,
  SUPPORTED_DOMAIN_RULES,
  summarizeContributorReputation,
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
  commentHelpfulVotes,
  commentReports,
  comments,
  follows,
  pageAliases,
  pages,
  profiles,
  saves,
  sessions,
  supportedDomains,
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

export async function getPageThreadSnapshot(pageId: string): Promise<ThreadSnapshot> {
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

  const recentComments = await db
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

  const rankedPages = pageRows
    .map((row) => {
      const verdictCount = verdictMap.get(row.id) ?? 0;
      const commentCount = commentMap.get(row.id) ?? 0;
      const bookmarkCount = bookmarkMap.get(row.id) ?? 0;

      return {
        ...row,
        verdictCount,
        commentCount,
        bookmarkCount,
        activityScore: verdictCount * 3 + commentCount * 4 + bookmarkCount * 2
      };
    })
    .sort((left, right) => right.activityScore - left.activityScore || right.commentCount - left.commentCount)
    .slice(0, limit);

  const withContext = await Promise.all(
    rankedPages.map(async (page) => {
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
        verdictCount: page.verdictCount,
        commentCount: page.commentCount,
        bookmarkCount: page.bookmarkCount,
        activityScore: page.activityScore,
        summary: context.summary,
        tags: context.tags
      } satisfies DiscoveryPage;
    })
  );

  return withContext;
}

export async function getRecommendedTakes(limit = 6): Promise<DiscoveryTake[]> {
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
    .limit(limit);

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
  const searchProfileReputationMap = await getContributorReputationMap(profileRows.map((row) => row.id));
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
} | null> {
  const row = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId)
  });

  if (!row) return null;

  return {
    id: row.id,
    handle: row.handle
  };
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

export async function createCommentReport(params: {
  commentId: string;
  reporterProfileId: string;
  reasonCode: string;
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

  const reporterHandleMap = new Map(reporterRows.map((row) => [row.id, row.handle]));

  return rows.map((row) => ({
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
  action: "hide" | "dismiss" | "restore";
  reasonCode?: string | null;
}): Promise<void> {
  await db.transaction(async (tx) => {
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

    await tx
      .update(commentReports)
      .set({
        status: params.action === "hide" ? "hidden" : params.action === "restore" ? "restored" : "dismissed",
        reviewedAt: new Date(),
        reviewedByProfileId: params.adminProfileId
      })
      .where(eq(commentReports.commentId, params.commentId));
  });
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

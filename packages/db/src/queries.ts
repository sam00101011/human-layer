import {
  EMPTY_VERDICT_COUNTS,
  INTEREST_TAGS,
  MAX_PROFILE_INTERESTS,
  SUPPORTED_DOMAIN_RULES,
  type InterestTag,
  type NormalizedPageCandidate,
  type ProfileSnapshot,
  pickTopHumanTake,
  type PageSummary,
  type SupportedDomainRule,
  type ThreadSnapshot,
  type Verdict
} from "@human-layer/core";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

import { db } from "./client";
import {
  commentHelpfulVotes,
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

  const projectedComments = recentComments.map((comment) => ({
    commentId: comment.commentId,
    profileId: comment.profileId,
    profileHandle: comment.profileHandle,
    body: comment.body,
    helpfulCount: helpfulCountMap.get(comment.commentId) ?? 0,
    createdAt: comment.createdAt.toISOString()
  }));

  return {
    verdictCounts,
    recentComments: projectedComments,
    topHumanTake: pickTopHumanTake(projectedComments)
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

async function getSavedPages(profileId: string): Promise<PageSummary[]> {
  const rows = await db
    .select({
      id: pages.id,
      pageKind: pages.pageKind,
      canonicalUrl: pages.canonicalUrl,
      canonicalKey: pages.canonicalKey,
      host: pages.host,
      title: pages.title
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

async function buildProfileSnapshot(profile: StoredProfile): Promise<ProfileSnapshot> {
  const [counts, recentComments, savedPages] = await Promise.all([
    getProfileCounts(profile.id),
    getRecentProfileComments(profile.id),
    getSavedPages(profile.id)
  ]);

  return {
    id: profile.id,
    handle: profile.handle,
    verifiedHuman: Boolean(profile.nullifierHash),
    interestTags: profile.interestTags,
    counts,
    recentComments,
    savedPages,
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

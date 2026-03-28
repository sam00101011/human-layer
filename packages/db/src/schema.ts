import { PAGE_KINDS, VERDICTS, type InterestTag } from "@human-layer/core";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const pageKindEnum = pgEnum("page_kind", [...PAGE_KINDS] as [string, ...string[]]);
export const verdictEnum = pgEnum("verdict", [...VERDICTS] as [string, ...string[]]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    handle: text("handle").notNull(),
    nullifierHash: text("nullifier_hash"),
    interestTags: jsonb("interest_tags")
      .$type<InterestTag[]>()
      .default([])
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    handleUnique: uniqueIndex("profiles_handle_unique").on(table.handle),
    nullifierHashUnique: uniqueIndex("profiles_nullifier_hash_unique").on(table.nullifierHash)
  })
);

export const worldIdVerifications = pgTable(
  "world_id_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    nullifierHash: text("nullifier_hash").notNull(),
    verificationLevel: text("verification_level")
      .$type<"orb" | "device">()
      .default("orb")
      .notNull(),
    signal: text("signal"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    profileUnique: uniqueIndex("world_id_verifications_profile_id_unique").on(table.profileId),
    nullifierHashUnique: uniqueIndex("world_id_verifications_nullifier_hash_unique").on(
      table.nullifierHash
    )
  })
);


export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    sessionTokenUnique: uniqueIndex("sessions_session_token_hash_unique").on(table.sessionTokenHash)
  })
);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageKind: pageKindEnum("page_kind").notNull(),
    canonicalKey: text("canonical_key").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    host: text("host").notNull(),
    title: text("title").notNull(),
    seeded: boolean("seeded").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    canonicalKeyUnique: uniqueIndex("pages_canonical_key_unique").on(table.canonicalKey),
    canonicalUrlUnique: uniqueIndex("pages_canonical_url_unique").on(table.canonicalUrl)
  })
);

export const pageAliases = pgTable(
  "page_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    aliasUrl: text("alias_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    aliasUrlUnique: uniqueIndex("page_aliases_alias_url_unique").on(table.aliasUrl)
  })
);

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageId: uuid("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  hidden: boolean("hidden").default(false).notNull(),
  reasonCode: text("reason_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const commentHelpfulVotes = pgTable(
  "comment_helpful_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    commentProfileUnique: uniqueIndex("comment_helpful_votes_comment_profile_unique").on(
      table.commentId,
      table.profileId
    )
  })
);

export const commentReports = pgTable(
  "comment_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    reporterProfileId: uuid("reporter_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    reasonCode: text("reason_code").notNull(),
    details: text("details"),
    status: text("status").notNull().default("open"),
    reviewedByProfileId: uuid("reviewed_by_profile_id").references(() => profiles.id, {
      onDelete: "set null"
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    commentReporterUnique: uniqueIndex("comment_reports_comment_reporter_unique").on(
      table.commentId,
      table.reporterProfileId
    )
  })
);

export const verdicts = pgTable(
  "verdicts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    verdict: verdictEnum("verdict").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pageProfileUnique: uniqueIndex("verdicts_page_profile_unique").on(table.pageId, table.profileId)
  })
);

export const saves = pgTable(
  "saves",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pageProfileUnique: uniqueIndex("saves_page_profile_unique").on(table.pageId, table.profileId)
  })
);

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerProfileId: uuid("follower_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    followeeProfileId: uuid("followee_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    followerFolloweeUnique: uniqueIndex("follows_follower_followee_unique").on(
      table.followerProfileId,
      table.followeeProfileId
    )
  })
);

export const supportedDomains = pgTable("supported_domains", {
  id: text("id").primaryKey(),
  enabled: boolean("enabled").notNull(),
  hosts: jsonb("hosts").$type<string[]>().notNull(),
  pageKind: pageKindEnum("page_kind").notNull(),
  matchStrategy: text("match_strategy").notNull(),
  normalizer: text("normalizer").notNull(),
  rolloutStage: text("rollout_stage").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const xmtpBindings = pgTable(
  "xmtp_bindings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    inboxId: text("inbox_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    profileUnique: uniqueIndex("xmtp_bindings_profile_id_unique").on(table.profileId),
    inboxUnique: uniqueIndex("xmtp_bindings_inbox_id_unique").on(table.inboxId)
  })
);

export const x402Events = pgTable("x402_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  amountUsdCents: integer("amount_usd_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const messageRequests = pgTable("message_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderProfileId: uuid("sender_profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  recipientProfileId: uuid("recipient_profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
  x402EventId: uuid("x402_event_id").references(() => x402Events.id, { onDelete: "set null" }),
  blockedProfile: boolean("blocked_profile").default(false).notNull(),
  hidden: boolean("hidden").default(false).notNull(),
  reasonCode: text("reason_code"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

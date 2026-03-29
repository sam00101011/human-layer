import { PAGE_KINDS, VERDICTS, type InterestTag } from "@human-layer/core";
import {
  boolean,
  foreignKey,
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
    notifyBookmarkedPageComments: boolean("notify_bookmarked_page_comments")
      .default(true)
      .notNull(),
    notifyFollowedProfileTakes: boolean("notify_followed_profile_takes")
      .default(true)
      .notNull(),
    notifyFollowedTopicTakes: boolean("notify_followed_topic_takes")
      .default(true)
      .notNull(),
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    blockedReasonCode: text("blocked_reason_code"),
    blockedNote: text("blocked_note"),
    blockedByProfileId: uuid("blocked_by_profile_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    handleUnique: uniqueIndex("profiles_handle_unique").on(table.handle),
    nullifierHashUnique: uniqueIndex("profiles_nullifier_hash_unique").on(table.nullifierHash),
    blockedByProfileForeignKey: foreignKey({
      columns: [table.blockedByProfileId],
      foreignColumns: [table.id],
      name: "profiles_blocked_by_profile_id_profiles_id_fk"
    }).onDelete("set null")
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
  mediaTimestampSeconds: integer("media_timestamp_seconds"),
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

export const topicFollows = pgTable(
  "topic_follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    topicTag: text("topic_tag").$type<InterestTag>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    profileTopicUnique: uniqueIndex("topic_follows_profile_topic_unique").on(
      table.profileId,
      table.topicTag
    )
  })
);

export const notificationReads = pgTable(
  "notification_reads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    profileCommentUnique: uniqueIndex("notification_reads_profile_comment_unique").on(
      table.profileId,
      table.commentId
    )
  })
);

export const mutedPages = pgTable(
  "muted_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    profilePageUnique: uniqueIndex("muted_pages_profile_page_unique").on(table.profileId, table.pageId)
  })
);

export const mutedProfiles = pgTable(
  "muted_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    mutedProfileId: uuid("muted_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    profileMutedProfileUnique: uniqueIndex("muted_profiles_profile_muted_profile_unique").on(
      table.profileId,
      table.mutedProfileId
    )
  })
);

export const blockedProfiles = pgTable(
  "blocked_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    blockedProfileId: uuid("blocked_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    profileBlockedProfileUnique: uniqueIndex("blocked_profiles_profile_blocked_profile_unique").on(
      table.profileId,
      table.blockedProfileId
    )
  })
);

export const moderationAuditEvents = pgTable("moderation_audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorProfileId: uuid("actor_profile_id").references(() => profiles.id, {
    onDelete: "set null"
  }),
  targetProfileId: uuid("target_profile_id").references(() => profiles.id, {
    onDelete: "set null"
  }),
  commentId: uuid("comment_id").references(() => comments.id, {
    onDelete: "set null"
  }),
  actionType: text("action_type").notNull(),
  reasonCode: text("reason_code"),
  note: text("note"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

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

export const managedWallets = pgTable(
  "managed_wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    walletAddress: text("wallet_address").notNull(),
    walletLabel: text("wallet_label").notNull().default("Human Layer Wallet"),
    walletProvider: text("wallet_provider").notNull().default("coinbase_smart_wallet"),
    walletType: text("wallet_type").notNull().default("passkey_smart_wallet"),
    network: text("network").notNull().default("base"),
    status: text("status").notNull().default("active"),
    passkeyReady: boolean("passkey_ready").default(true).notNull(),
    delegatedSession: jsonb("delegated_session")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    spendingEnabled: boolean("spending_enabled").default(true).notNull(),
    dailySpendLimitUsdCents: integer("daily_spend_limit_usd_cents").default(1000).notNull(),
    defaultProvider: text("default_provider").notNull().default("stableenrich_answer"),
    enabledProviders: jsonb("enabled_providers")
      .$type<string[]>()
      .default([
        "stableenrich_answer",
        "stableenrich_search",
        "stableenrich_contents",
        "anybrowse_scrape",
        "stableclaude_giga",
        "twitsh_search"
      ])
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    profileUnique: uniqueIndex("managed_wallets_profile_id_unique").on(table.profileId),
    walletAddressUnique: uniqueIndex("managed_wallets_wallet_address_unique").on(
      table.walletAddress
    )
  })
);

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
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
  walletId: uuid("wallet_id").references(() => managedWallets.id, { onDelete: "set null" }),
  pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
  kind: text("kind").notNull(),
  provider: text("provider"),
  description: text("description"),
  status: text("status").notNull(),
  amountUsdCents: integer("amount_usd_cents").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
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

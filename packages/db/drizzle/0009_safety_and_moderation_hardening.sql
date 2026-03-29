ALTER TABLE "profiles"
ADD COLUMN "blocked_at" timestamp with time zone,
ADD COLUMN "blocked_reason_code" text,
ADD COLUMN "blocked_note" text,
ADD COLUMN "blocked_by_profile_id" uuid;

ALTER TABLE "profiles"
ADD CONSTRAINT "profiles_blocked_by_profile_id_profiles_id_fk"
FOREIGN KEY ("blocked_by_profile_id") REFERENCES "public"."profiles"("id")
ON DELETE set null ON UPDATE no action;

CREATE TABLE "blocked_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" uuid NOT NULL,
  "blocked_profile_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "blocked_profiles"
ADD CONSTRAINT "blocked_profiles_profile_id_profiles_id_fk"
FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id")
ON DELETE cascade ON UPDATE no action;

ALTER TABLE "blocked_profiles"
ADD CONSTRAINT "blocked_profiles_blocked_profile_id_profiles_id_fk"
FOREIGN KEY ("blocked_profile_id") REFERENCES "public"."profiles"("id")
ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "blocked_profiles_profile_blocked_profile_unique"
ON "blocked_profiles" USING btree ("profile_id","blocked_profile_id");

CREATE TABLE "moderation_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_profile_id" uuid,
  "target_profile_id" uuid,
  "comment_id" uuid,
  "action_type" text NOT NULL,
  "reason_code" text,
  "note" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "moderation_audit_events"
ADD CONSTRAINT "moderation_audit_events_actor_profile_id_profiles_id_fk"
FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id")
ON DELETE set null ON UPDATE no action;

ALTER TABLE "moderation_audit_events"
ADD CONSTRAINT "moderation_audit_events_target_profile_id_profiles_id_fk"
FOREIGN KEY ("target_profile_id") REFERENCES "public"."profiles"("id")
ON DELETE set null ON UPDATE no action;

ALTER TABLE "moderation_audit_events"
ADD CONSTRAINT "moderation_audit_events_comment_id_comments_id_fk"
FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id")
ON DELETE set null ON UPDATE no action;

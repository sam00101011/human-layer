CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE page_kind AS ENUM (
    'github_repo',
    'github_issue',
    'github_pr',
    'hn_item',
    'hn_linked_url',
    'product_hunt_product',
    'docs_page',
    'blog_post'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE verdict AS ENUM ('useful', 'misleading', 'outdated', 'scam');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL,
  nullifier_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_unique ON profiles(handle);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_nullifier_hash_unique ON profiles(nullifier_hash);

CREATE TABLE IF NOT EXISTS world_id_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nullifier_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS world_id_verifications_profile_id_unique ON world_id_verifications(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS world_id_verifications_nullifier_hash_unique ON world_id_verifications(nullifier_hash);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_session_token_hash_unique ON sessions(session_token_hash);

CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_kind page_kind NOT NULL,
  canonical_key text NOT NULL,
  canonical_url text NOT NULL,
  host text NOT NULL,
  title text NOT NULL,
  seeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pages_canonical_key_unique ON pages(canonical_key);
CREATE UNIQUE INDEX IF NOT EXISTS pages_canonical_url_unique ON pages(canonical_url);

CREATE TABLE IF NOT EXISTS page_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  alias_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS page_aliases_alias_url_unique ON page_aliases(alias_url);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  reason_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comment_helpful_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS comment_helpful_votes_comment_profile_unique
  ON comment_helpful_votes(comment_id, profile_id);

CREATE TABLE IF NOT EXISTS verdicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verdict verdict NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS verdicts_page_profile_unique ON verdicts(page_id, profile_id);

CREATE TABLE IF NOT EXISTS saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saves_page_profile_unique ON saves(page_id, profile_id);

CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followee_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS follows_follower_followee_unique
  ON follows(follower_profile_id, followee_profile_id);

CREATE TABLE IF NOT EXISTS supported_domains (
  id text PRIMARY KEY,
  enabled boolean NOT NULL,
  hosts jsonb NOT NULL,
  page_kind page_kind NOT NULL,
  match_strategy text NOT NULL,
  normalizer text NOT NULL,
  rollout_stage text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS xmtp_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inbox_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS xmtp_bindings_profile_id_unique ON xmtp_bindings(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS xmtp_bindings_inbox_id_unique ON xmtp_bindings(inbox_id);

CREATE TABLE IF NOT EXISTS x402_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  status text NOT NULL,
  amount_usd_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  x402_event_id uuid REFERENCES x402_events(id) ON DELETE SET NULL,
  blocked_profile boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  reason_code text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

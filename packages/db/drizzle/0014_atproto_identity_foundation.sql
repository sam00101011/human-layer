ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS atproto_did text,
  ADD COLUMN IF NOT EXISTS atproto_handle text,
  ADD COLUMN IF NOT EXISTS atproto_status text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_atproto_did_unique
  ON profiles (atproto_did);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_atproto_handle_unique
  ON profiles (atproto_handle);

CREATE TABLE IF NOT EXISTS atproto_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  did text NOT NULL,
  handle text NOT NULL,
  pds_url text NOT NULL,
  account_type text NOT NULL DEFAULT 'managed',
  status text NOT NULL DEFAULT 'reserved',
  public_posting_enabled boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS atproto_accounts_profile_id_unique
  ON atproto_accounts (profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS atproto_accounts_did_unique
  ON atproto_accounts (did);

CREATE UNIQUE INDEX IF NOT EXISTS atproto_accounts_handle_unique
  ON atproto_accounts (handle);

CREATE TABLE IF NOT EXISTS atproto_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid REFERENCES atproto_accounts(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

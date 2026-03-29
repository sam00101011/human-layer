CREATE TABLE IF NOT EXISTS managed_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  wallet_label text NOT NULL DEFAULT 'Human Layer Wallet',
  network text NOT NULL DEFAULT 'base',
  status text NOT NULL DEFAULT 'active',
  passkey_ready boolean NOT NULL DEFAULT true,
  spending_enabled boolean NOT NULL DEFAULT true,
  available_credit_usd_cents integer NOT NULL DEFAULT 2500,
  daily_spend_limit_usd_cents integer NOT NULL DEFAULT 1000,
  default_provider text NOT NULL DEFAULT 'exa',
  enabled_providers jsonb NOT NULL DEFAULT '["exa","perplexity","opus_46"]'::jsonb,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS managed_wallets_profile_id_unique
  ON managed_wallets(profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS managed_wallets_wallet_address_unique
  ON managed_wallets(wallet_address);

ALTER TABLE x402_events
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES managed_wallets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

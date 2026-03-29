ALTER TABLE managed_wallets
  ADD COLUMN IF NOT EXISTS wallet_provider text NOT NULL DEFAULT 'coinbase_smart_wallet';

ALTER TABLE managed_wallets
  ADD COLUMN IF NOT EXISTS wallet_type text NOT NULL DEFAULT 'passkey_smart_wallet';

ALTER TABLE managed_wallets
  ADD COLUMN IF NOT EXISTS delegated_session jsonb NOT NULL DEFAULT '{}'::jsonb;

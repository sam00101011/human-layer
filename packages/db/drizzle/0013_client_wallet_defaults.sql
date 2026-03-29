ALTER TABLE managed_wallets
  DROP COLUMN IF EXISTS available_credit_usd_cents;

ALTER TABLE managed_wallets
  ALTER COLUMN default_provider SET DEFAULT 'stableenrich_answer';

ALTER TABLE managed_wallets
  ALTER COLUMN enabled_providers SET DEFAULT '["stableenrich_answer","stableenrich_search","stableenrich_contents","anybrowse_scrape","stableclaude_giga","twitsh_search"]'::jsonb;

UPDATE managed_wallets
SET
  default_provider = 'stableenrich_answer',
  enabled_providers = '["stableenrich_answer","stableenrich_search","stableenrich_contents","anybrowse_scrape","stableclaude_giga","twitsh_search"]'::jsonb,
  updated_at = now()
WHERE default_provider IN ('exa', 'perplexity', 'opus_46');

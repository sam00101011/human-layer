ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS interest_tags jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE world_id_verifications
ADD COLUMN IF NOT EXISTS verification_level text NOT NULL DEFAULT 'orb';

ALTER TABLE world_id_verifications
ADD COLUMN IF NOT EXISTS signal text;

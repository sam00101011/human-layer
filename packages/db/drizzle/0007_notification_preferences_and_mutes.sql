ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notify_bookmarked_page_comments boolean NOT NULL DEFAULT true;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notify_followed_profile_takes boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS muted_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS muted_pages_profile_page_unique
  ON muted_pages(profile_id, page_id);

CREATE TABLE IF NOT EXISTS muted_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  muted_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS muted_profiles_profile_muted_profile_unique
  ON muted_profiles(profile_id, muted_profile_id);

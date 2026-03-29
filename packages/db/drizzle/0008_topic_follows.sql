ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notify_followed_topic_takes boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS topic_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic_tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS topic_follows_profile_topic_unique
  ON topic_follows(profile_id, topic_tag);

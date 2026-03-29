ALTER TYPE page_kind ADD VALUE IF NOT EXISTS 'spotify_track';
ALTER TYPE page_kind ADD VALUE IF NOT EXISTS 'spotify_album';
ALTER TYPE page_kind ADD VALUE IF NOT EXISTS 'spotify_playlist';
ALTER TYPE page_kind ADD VALUE IF NOT EXISTS 'spotify_episode';
ALTER TYPE page_kind ADD VALUE IF NOT EXISTS 'spotify_show';

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS media_timestamp_seconds integer;

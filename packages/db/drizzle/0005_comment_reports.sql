CREATE TABLE IF NOT EXISTS comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason_code text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  reviewed_by_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS comment_reports_comment_reporter_unique
  ON comment_reports(comment_id, reporter_profile_id);

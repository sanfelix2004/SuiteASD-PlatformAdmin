CREATE TABLE IF NOT EXISTS access_profile (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES platform_admin(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#2f4bff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_profile_user ON access_profile(user_id);

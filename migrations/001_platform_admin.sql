CREATE TABLE IF NOT EXISTS platform_admin (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS society_account (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  external_id TEXT UNIQUE,
  source TEXT NOT NULL DEFAULT 'LOCAL',
  synced_at TIMESTAMPTZ,
  sport TEXT NOT NULL DEFAULT 'VOLLEY',
  email TEXT,
  phone TEXT,
  city TEXT,
  fiscal_code TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  billing_plan TEXT NOT NULL DEFAULT 'PILOTA',
  billing_exempt BOOLEAN NOT NULL DEFAULT TRUE,
  billing_exempt_reason TEXT,
  billing_exempt_until TIMESTAMPTZ,
  annual_fee_cents INTEGER NOT NULL DEFAULT 0,
  members_count INTEGER NOT NULL DEFAULT 0,
  teams_count INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  onboarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS society_field_access (
  id TEXT PRIMARY KEY,
  society_id TEXT NOT NULL REFERENCES society_account(id) ON DELETE CASCADE,
  field_group TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (society_id, field_group)
);

CREATE TABLE IF NOT EXISTS metric_snapshot (
  id TEXT PRIMARY KEY,
  society_id TEXT NOT NULL REFERENCES society_account(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_users_7d INTEGER NOT NULL DEFAULT 0,
  logins_7d INTEGER NOT NULL DEFAULT 0,
  documents_count INTEGER NOT NULL DEFAULT 0,
  payments_cents INTEGER NOT NULL DEFAULT 0,
  events_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS society_note (
  id TEXT PRIMARY KEY,
  society_id TEXT NOT NULL REFERENCES society_account(id) ON DELETE CASCADE,
  author_id TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT REFERENCES platform_admin(id) ON DELETE SET NULL,
  society_id TEXT REFERENCES society_account(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visibility_policy (
  id TEXT PRIMARY KEY,
  field_group TEXT NOT NULL UNIQUE,
  label_it TEXT NOT NULL,
  description_it TEXT NOT NULL,
  can_view_default BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_default BOOLEAN NOT NULL DEFAULT FALSE,
  sensitive BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_society_status ON society_account(status);
CREATE INDEX IF NOT EXISTS idx_society_external ON society_account(external_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_society ON metric_snapshot(society_id, captured_at DESC);

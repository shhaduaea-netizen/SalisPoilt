/*
# Custom ranks, rank permissions, and password-change requests

1. Changes
- Creates `custom_ranks` (company-scoped named ranks with a rank level).
- Creates `rank_permissions` (which actions a custom rank may perform).
- Creates `password_change_requests` (employee requests that bypass email-link reset).
- Adds `custom_rank_id` to `members` (nullable, links a member to a custom rank).

2. Security
- RLS enabled on all new tables.
- Only the service role (edge functions) accesses them; no client grants.
- `members.custom_rank_id` is nullable so existing rows are unaffected.

3. Notes
- Idempotent: safe to re-run.
*/

-- ── custom_ranks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_ranks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  name_ar     text,
  rank_level  int  NOT NULL DEFAULT 20,  -- higher = more authority
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

-- ── rank_permissions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rank_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_id     uuid NOT NULL REFERENCES custom_ranks(id) ON DELETE CASCADE,
  permission  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rank_id, permission)
);

-- ── password_change_requests ──────────────────────────────────
CREATE TABLE IF NOT EXISTS password_change_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  company_id  uuid REFERENCES companies(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid REFERENCES members(id),
  note        text
);

-- ── members.custom_rank_id ────────────────────────────────────
ALTER TABLE members ADD COLUMN IF NOT EXISTS custom_rank_id uuid REFERENCES custom_ranks(id) ON DELETE SET NULL;

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE custom_ranks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_change_requests  ENABLE ROW LEVEL SECURITY;

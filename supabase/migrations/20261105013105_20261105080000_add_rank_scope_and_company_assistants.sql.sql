/*
# Add rank scope (branch / company / specific members) and company assistant admins

1. Changes
- Adds `scope` column to `custom_ranks` ('company' | 'branch' | 'specific', default 'company').
- Creates `rank_members` junction table linking a rank to specific members (used when scope = 'specific').
- Adds `is_assistant` boolean column to `members` to mark company assistant admins (second COMPANY_ADMIN).

2. Security
- RLS enabled on `rank_members`.
- Only the service role (edge functions) accesses the new table; no client grants.
- Existing rows unaffected: scope defaults to 'company', is_assistant defaults to false.

3. Notes
- Idempotent: safe to re-run.
*/

ALTER TABLE custom_ranks ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'company';

CREATE TABLE IF NOT EXISTS rank_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_id   uuid NOT NULL REFERENCES custom_ranks(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rank_id, member_id)
);

ALTER TABLE rank_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE members ADD COLUMN IF NOT EXISTS is_assistant boolean NOT NULL DEFAULT false;

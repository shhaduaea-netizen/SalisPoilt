/*
# Create roster tables for accounts, companies, branches and teams

1. New Tables
- `companies`: company name (English, unique).
- `branches`: belongs to a company, unique name per company.
- `teams`: belongs to a branch, unique name per branch.
- `members`: one row per person who can sign in. Holds name (English and Arabic), username, email, role, company/branch/team placement, status, and whether the person must change their temporary password. Passwords are never stored here; sign-in is handled by Firebase.

2. Seed
- Adds the owner row (email owner123_123@gmail.com, role OWNER). The owner's sign-in account is created once in Firebase, and the owner gets linked to this row on first sign-in after verifying the email.

3. Security
- Row Level Security is enabled on all four tables.
- No grants to the anon or authenticated roles. The browser never reads or writes these tables directly.
- Only the server role gets privileges, because all reads and writes go through the roster edge function, which checks the caller's rank and scope.

4. Notes
- Table names and columns are new; nothing existing is changed or dropped.
- Statements are idempotent, so this migration can be re-applied safely.
*/

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, name)
);

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  firebase_uid text UNIQUE,
  full_name_en text NOT NULL,
  full_name_ar text,
  username text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('OWNER', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'TEAM_LEADER', 'EMPLOYEE')),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended')),
  must_change_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS members_company_idx ON members (company_id);
CREATE INDEX IF NOT EXISTS members_branch_idx ON members (branch_id);
CREATE INDEX IF NOT EXISTS members_team_idx ON members (team_id);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON companies, branches, teams, members FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON companies, branches, teams, members TO service_role;

INSERT INTO members (email, full_name_en, username, role, status, must_change_password)
VALUES ('owner123_123@gmail.com', 'Owner', 'owner', 'OWNER', 'Active', false)
ON CONFLICT (email) DO NOTHING;

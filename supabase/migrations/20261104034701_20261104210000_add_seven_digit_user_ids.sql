/*
# Add unique seven-digit User IDs to roster members

1. New columns
- `members.user_id`: required seven-digit numeric identifier for every person.

2. Data migration
- Existing members receive deterministic seven-digit IDs without deleting or replacing any records.
- The legacy `username` column remains temporarily for compatibility with existing account provisioning and is populated with the same User ID for newly imported members.

3. Integrity
- Every User ID must contain exactly seven digits.
- A unique index prevents duplicate User IDs at the database level.

4. Security
- The roster tables remain server-role-only; browser access continues through the roster edge function, which enforces manager scope and reports validation issues.

5. Important notes
- Duplicate User IDs in an uploaded sheet are rejected before any changes are committed.
- Existing data is preserved; no columns or records are dropped.
*/

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS user_id text;

UPDATE public.members AS m
SET user_id = generated.user_id
FROM (
  SELECT id, lpad((1000000 + row_number() OVER (ORDER BY id))::text, 7, '0') AS user_id
  FROM public.members
  WHERE user_id IS NULL
) AS generated
WHERE m.id = generated.id;

ALTER TABLE public.members
  ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'members_user_id_format_check'
      AND conrelid = 'public.members'::regclass
  ) THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_user_id_format_check CHECK (user_id ~ '^[0-9]{7}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS members_user_id_unique_idx ON public.members (user_id);

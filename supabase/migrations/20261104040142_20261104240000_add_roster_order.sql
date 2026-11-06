/*
# Preserve employee order from Excel imports

1. Modified table
- `members.roster_order`: the source row order from the latest employee roster import.

2. Data migration
- Existing members receive a stable initial order based on their current IDs.
- New and updated imported members store their Excel row order.

3. Display behavior
- Employee lists and organization views sort by `roster_order` first, then use the name only as a fallback for records without an imported order.

4. Security
- The roster tables remain server-role-only and continue to be accessed through the scoped roster edge function.

5. Important notes
- No members or existing columns are deleted.
- Re-importing a file updates the displayed order to match that file.
*/

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS roster_order integer;

UPDATE public.members AS m
SET roster_order = numbered.roster_order
FROM (
  SELECT id, row_number() OVER (ORDER BY id)::integer AS roster_order
  FROM public.members
  WHERE roster_order IS NULL
) AS numbered
WHERE m.id = numbered.id;

CREATE INDEX IF NOT EXISTS members_roster_order_idx ON public.members (roster_order);

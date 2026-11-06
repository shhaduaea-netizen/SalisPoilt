/*
# Add optional phone numbers to roster members

1. Modified table
- `members.phone`: optional phone number shown and editable only from the signed-in user's profile.

2. Data safety
- Existing members keep their current data; the new field is nullable.

3. Security
- The roster table remains server-role-only. The edge function will allow a signed-in user to change only their own profile name and phone number.
*/

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS phone text;

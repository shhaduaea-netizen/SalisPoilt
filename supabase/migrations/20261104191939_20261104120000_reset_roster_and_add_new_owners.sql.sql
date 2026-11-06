/*
# Reset roster and add new platform owners

1. Changes
- Deletes ALL existing member rows, then re-seeds with the two new platform owners.
- Companies, branches and teams are left in place (empty, no members assigned).

2. New seed members
- "محمد أحمد" (Mohammed Ahmed) — email mo202366162173@gmail.com, role OWNER.
  This is the primary platform owner. Sign-in account created in Firebase.
- "خالد حرب" (Khalid Harb) — email hrbmhmd664@gmail.com, role OWNER.
  Second platform owner with the same platform-wide access.

3. Security
- RLS remains enabled on all tables. No policy changes.
- Only the service_role can read/write these tables (via the roster edge function).
- The two new owners have must_change_password = false (their passwords are set directly in Firebase).

4. Important notes
- The old owner row (owner123_123@gmail.com) is removed from the database.
  Its Firebase account must be deleted manually from the Firebase console.
- The two new owners' Firebase accounts must be created in the Firebase console
  with the provided passwords. On first sign-in they will be linked to these rows.
- User IDs are assigned sequentially starting from 1000001.
*/
DELETE FROM members;

INSERT INTO members (email, full_name_en, full_name_ar, username, user_id, role, status, must_change_password)
VALUES
  ('mo202366162173@gmail.com', 'Mohammed Ahmed', 'محمد أحمد', '1000001', '1000001', 'OWNER', 'Active', false),
  ('hrbmhmd664@gmail.com', 'Khalid Harb', 'خالد حرب', '1000002', '1000002', 'OWNER', 'Active', false);

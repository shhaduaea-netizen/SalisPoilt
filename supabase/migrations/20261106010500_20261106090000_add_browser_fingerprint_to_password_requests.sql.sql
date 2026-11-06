/*
# Add browser fingerprint to password change requests

## Purpose
Password reset requests need to be tied to the specific browser/device that
submitted them, not just the email address. This allows the system to:
- Detect a pending request from the same browser and show the user a notice
- Allow a different browser on the same email to create an independent request
- Prevent the "forgot password" flow from being blocked across devices

## Changes
1. New column on `password_change_requests`:
   - `browser_fingerprint` (text, nullable) — a client-generated fingerprint
     string that identifies the browser/device. Nullable so existing rows
     and the email-only public endpoint still work.
   - `target_role` (text, nullable) — optionally records whether the request
     is targeting a platform owner or company admin. Null means the system
     auto-routes based on the requester's role.

2. Index on (member_id, browser_fingerprint, status) for fast pending lookup.

3. No RLS changes — the table is already RLS-enabled and accessed only through
   the service-role client in the edge function.
*/

ALTER TABLE password_change_requests
  ADD COLUMN IF NOT EXISTS browser_fingerprint text,
  ADD COLUMN IF NOT EXISTS target_role text;

CREATE INDEX IF NOT EXISTS idx_pcr_member_fingerprint_status
  ON password_change_requests (member_id, browser_fingerprint, status);
